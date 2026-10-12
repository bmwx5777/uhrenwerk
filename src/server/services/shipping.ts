import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { shippingMethod, shippingZoneCountry } from "@/server/db/schema";

/**
 * Способы доставки по стране получателя.
 *
 * Страна принадлежит ровно одной зоне — это гарантирует уникальный индекс
 * `shipping_zone_country_unique` из этапа 2, поэтому выбор зоны всегда
 * однозначен и не требует разрешения конфликтов.
 */

export type ShippingOption = {
  id: string;
  name: string;
  description: string | null;
  /** Цена нетто в центах; НДС начисляется сверху по правилам заказа. */
  priceCents: number;
  freeOverCents: number | null;
  minDays: number;
  maxDays: number;
  isInsured: boolean;
};

export async function listShippingOptions(
  countryCode: string,
): Promise<ShippingOption[]> {
  return db
    .select({
      id: shippingMethod.id,
      name: shippingMethod.name,
      description: shippingMethod.description,
      priceCents: shippingMethod.priceCents,
      freeOverCents: shippingMethod.freeOverCents,
      minDays: shippingMethod.minDays,
      maxDays: shippingMethod.maxDays,
      isInsured: shippingMethod.isInsured,
    })
    .from(shippingMethod)
    .innerJoin(
      shippingZoneCountry,
      eq(shippingZoneCountry.zoneId, shippingMethod.zoneId),
    )
    .where(
      and(
        eq(shippingZoneCountry.countryCode, countryCode.toUpperCase()),
        eq(shippingMethod.isActive, true),
      ),
    )
    .orderBy(asc(shippingMethod.position), asc(shippingMethod.priceCents));
}

export async function getShippingOption(
  methodId: string,
  countryCode: string,
): Promise<ShippingOption | null> {
  const options = await listShippingOptions(countryCode);
  // Способ должен принадлежать зоне этой страны: иначе клиент мог бы
  // подставить дешёвую европейскую доставку для отправки в Австралию.
  return options.find((option) => option.id === methodId) ?? null;
}

/**
 * Стоимость доставки с учётом порога бесплатной отправки.
 * Порог сравнивается с суммой товаров нетто.
 */
export function shippingCostCents(
  option: ShippingOption,
  subtotalNetCents: number,
): number {
  if (option.freeOverCents !== null && subtotalNetCents >= option.freeOverCents) {
    return 0;
  }

  return option.priceCents;
}
