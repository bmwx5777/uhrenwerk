"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/session";
import {
  clearGuestCartToken,
  createGuestCartToken,
  readGuestCartToken,
  writeGuestCartToken,
} from "@/server/cart/cookie";
import { db } from "@/server/db";
import { cart, cartItem, inventory, product, productUnit } from "@/server/db/schema";
import {
  getCartItemCount,
  mergeCartContents,
  MAX_LINE_QUANTITY,
} from "@/server/services/cart";
import type { FormState } from "./form-state";

/**
 * Действия корзины.
 *
 * Клиент присылает только идентификаторы и количество. Цена, наличие и
 * право купить проверяются здесь, по данным базы.
 */

export type CartActionResult = FormState & {
  /** Новое количество единиц — клиент сразу обновляет счётчик в шапке. */
  cartCount: number;
};

const addToCartSchema = z.object({
  productId: z.uuid(),
  productUnitId: z.uuid().optional(),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY).catch(1),
});

const cartItemIdSchema = z.uuid();

const quantitySchema = z.coerce.number().int().min(0).max(MAX_LINE_QUANTITY);

async function result(
  status: "ok" | "error",
  message: string,
): Promise<CartActionResult> {
  return { status, message, at: Date.now(), cartCount: await getCartItemCount() };
}

/**
 * Перенести гостевую корзину в корзину пользователя.
 *
 * Вызывается при первом обращении к корзине после входа. Хук в Better Auth
 * для этого не нужен: слияние — дело корзины, а не аутентификации.
 */
export async function mergeGuestCartIntoUserCart(
  userId: string,
  guestToken: string,
  targetCartId: string,
): Promise<void> {
  const [guestCart] = await db
    .select({ id: cart.id })
    .from(cart)
    .where(and(eq(cart.guestToken, guestToken), eq(cart.status, "active")))
    .limit(1);

  if (guestCart && guestCart.id !== targetCartId) {
    const stats = await mergeCartContents(guestCart.id, targetCartId);
    console.info("cart.merged", { userId, targetCartId, ...stats });
  }

  // Cookie снимаем всегда: после входа гостевая корзина больше не нужна.
  await clearGuestCartToken();
}

/**
 * Корзина для записи: создаёт при необходимости и ставит cookie.
 * Вызывать только из серверных действий и route handlers.
 */
async function resolveCartForWrite(): Promise<string> {
  const user = await getCurrentUser();
  const guestToken = await readGuestCartToken();

  if (user) {
    const [existing] = await db
      .select({ id: cart.id })
      .from(cart)
      .where(and(eq(cart.userId, user.id), eq(cart.status, "active")))
      .limit(1);

    const cartId =
      existing?.id ??
      (await db.insert(cart).values({ userId: user.id }).returning({ id: cart.id }))[0]!
        .id;

    if (guestToken) {
      await mergeGuestCartIntoUserCart(user.id, guestToken, cartId);
    }

    return cartId;
  }

  if (guestToken) {
    const [existing] = await db
      .select({ id: cart.id })
      .from(cart)
      .where(and(eq(cart.guestToken, guestToken), eq(cart.status, "active")))
      .limit(1);

    if (existing) return existing.id;
  }

  const token = createGuestCartToken();
  const [created] = await db
    .insert(cart)
    .values({ guestToken: token })
    .returning({ id: cart.id });

  await writeGuestCartToken(token);
  return created!.id;
}

/** Сколько единиц этого товара (или экземпляра) можно купить прямо сейчас. */
async function availableQuantity(
  productId: string,
  productUnitId?: string,
): Promise<number> {
  if (productUnitId) {
    const [unit] = await db
      .select({ status: productUnit.status })
      .from(productUnit)
      .where(
        and(eq(productUnit.id, productUnitId), eq(productUnit.productId, productId)),
      )
      .limit(1);

    return unit?.status === "available" ? 1 : 0;
  }

  const [stock] = await db
    .select({
      available: sql<number>`greatest(${inventory.quantity} - ${inventory.reserved}, 0)::int`,
    })
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .limit(1);

  return stock?.available ?? 0;
}

export async function addToCartAction(input: {
  productId: string;
  productUnitId?: string;
  quantity?: number;
}): Promise<CartActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return result("error", "Некорректный товар.");

  const { productId, productUnitId, quantity } = parsed.data;

  // Товар должен быть опубликован — черновик или архив купить нельзя.
  const [row] = await db
    .select({ id: product.id, kind: product.kind })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.status, "active")))
    .limit(1);

  if (!row) return result("error", "Товар недоступен.");

  if (row.kind === "serialized" && !productUnitId) {
    return result("error", "Выберите конкретный экземпляр.");
  }

  const available = await availableQuantity(productId, productUnitId);
  if (available === 0) {
    return result(
      "error",
      productUnitId ? "Этот экземпляр уже продан." : "Товара нет в наличии.",
    );
  }

  const cartId = await resolveCartForWrite();
  const requested = productUnitId ? 1 : quantity;

  try {
    const [existing] = await db
      .select({ id: cartItem.id, quantity: cartItem.quantity })
      .from(cartItem)
      .where(
        and(
          eq(cartItem.cartId, cartId),
          eq(cartItem.productId, productId),
          productUnitId
            ? eq(cartItem.productUnitId, productUnitId)
            : isNull(cartItem.productUnitId),
        ),
      )
      .limit(1);

    if (existing) {
      if (productUnitId) {
        return result("ok", "Этот экземпляр уже в корзине.");
      }

      const nextQuantity = Math.min(
        existing.quantity + requested,
        available,
        MAX_LINE_QUANTITY,
      );

      if (nextQuantity === existing.quantity) {
        return result("error", `Больше ${nextQuantity} шт. добавить нельзя.`);
      }

      await db
        .update(cartItem)
        .set({ quantity: nextQuantity })
        .where(eq(cartItem.id, existing.id));
    } else {
      await db.insert(cartItem).values({
        cartId,
        productId,
        ...(productUnitId ? { productUnitId } : {}),
        quantity: Math.min(requested, available, MAX_LINE_QUANTITY),
      });
    }
  } catch (error) {
    console.error("cart.add", error);
    return result("error", "Не удалось добавить товар. Попробуйте позже.");
  }

  revalidatePath("/cart");
  return result("ok", "Товар в корзине.");
}

export async function updateCartItemQuantityAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const id = cartItemIdSchema.safeParse(itemId);
  const nextQuantity = quantitySchema.safeParse(quantity);

  if (!id.success || !nextQuantity.success) {
    return result("error", "Некорректное количество.");
  }

  // Ноль — это удаление позиции.
  if (nextQuantity.data === 0) return removeCartItemAction(itemId);

  const activeCart = await resolveCartForWrite();

  const [line] = await db
    .select({
      id: cartItem.id,
      productId: cartItem.productId,
      productUnitId: cartItem.productUnitId,
    })
    .from(cartItem)
    .where(and(eq(cartItem.id, id.data), eq(cartItem.cartId, activeCart)))
    .limit(1);

  if (!line) return result("error", "Позиция не найдена.");

  if (line.productUnitId && nextQuantity.data > 1) {
    return result("error", "Этот экземпляр существует в одном числе.");
  }

  const available = await availableQuantity(
    line.productId,
    line.productUnitId ?? undefined,
  );

  if (nextQuantity.data > available) {
    return result("error", `В наличии только ${available} шт.`);
  }

  try {
    await db
      .update(cartItem)
      .set({ quantity: nextQuantity.data })
      .where(eq(cartItem.id, line.id));
  } catch (error) {
    console.error("cart.updateQuantity", error);
    return result("error", "Не удалось изменить количество.");
  }

  revalidatePath("/cart");
  return result("ok", "Количество обновлено.");
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  const id = cartItemIdSchema.safeParse(itemId);
  if (!id.success) return result("error", "Позиция не найдена.");

  const activeCart = await resolveCartForWrite();

  try {
    // cartId в условии: позицию из чужой корзины удалить нельзя.
    const deleted = await db
      .delete(cartItem)
      .where(and(eq(cartItem.id, id.data), eq(cartItem.cartId, activeCart)))
      .returning({ id: cartItem.id });

    if (deleted.length === 0) return result("error", "Позиция не найдена.");
  } catch (error) {
    console.error("cart.remove", error);
    return result("error", "Не удалось удалить позицию.");
  }

  revalidatePath("/cart");
  return result("ok", "Товар удалён из корзины.");
}
