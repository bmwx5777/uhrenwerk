import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from ".";

/**
 * Текущая сессия.
 *
 * Обёрнуто в `cache()`: layout, страница и серверные действия в одном
 * запросе получают сессию один раз, а не делают три обращения к базе.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Требует вход. Это авторитетная проверка: middleware лишь смотрит на
 * наличие cookie и не может обращаться к базе.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Требует роль администратора.
 *
 * Отдаём 404, а не 403: постороннему не нужно знать, что по этому адресу
 * вообще что-то есть.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
