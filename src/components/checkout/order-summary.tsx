"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTaxRate } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CheckoutQuote } from "@/server/services/checkout";

/**
 * Итоги заказа.
 *
 * Компонент ничего не считает — он отображает числа, пришедшие с сервера.
 * Это не стилистика, а требование: единственный источник сумм — расчёт
 * на сервере, тот же, что создаёт заказ.
 */
export function OrderSummary({
  quote,
  isRefreshing,
}: {
  quote: CheckoutQuote;
  isRefreshing: boolean;
}) {
  const { totals, tax } = quote;

  // Цены с НДС складываются из частей, уже посчитанных сервером:
  // ставок и умножений на клиенте нет.
  const itemsGrossCents = quote.lines.reduce(
    (total, line) => total + line.lineGrossCents,
    0,
  );
  const shippingGrossCents = totals.shippingNetCents + totals.shippingTaxCents;

  return (
    <div
      className={cn(
        "card-surface p-6 transition-opacity",
        isRefreshing && "opacity-60",
      )}
      aria-busy={isRefreshing || undefined}
    >
      <h2 className="eyebrow">Ваш заказ</h2>

      <ul className="mt-6 flex flex-col gap-4">
        {quote.lines.map((line) => (
          <li key={line.itemId} className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-subtle">{line.brandName}</p>
              <p className="truncate text-sm">{line.name}</p>
              <p className="text-xs text-subtle">
                {line.quantity > 1 ? `${line.quantity} шт. · ` : ""}
                {line.productUnitId ? "экземпляр" : "новые"}
              </p>
            </div>

            <p className="text-sm whitespace-nowrap">
              {formatMoney(line.lineGrossCents)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 flex flex-col gap-3 border-t border-border pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Товары</dt>
          <dd>{formatMoney(itemsGrossCents)}</dd>
        </div>

        <div className="flex justify-between gap-4">
          <dt className="text-muted">Доставка</dt>
          <dd>
            {shippingGrossCents === 0 ? "бесплатно" : formatMoney(shippingGrossCents)}
          </dd>
        </div>

        {/*
          Частному покупателю в ЕС цена показывается с НДС, а сам налог —
          справочной строкой «в том числе». При экспорте и reverse charge
          налога нет: вместо строки работает пояснение ниже.
        */}
        {totals.taxCents > 0 ? (
          <div className="flex justify-between gap-4 text-xs text-subtle">
            <dt>в том числе НДС {formatTaxRate(tax.rateBp)}</dt>
            <dd>{formatMoney(totals.taxCents)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-border pt-6">
        <span className="text-sm">К оплате</span>
        <span className="text-xl">{formatMoney(totals.totalCents)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {tax.treatment === "export_zero_rated" ? (
          <Badge variant="outline">Экспорт · без НДС</Badge>
        ) : null}
        {tax.treatment === "eu_reverse_charge" ? (
          <Badge variant="outline">Reverse charge</Badge>
        ) : null}
        <p className="text-xs leading-relaxed text-subtle">{tax.explanation}</p>
        {quote.lines.some((line) => line.vatScheme === "margin") ? (
          <p className="text-xs leading-relaxed text-subtle">
            Часть товаров продаётся по схеме налогообложения маржи — для них НДС в счёте
            не выделяется.
          </p>
        ) : null}
      </div>
    </div>
  );
}
