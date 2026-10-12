import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { readGuestCartToken } from "@/server/cart/cookie";
import { mergeGuestCartIntoUserCart } from "@/server/actions/cart";
import { db } from "@/server/db";
import { cart } from "@/server/db/schema";
import { getCartItemCount } from "@/server/services/cart";
import { getWishlistCount } from "@/server/services/wishlist";
import { and, eq } from "drizzle-orm";

/**
 * Счётчики для шапки.
 *
 * Отдельный эндпоинт нужен, чтобы шапка (а с ней главная и каталог)
 * осталась статической: число в кружке подгружается после загрузки
 * страницы, а не делает весь сайт динамическим.
 *
 * Здесь же происходит слияние гостевой корзины с пользовательской — это
 * первый запрос после входа, и момент подходящий. Новую корзину запрос
 * не создаёт: у случайного посетителя не должно появляться строк в базе.
 */
export async function GET() {
  const [user, guestToken] = await Promise.all([
    getCurrentUser(),
    readGuestCartToken(),
  ]);

  if (user && guestToken) {
    const [userCart] = await db
      .select({ id: cart.id })
      .from(cart)
      .where(and(eq(cart.userId, user.id), eq(cart.status, "active")))
      .limit(1);

    const targetCartId =
      userCart?.id ??
      (await db.insert(cart).values({ userId: user.id }).returning({ id: cart.id }))[0]
        ?.id;

    if (targetCartId) {
      await mergeGuestCartIntoUserCart(user.id, guestToken, targetCartId);
    }
  }

  const [cartCount, wishlistCount] = await Promise.all([
    getCartItemCount(),
    getWishlistCount(),
  ]);

  return NextResponse.json(
    { cart: cartCount, wishlist: wishlistCount },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
