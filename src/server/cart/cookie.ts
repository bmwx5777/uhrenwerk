import "server-only";

import { cookies } from "next/headers";

import { isProduction } from "@/lib/env/server";

/**
 * Cookie гостевой корзины.
 *
 * Значение — случайный UUID, а не идентификатор корзины в базе: токен
 * нельзя подобрать перебором, и по нему нельзя ничего узнать о магазине.
 * httpOnly закрывает доступ из JavaScript, sameSite=lax защищает от
 * межсайтовых подстановок, но не мешает возврату с платёжной страницы.
 */
export const GUEST_CART_COOKIE = "uw_cart";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function readGuestCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_CART_COOKIE)?.value ?? null;
}

/**
 * Записать токен. Доступно только из серверных действий и route handlers —
 * во время рендера страницы Next запрещает изменять cookies.
 */
export async function writeGuestCartToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function clearGuestCartToken(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_CART_COOKIE);
}

export function createGuestCartToken(): string {
  return crypto.randomUUID();
}
