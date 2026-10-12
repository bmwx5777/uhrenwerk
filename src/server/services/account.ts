import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/server/db";
import { address, taxRate } from "@/server/db/schema";

/**
 * Чтение данных личного кабинета.
 *
 * Каждый запрос фильтруется по `userId` — идентификатор адреса из формы
 * сам по себе ничего не открывает. Это главное правило этого слоя.
 */

export type UserAddress = Awaited<ReturnType<typeof listAddresses>>[number];

export async function listAddresses(userId: string) {
  return db
    .select()
    .from(address)
    .where(eq(address.userId, userId))
    .orderBy(desc(address.isDefault), asc(address.type), asc(address.createdAt));
}

export async function getAddress(userId: string, addressId: string) {
  const [row] = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .limit(1);

  return row ?? null;
}

/**
 * Страны, доступные для адреса.
 *
 * Берём из таблицы ставок НДС: там ровно те страны, для которых мы умеем
 * посчитать налог и собрать доставку. Отдельного справочника стран не
 * заводим — он разошёлся бы с налоговыми правилами.
 */
export const listCountries = cache(async () => {
  const rows = await db
    .select({
      code: taxRate.countryCode,
      name: taxRate.countryName,
      isEu: taxRate.isEu,
    })
    .from(taxRate)
    .orderBy(desc(taxRate.isEu), asc(taxRate.countryName));

  return rows;
});

/** Есть ли у пользователя адрес этого типа — нужно, чтобы первый стал основным. */
export async function hasAddressOfType(
  userId: string,
  type: "shipping" | "billing",
): Promise<boolean> {
  const [row] = await db
    .select({ id: address.id })
    .from(address)
    .where(and(eq(address.userId, userId), eq(address.type, type)))
    .limit(1);

  return Boolean(row);
}
