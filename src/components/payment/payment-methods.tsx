import { Bitcoin, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type PaymentMethodMeta,
} from "@/lib/constants/payment";
import { cn } from "@/lib/utils";

const ICONS: Record<PaymentMethod, LucideIcon> = {
  card: CreditCard,
  bank_transfer: Landmark,
  crypto: Bitcoin,
};

/** Короткая подпись для витрины: полное описание нужно только на оплате. */
const SHORT_LABELS: Record<PaymentMethod, { title: string; hint: string }> = {
  card: { title: "Visa · Mastercard", hint: "3-D Secure" },
  bank_transfer: { title: "Банковский перевод", hint: "Счёт с реквизитами" },
  crypto: { title: "Криптовалюта", hint: "BTC · ETH · USDT · USDC" },
};

/**
 * Порядок на витрине отличается от порядка на оплате: здесь первой идёт
 * карта как самый привычный способ, а не перевод как основной по сумме.
 */
const DISPLAY_ORDER: PaymentMethod[] = ["card", "bank_transfer", "crypto"];

function orderedMethods(): PaymentMethodMeta[] {
  return DISPLAY_ORDER.map((method) =>
    PAYMENT_METHODS.find((item) => item.method === method),
  ).filter((item): item is PaymentMethodMeta => item !== undefined);
}

/**
 * Способы оплаты на витрине.
 *
 * Данные берутся из того же `PAYMENT_METHODS`, что и страница оплаты,
 * поэтому витрина не может пообещать способ, которого нет в оформлении
 * заказа. Неподключённые способы показываются приглушённо с пометкой —
 * это честнее, чем показать логотип Visa и упереться в его отсутствие
 * на последнем шаге.
 */
export function PaymentMethods({ className }: { className?: string }) {
  const methods = orderedMethods();

  return (
    <section className={className} aria-labelledby="payment-methods-title">
      <div className="flex items-center gap-4">
        <h2 id="payment-methods-title" className="eyebrow">
          Способы оплаты
        </h2>
        <span className="rule-fade flex-1" aria-hidden />
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {methods.map((meta) => {
          const Icon = ICONS[meta.method];
          const { title, hint } = SHORT_LABELS[meta.method];

          return (
            <li
              key={meta.method}
              className={cn(
                "card-surface flex items-start gap-3 p-3.5",
                !meta.available && "opacity-70",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  meta.available ? "text-accent-text" : "text-subtle",
                )}
                strokeWidth={1.5}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-medium">{title}</p>
                <p className="mt-1 font-mono text-[0.625rem] tracking-wide text-subtle">
                  {hint}
                </p>
                {!meta.available ? (
                  <p className="mt-1.5 text-[0.625rem] tracking-[0.12em] text-subtle uppercase">
                    Скоро
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-center gap-2 text-[0.6875rem] text-subtle">
        <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        Экземпляр резервируется за вами на время оплаты.
      </p>
    </section>
  );
}

/**
 * Та же информация строкой — для подвала, где нужен только знак
 * «здесь можно заплатить так», без подробностей.
 */
export function PaymentMethodsInline({ className }: { className?: string }) {
  const methods = orderedMethods();

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {methods.map((meta) => {
        const Icon = ICONS[meta.method];

        return (
          <li
            key={meta.method}
            className={cn(
              "flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5",
              !meta.available && "opacity-60",
            )}
            title={meta.available ? meta.label : meta.unavailableReason}
          >
            <Icon
              className="size-3.5 shrink-0 text-subtle"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="text-[0.6875rem] text-muted">
              {SHORT_LABELS[meta.method].title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
