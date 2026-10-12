import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import type { VatScheme } from "@/lib/pricing";
import { db } from "@/server/db";
import {
  brand,
  category,
  inventory,
  order,
  orderItem,
  product,
  productImage,
  productUnit,
} from "@/server/db/schema";

/**
 * Чтение данных для админки.
 *
 * Отличие от витрины: показываем всё, включая черновики и архив,
 * и добавляем служебные числа — остаток, резерв, количество экземпляров.
 */

export type AdminProductRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  status: "draft" | "active" | "archived";
  kind: "stocked" | "serialized";
  condition: "new" | "unworn" | "pre_owned";
  vatScheme: VatScheme;
  priceCents: number | null;
  brandName: string;
  categoryName: string;
  imageUrl: string | null;
  stockQuantity: number;
  stockReserved: number;
  availableUnits: number;
  totalUnits: number;
  isFeatured: boolean;
};

const ADMIN_IMAGE_URL = sql<string | null>`(
  SELECT ${productImage.url}
  FROM ${productImage}
  WHERE ${productImage.productId} = ${product.id}
    AND ${productImage.productUnitId} IS NULL
  ORDER BY ${productImage.isPrimary} DESC, ${productImage.position} ASC
  LIMIT 1
)`;

const AVAILABLE_UNITS = sql<number>`(
  SELECT count(*)::int FROM ${productUnit}
  WHERE ${productUnit.productId} = ${product.id}
    AND ${productUnit.status} = 'available'
)`;

const TOTAL_UNITS = sql<number>`(
  SELECT count(*)::int FROM ${productUnit}
  WHERE ${productUnit.productId} = ${product.id}
)`;

export async function listProductsForAdmin(input: {
  search?: string | undefined;
  status?: "draft" | "active" | "archived" | undefined;
}): Promise<AdminProductRow[]> {
  const conditions = [];

  if (input.status) {
    conditions.push(eq(product.status, input.status));
  }

  if (input.search) {
    const pattern = `%${input.search}%`;
    const match = or(
      ilike(product.name, pattern),
      ilike(product.sku, pattern),
      ilike(product.slug, pattern),
    );
    if (match) conditions.push(match);
  }

  return db
    .select({
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      status: product.status,
      kind: product.kind,
      condition: product.condition,
      vatScheme: product.vatScheme,
      priceCents: product.priceCents,
      isFeatured: product.isFeatured,
      brandName: brand.name,
      categoryName: category.name,
      imageUrl: ADMIN_IMAGE_URL,
      stockQuantity: sql<number>`coalesce(${inventory.quantity}, 0)`,
      stockReserved: sql<number>`coalesce(${inventory.reserved}, 0)`,
      availableUnits: AVAILABLE_UNITS,
      totalUnits: TOTAL_UNITS,
    })
    .from(product)
    .innerJoin(brand, eq(brand.id, product.brandId))
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(inventory, eq(inventory.productId, product.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(product.updatedAt));
}

/** Товар целиком: поля, фото, экземпляры, склад. */
export async function getProductForAdmin(productId: string) {
  const row = await db.query.product.findFirst({
    where: eq(product.id, productId),
    with: {
      brand: true,
      category: true,
      images: {
        orderBy: [desc(productImage.isPrimary), asc(productImage.position)],
      },
      units: { orderBy: [asc(productUnit.unitCode)] },
      inventory: true,
    },
  });

  return row ?? null;
}

export async function listBrandOptions() {
  return db
    .select({ id: brand.id, name: brand.name })
    .from(brand)
    .orderBy(asc(brand.position), asc(brand.name));
}

export async function listCategoryOptions() {
  return db
    .select({ id: category.id, name: category.name })
    .from(category)
    .orderBy(asc(category.position), asc(category.name));
}

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  email: string;
  totalCents: number;
  placedAt: Date;
  reservationExpiresAt: Date | null;
  itemCount: number;
  countryCode: string;
};

export async function listOrdersForAdmin(input: {
  status?: string | undefined;
}): Promise<AdminOrderRow[]> {
  const conditions = [];
  if (input.status) {
    conditions.push(eq(order.status, input.status as typeof order.$inferSelect.status));
  }

  const rows = await db
    .select({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      totalCents: order.totalCents,
      placedAt: order.placedAt,
      reservationExpiresAt: order.reservationExpiresAt,
      itemCount: sql<number>`coalesce(sum(${orderItem.quantity}), 0)::int`,
      countryCode: sql<string>`${order.shippingAddress}->>'countryCode'`,
    })
    .from(order)
    .leftJoin(orderItem, eq(orderItem.orderId, order.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(order.id)
    .orderBy(desc(order.placedAt));

  return rows;
}

export type DashboardStats = {
  pendingPaymentCount: number;
  paidCount: number;
  activeProductCount: number;
  draftProductCount: number;
  lowStockCount: number;
  availableUnitCount: number;
  /** Выручка по оплаченным и доставленным заказам, в центах. */
  paidRevenueCents: number;
  expiredReservationCount: number;
};

/**
 * Числа для сводки.
 *
 * Собраны одним запросом из подзапросов: открывать дашборд не должно
 * стоить десятка обращений к базе.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [row] = await db.execute<{
    pending_payment_count: number;
    paid_count: number;
    active_product_count: number;
    draft_product_count: number;
    low_stock_count: number;
    available_unit_count: number;
    paid_revenue_cents: number;
    expired_reservation_count: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM "order" WHERE status = 'pending_payment') AS pending_payment_count,
      (SELECT count(*)::int FROM "order" WHERE status IN ('paid', 'processing', 'shipped')) AS paid_count,
      (SELECT count(*)::int FROM product WHERE status = 'active') AS active_product_count,
      (SELECT count(*)::int FROM product WHERE status = 'draft') AS draft_product_count,
      (
        SELECT count(*)::int FROM inventory i
        JOIN product p ON p.id = i.product_id
        WHERE p.status = 'active'
          AND i.quantity - i.reserved <= i.low_stock_threshold
      ) AS low_stock_count,
      (SELECT count(*)::int FROM product_unit WHERE status = 'available') AS available_unit_count,
      (
        SELECT coalesce(sum(total_cents), 0)::int FROM "order"
        WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
      ) AS paid_revenue_cents,
      (
        SELECT count(*)::int FROM "order"
        WHERE status = 'pending_payment'
          AND reservation_expires_at IS NOT NULL
          AND reservation_expires_at < now()
      ) AS expired_reservation_count
  `);

  return {
    pendingPaymentCount: row?.pending_payment_count ?? 0,
    paidCount: row?.paid_count ?? 0,
    activeProductCount: row?.active_product_count ?? 0,
    draftProductCount: row?.draft_product_count ?? 0,
    lowStockCount: row?.low_stock_count ?? 0,
    availableUnitCount: row?.available_unit_count ?? 0,
    paidRevenueCents: row?.paid_revenue_cents ?? 0,
    expiredReservationCount: row?.expired_reservation_count ?? 0,
  };
}

/** Товары, которых мало на складе — для предупреждения на дашборде. */
export async function listLowStockProducts() {
  return db
    .select({
      id: product.id,
      name: product.name,
      brandName: brand.name,
      quantity: inventory.quantity,
      reserved: inventory.reserved,
      threshold: inventory.lowStockThreshold,
    })
    .from(inventory)
    .innerJoin(product, eq(product.id, inventory.productId))
    .innerJoin(brand, eq(brand.id, product.brandId))
    .where(
      and(
        eq(product.status, "active"),
        sql`${inventory.quantity} - ${inventory.reserved} <= ${inventory.lowStockThreshold}`,
      ),
    )
    .orderBy(asc(inventory.quantity))
    .limit(10);
}

export async function countProductsByStatus() {
  return db
    .select({ status: product.status, value: count() })
    .from(product)
    .groupBy(product.status);
}
