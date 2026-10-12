import "server-only";

import { count, eq, sql } from "drizzle-orm";

import type { VatScheme } from "@/lib/pricing";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  brand,
  product,
  productImage,
  productUnit,
  wishlist,
  wishlistItem,
} from "@/server/db/schema";

/**
 * Избранное доступно только вошедшим: список привязан к пользователю
 * (`wishlist.userId` обязателен). Гостю кнопка предлагает войти — так
 * список не теряется при смене устройства.
 */

export type WishlistLine = {
  itemId: string;
  productId: string;
  productUnitId: string | null;
  slug: string;
  name: string;
  brandName: string;
  reference: string | null;
  imageUrl: string | null;
  condition: "new" | "unworn" | "pre_owned";
  priceCents: number | null;
  vatScheme: VatScheme;
  isAvailable: boolean;
};

const ITEM_IMAGE_URL = sql<string | null>`(
  SELECT ${productImage.url}
  FROM ${productImage}
  WHERE ${productImage.productId} = ${product.id}
    AND ${productImage.productUnitId} IS NULL
  ORDER BY ${productImage.isPrimary} DESC, ${productImage.position} ASC
  LIMIT 1
)`;

/** Доступность: статус экземпляра либо остаток склада. */
const ITEM_AVAILABLE = sql<boolean>`(
  CASE
    WHEN ${wishlistItem.productUnitId} IS NOT NULL
      THEN ${productUnit.status} = 'available'
    ELSE coalesce(
      (SELECT inv.quantity - inv.reserved > 0 FROM inventory inv WHERE inv.product_id = ${product.id}),
      false
    )
  END
)`;

/** Цена для «от»: у модели своя, у экземпляра своя. */
const ITEM_PRICE_CENTS = sql<number | null>`coalesce(
  ${productUnit.priceCents},
  ${product.priceCents},
  (
    SELECT min(u.price_cents)
    FROM product_unit u
    WHERE u.product_id = ${product.id} AND u.status = 'available'
  )
)`;

export async function getWishlistLines(userId: string): Promise<WishlistLine[]> {
  const rows = await db
    .select({
      itemId: wishlistItem.id,
      productId: product.id,
      productUnitId: wishlistItem.productUnitId,
      slug: product.slug,
      name: product.name,
      reference: product.reference,
      condition: product.condition,
      productVatScheme: product.vatScheme,
      unitVatScheme: productUnit.vatScheme,
      brandName: brand.name,
      imageUrl: ITEM_IMAGE_URL,
      priceCents: ITEM_PRICE_CENTS,
      isAvailable: ITEM_AVAILABLE,
    })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .innerJoin(product, eq(product.id, wishlistItem.productId))
    .innerJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(productUnit, eq(productUnit.id, wishlistItem.productUnitId))
    .where(eq(wishlist.userId, userId))
    .orderBy(wishlistItem.createdAt);

  return rows.map((row) => ({
    itemId: row.itemId,
    productId: row.productId,
    productUnitId: row.productUnitId,
    slug: row.slug,
    name: row.name,
    brandName: row.brandName,
    reference: row.reference,
    imageUrl: row.imageUrl,
    condition: row.condition,
    priceCents: row.priceCents,
    vatScheme: (row.unitVatScheme ?? row.productVatScheme) as VatScheme,
    isAvailable: row.isAvailable,
  }));
}

/** Идентификаторы товаров в избранном — для состояния кнопки на карточках. */
export async function getWishlistProductIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const rows = await db
    .select({ productId: wishlistItem.productId })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(eq(wishlist.userId, user.id));

  return new Set(rows.map((row) => row.productId));
}

export async function getWishlistCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(eq(wishlist.userId, user.id));

  return row?.value ?? 0;
}
