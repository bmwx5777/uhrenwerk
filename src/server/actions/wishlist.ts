"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { product, wishlist, wishlistItem } from "@/server/db/schema";
import { getWishlistCount } from "@/server/services/wishlist";
import { addToCartAction } from "./cart";
import type { FormState } from "./form-state";

/**
 * Действия избранного.
 *
 * Требуют входа: список привязан к пользователю. Гостю возвращаем
 * `requiresAuth`, и кнопка отправляет его на страницу входа — вместо
 * молчаливого «ничего не произошло».
 */

export type WishlistActionResult = FormState & {
  requiresAuth?: boolean;
  inWishlist?: boolean;
  wishlistCount: number;
};

const toggleSchema = z.object({
  productId: z.uuid(),
  productUnitId: z.uuid().optional(),
});

const itemIdSchema = z.uuid();

function authRequired(): WishlistActionResult {
  return {
    status: "error",
    message: "Войдите, чтобы сохранить в избранное.",
    at: Date.now(),
    requiresAuth: true,
    wishlistCount: 0,
  };
}

/** Один список на пользователя — гарантируется уникальным индексом. */
async function getOrCreateWishlistId(userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(eq(wishlist.userId, userId))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(wishlist)
    .values({ userId })
    .returning({ id: wishlist.id });

  return created!.id;
}

export async function toggleWishlistAction(input: {
  productId: string;
  productUnitId?: string;
}): Promise<WishlistActionResult> {
  const user = await getCurrentUser();
  if (!user) return authRequired();

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Некорректный товар.",
      at: Date.now(),
      wishlistCount: await getWishlistCount(),
    };
  }

  const { productId, productUnitId } = parsed.data;

  const [exists] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.status, "active")))
    .limit(1);

  if (!exists) {
    return {
      status: "error",
      message: "Товар недоступен.",
      at: Date.now(),
      wishlistCount: await getWishlistCount(),
    };
  }

  try {
    const wishlistId = await getOrCreateWishlistId(user.id);

    const [existingItem] = await db
      .select({ id: wishlistItem.id })
      .from(wishlistItem)
      .where(
        and(
          eq(wishlistItem.wishlistId, wishlistId),
          eq(wishlistItem.productId, productId),
          productUnitId
            ? eq(wishlistItem.productUnitId, productUnitId)
            : isNull(wishlistItem.productUnitId),
        ),
      )
      .limit(1);

    if (existingItem) {
      await db.delete(wishlistItem).where(eq(wishlistItem.id, existingItem.id));
      revalidatePath("/wishlist");
      return {
        status: "ok",
        message: "Убрали из избранного.",
        at: Date.now(),
        inWishlist: false,
        wishlistCount: await getWishlistCount(),
      };
    }

    await db.insert(wishlistItem).values({
      wishlistId,
      productId,
      ...(productUnitId ? { productUnitId } : {}),
    });
  } catch (error) {
    console.error("wishlist.toggle", { userId: user.id, error });
    return {
      status: "error",
      message: "Не удалось изменить избранное.",
      at: Date.now(),
      wishlistCount: await getWishlistCount(),
    };
  }

  revalidatePath("/wishlist");
  return {
    status: "ok",
    message: "Сохранили в избранном.",
    at: Date.now(),
    inWishlist: true,
    wishlistCount: await getWishlistCount(),
  };
}

export async function removeWishlistItemAction(
  itemId: string,
): Promise<WishlistActionResult> {
  const user = await getCurrentUser();
  if (!user) return authRequired();

  const id = itemIdSchema.safeParse(itemId);
  if (!id.success) {
    return {
      status: "error",
      message: "Позиция не найдена.",
      at: Date.now(),
      wishlistCount: await getWishlistCount(),
    };
  }

  try {
    // Удаляем через подзапрос по списку пользователя: чужую позицию
    // по идентификатору удалить нельзя.
    const wishlistId = await getOrCreateWishlistId(user.id);
    const deleted = await db
      .delete(wishlistItem)
      .where(and(eq(wishlistItem.id, id.data), eq(wishlistItem.wishlistId, wishlistId)))
      .returning({ id: wishlistItem.id });

    if (deleted.length === 0) {
      return {
        status: "error",
        message: "Позиция не найдена.",
        at: Date.now(),
        wishlistCount: await getWishlistCount(),
      };
    }
  } catch (error) {
    console.error("wishlist.remove", { userId: user.id, error });
    return {
      status: "error",
      message: "Не удалось убрать из избранного.",
      at: Date.now(),
      wishlistCount: await getWishlistCount(),
    };
  }

  revalidatePath("/wishlist");
  return {
    status: "ok",
    message: "Убрали из избранного.",
    at: Date.now(),
    inWishlist: false,
    wishlistCount: await getWishlistCount(),
  };
}

/** Перенести в корзину: добавляем товар и убираем из избранного. */
export async function moveWishlistItemToCartAction(input: {
  itemId: string;
  productId: string;
  productUnitId?: string;
}): Promise<WishlistActionResult> {
  const user = await getCurrentUser();
  if (!user) return authRequired();

  const cartResult = await addToCartAction({
    productId: input.productId,
    ...(input.productUnitId ? { productUnitId: input.productUnitId } : {}),
  });

  if (cartResult.status === "error") {
    return {
      ...cartResult,
      wishlistCount: await getWishlistCount(),
    };
  }

  const removed = await removeWishlistItemAction(input.itemId);

  return {
    ...removed,
    status: "ok",
    message: "Товар перенесён в корзину.",
  };
}
