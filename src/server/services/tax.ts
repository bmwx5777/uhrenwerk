import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import {
  HOME_COUNTRY_CODE,
  HOME_VAT_RATE_BP,
  OSS_REGISTERED,
} from "@/lib/constants/tax";
import type { VatScheme } from "@/lib/pricing";
import { db } from "@/server/db";
import { taxRate } from "@/server/db/schema";

/**
 * Налоговые правила заказа.
 *
 * Продавец на Кипре, покупатели по всему миру. Ставка зависит от страны
 * доставки и от того, кто покупает — частное лицо или компания с
 * VAT-номером.
 *
 * ВАЖНО: это реализация правил, а не налоговая консультация. Перед
 * запуском схему нужно подтвердить у бухгалтера, особенно порог OSS
 * и применимость схемы маржи к конкретным закупкам.
 */

export type TaxTreatment =
  | "eu_domestic"
  | "eu_oss"
  | "eu_reverse_charge"
  | "export_zero_rated"
  | "margin_scheme";

export type TaxResolution = {
  treatment: TaxTreatment;
  /** Ставка в базисных пунктах: 1900 = 19 %. */
  rateBp: number;
  /** Объяснение для покупателя — показывается в итогах заказа. */
  explanation: string;
};

const countryTax = cache(async (countryCode: string) => {
  const [row] = await db
    .select({
      countryCode: taxRate.countryCode,
      countryName: taxRate.countryName,
      isEu: taxRate.isEu,
      standardRateBp: taxRate.standardRateBp,
    })
    .from(taxRate)
    .where(eq(taxRate.countryCode, countryCode.toUpperCase()))
    .limit(1);

  return row ?? null;
});

/** Можно ли доставить заказ в эту страну (есть ли она в налоговой таблице). */
export async function isSupportedCountry(countryCode: string): Promise<boolean> {
  return (await countryTax(countryCode)) !== null;
}

/**
 * Налоговый режим заказа по стране доставки и VAT-номеру покупателя.
 *
 * Порядок проверок соответствует правилам ЕС:
 *   1. доставка за пределы ЕС → экспорт, 0 %
 *   2. ЕС + валидный VAT-номер другой страны → reverse charge, 0 %
 *   3. домашняя страна (Кипр) → местная ставка
 *   4. другая страна ЕС → ставка страны покупателя при регистрации в OSS,
 *      иначе кипрская (допустимо до порога 10 000 € в год)
 */
export async function resolveTaxTreatment(input: {
  countryCode: string;
  /** VAT-номер, уже проверенный (валидация через VIES — отдельная задача). */
  vatNumber?: string | null;
}): Promise<TaxResolution> {
  const country = await countryTax(input.countryCode);

  if (!country || !country.isEu) {
    return {
      treatment: "export_zero_rated",
      rateBp: 0,
      explanation:
        "Доставка за пределы ЕС: НДС не начисляется. Импортные пошлины и местные налоги оплачивает получатель.",
    };
  }

  const isHome = country.countryCode === HOME_COUNTRY_CODE;
  const hasVatNumber = Boolean(input.vatNumber && input.vatNumber.length > 0);

  if (hasVatNumber && !isHome) {
    return {
      treatment: "eu_reverse_charge",
      rateBp: 0,
      explanation:
        "Поставка внутри ЕС с reverse charge: НДС платит покупатель по своей регистрации.",
    };
  }

  if (isHome) {
    return {
      treatment: "eu_domestic",
      rateBp: HOME_VAT_RATE_BP,
      explanation: `НДС Кипра ${HOME_VAT_RATE_BP / 100} %.`,
    };
  }

  if (OSS_REGISTERED) {
    return {
      treatment: "eu_oss",
      rateBp: country.standardRateBp,
      explanation: `НДС страны доставки (${country.countryName}) ${country.standardRateBp / 100} %, отчётность через OSS.`,
    };
  }

  return {
    treatment: "eu_domestic",
    rateBp: HOME_VAT_RATE_BP,
    explanation: `НДС Кипра ${HOME_VAT_RATE_BP / 100} %: продавец не зарегистрирован в OSS.`,
  };
}

/**
 * Ставка для конкретной позиции.
 *
 * Товар по схеме маржи налогом сверху не облагается в любом случае:
 * НДС с маржи платит продавец и в счёте его не выделяют.
 */
export function lineTaxRateBp(resolution: TaxResolution, vatScheme: VatScheme): number {
  return vatScheme === "margin" ? 0 : resolution.rateBp;
}

/** НДС на единицу товара. Округление на единицу — см. `lineDisplayCents`. */
export function taxPerUnitCents(netUnitCents: number, rateBp: number): number {
  return Math.round((netUnitCents * rateBp) / 10_000);
}
