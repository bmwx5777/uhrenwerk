import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { lineDisplayCents, type VatScheme } from "@/lib/pricing";
import { getCurrentUser } from "@/server/auth/session";
import { readGuestCartToken } from "@/server/cart/cookie";
import { db } from "@/server/db";
import {
  brand,
  cart,
  cartItem,
  product,
  productImage,
  productUnit,
} from "@/server/db/schema";

/**
 * Чтение корзины.
 *
 * Главное правило: цена в `cart_item` не хранится. Каждый раз, когда
 * корзина показывается или пересчитывается, цена читается из `product`
 * или `product_unit` заново. Поэтому «цена из клиента» в этом магазине
 * невозможна технически, а не только по договорённости.
 */

export type CartLine = {
  itemId: string;
  productId: string;
  productUnitId: string | null;
  slug: string;
  name: string;
  brandName: string;
  reference: string | null;
  imageUrl: string | null;
  condition: "new" | "unworn" | "pre_owned";
  /** Цена за единицу: нетто, из базы. */
  unitPriceCents: number;
  vatScheme: VatScheme;
  quantity: number;
  /** Сколько можно купить сейчас: остаток склада или статус экземпляра. */
  availableQuantity: number;
  /** Экземпляр продан или товар кончился, пока корзина лежала. */
  isAvailable: boolean;
  unitCode: string | null;
  productionYear: number | null;
};

export type CartSummary = {
  cartId: string | null;
  lines: CartLine[];
  /** Количество единиц товара — для счётчика в шапке. */
  itemCount: number;
  /** Сумма без НДС (для документов). */
  subtotalNetCents: number;
  /** Сумма как её видит покупатель: с НДС, кроме товаров по схеме маржи. */
  subtotalDisplayCents: number;
  hasUnavailableLines: boolean;
};

export const EMPTY_CART: CartSummary = {
  cartId: null,
  lines: [],
  itemCount: 0,
  subtotalNetCents: 0,
  subtotalDisplayCents: 0,
  hasUnavailableLines: false,
};

/** Максимум одной позиции в корзине: защита от случайного «999». */
export const MAX_LINE_QUANTITY = 5;

/**
 * Найти активную корзину, ничего не создавая и не записывая cookie.
 * Безопасно вызывать при рендере страницы.
 */
export async function findActiveCart(): Promise<{ id: string } | null> {
  const user = await getCurrentUser();

  if (user) {
    const [row] = await db
      .select({ id: cart.id })
      .from(cart)
      .where(and(eq(cart.userId, user.id), eq(cart.status, "active")))
      .limit(1);

    if (row) return row;
  }

  const guestToken = await readGuestCartToken();
  if (!guestToken) return null;

  const [row] = await db
    .select({ id: cart.id })
    .from(cart)
    .where(and(eq(cart.guestToken, guestToken), eq(cart.status, "active")))
    .limit(1);

  return row ?? null;
}

/** Доступное количество: для обычного товара — склад, для экземпляра — его статус. */
const LINE_AVAILABLE_QUANTITY = sql<number>`(
  CASE
    WHEN ${cartItem.productUnitId} IS NOT NULL
      THEN (CASE WHEN ${productUnit.status} = 'available' THEN 1 ELSE 0 END)
    ELSE greatest(
      coalesce((SELECT inv.quantity - inv.reserved FROM inventory inv WHERE inv.product_id = ${product.id}), 0),
      0
    )
  END
)::int`;

const LINE_IMAGE_URL = sql<string | null>`(
  SELECT ${productImage.url}
  FROM ${productImage}
  WHERE ${productImage.productId} = ${product.id}
    AND ${productImage.productUnitId} IS NULL
  ORDER BY ${productImage.isPrimary} DESC, ${productImage.position} ASC
  LIMIT 1
)`;

export async function getCartSummary(): Promise<CartSummary> {
  const activeCart = await findActiveCart();
  if (!activeCart) return EMPTY_CART;

  const rows = await db
    .select({
      itemId: cartItem.id,
      productId: product.id,
      productUnitId: cartItem.productUnitId,
      quantity: cartItem.quantity,
      slug: product.slug,
      name: product.name,
      reference: product.reference,
      condition: product.condition,
      productPriceCents: product.priceCents,
      productVatScheme: product.vatScheme,
      unitPriceCents: productUnit.priceCents,
      unitVatScheme: productUnit.vatScheme,
      unitCode: productUnit.unitCode,
      productionYear: productUnit.productionYear,
      brandName: brand.name,
      imageUrl: LINE_IMAGE_URL,
      availableQuantity: LINE_AVAILABLE_QUANTITY,
    })
    .from(cartItem)
    .innerJoin(product, eq(product.id, cartItem.productId))
    .innerJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(productUnit, eq(productUnit.id, cartItem.productUnitId))
    .where(eq(cartItem.cartId, activeCart.id))
    .orderBy(cartItem.createdAt);

  const lines: CartLine[] = rows.map((row) => {
    // Цена экземпляра важнее цены модели: у каждых часов своя.
    const unitPriceCents = row.unitPriceCents ?? row.productPriceCents ?? 0;
    const vatScheme = (row.unitVatScheme ?? row.productVatScheme) as VatScheme;

    return {
      itemId: row.itemId,
      productId: row.productId,
      productUnitId: row.productUnitId,
      slug: row.slug,
      name: row.name,
      brandName: row.brandName,
      reference: row.reference,
      imageUrl: row.imageUrl,
      condition: row.condition,
      unitPriceCents,
      vatScheme,
      quantity: row.quantity,
      availableQuantity: row.availableQuantity,
      isAvailable: row.availableQuantity >= row.quantity && unitPriceCents > 0,
      unitCode: row.unitCode,
      productionYear: row.productionYear,
    };
  });

  return {
    cartId: activeCart.id,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    subtotalNetCents: lines.reduce(
      (total, line) => total + line.unitPriceCents * line.quantity,
      0,
    ),
    subtotalDisplayCents: lines.reduce(
      (total, line) =>
        total + lineDisplayCents(line.unitPriceCents, line.quantity, line.vatScheme),
      0,
    ),
    hasUnavailableLines: lines.some((line) => !line.isAvailable),
  };
}

/** Количество единиц в корзине — для счётчика в шапке. */
export async function getCartItemCount(): Promise<number> {
  const activeCart = await findActiveCart();
  if (!activeCart) return 0;

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${cartItem.quantity}), 0)::int` })
    .from(cartItem)
    .where(eq(cartItem.cartId, activeCart.id));

  return row?.total ?? 0;
}

/**
 * Перенести содержимое одной корзины в другую.
 *
 * Чистая работа с данными: ни cookie, ни сессии. Благодаря этому логику
 * слияния можно проверить отдельно от HTTP-запроса, а действие сверху
 * занимается только тем, чтобы найти корзины и убрать cookie гостя.
 *
 * Правила: обычный товар суммируется (с ограничением сверху), уникальный
 * экземпляр не дублируется — он существует в одном числе.
 */
export async function mergeCartContents(
  sourceCartId: string,
  targetCartId: string,
): Promise<{ moved: number; merged: number }> {
  if (sourceCartId === targetCartId) return { moved: 0, merged: 0 };

  return db.transaction(async (tx) => {
    const sourceItems = await tx
      .select()
      .from(cartItem)
      .where(eq(cartItem.cartId, sourceCartId));

    let moved = 0;
    let merged = 0;

    for (const item of sourceItems) {
      const [existing] = await tx
        .select({ id: cartItem.id, quantity: cartItem.quantity })
        .from(cartItem)
        .where(
          and(
            eq(cartItem.cartId, targetCartId),
            eq(cartItem.productId, item.productId),
            item.productUnitId
              ? eq(cartItem.productUnitId, item.productUnitId)
              : isNull(cartItem.productUnitId),
          ),
        )
        .limit(1);

      if (!existing) {
        await tx.insert(cartItem).values({
          cartId: targetCartId,
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity,
        });
        moved += 1;
        continue;
      }

      if (!item.productUnitId) {
        await tx
          .update(cartItem)
          .set({
            quantity: Math.min(existing.quantity + item.quantity, MAX_LINE_QUANTITY),
          })
          .where(eq(cartItem.id, existing.id));
        merged += 1;
      }
    }

    // Исходную корзину удаляем целиком: позиции уходят каскадом.
    await tx.delete(cart).where(eq(cart.id, sourceCartId));

    return { moved, merged };
  });
}

/**
 * Позиции корзины без привязки к экземпляру — нужны, чтобы на карточке
 * товара показать «уже в корзине».
 */
export async function getCartProductIds(): Promise<string[]> {
  const activeCart = await findActiveCart();
  if (!activeCart) return [];

  const rows = await db
    .select({ productId: cartItem.productId })
    .from(cartItem)
    .where(and(eq(cartItem.cartId, activeCart.id), isNull(cartItem.productUnitId)));

  return rows.map((row) => row.productId);
}
