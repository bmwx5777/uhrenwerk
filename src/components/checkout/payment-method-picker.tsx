"use client";

import { Banknote, Bitcoin, CreditCard, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  CARD_LIMIT_CENTS,
  PAYMENT_METHODS,
  methodAllowedForAmount,
  type PaymentMethod,
} from "@/lib/constants/payment";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { startPaymentAction } from "@/server/actions/payment";

const ICONS: Record<PaymentMethod, typeof CreditCard> = {
  bank_transfer: Banknote,
  card: CreditCard,
  crypto: Bitcoin,
};

/**
 * Выбор способа оплаты.
 *
 * Недоступные способы показываем, но объясняем почему: «карты скоро» —
 * это информация, а исчезнувший из списка способ выглядит как ошибка.
 * Карта выше лимита тоже помечается сразу, а не отказом после нажатия.
 */
export function PaymentMethodPicker({
  orderId,
  totalCents,
}: {
  orderId: string;
  totalCents: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PaymentMethod>("bank_transfer");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await startPaymentAction({ orderId, method: selected });

      if (result.status === "ok") {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {PAYMENT_METHODS.map((meta) => {
          const Icon = ICONS[meta.method];
          const overLimit = !methodAllowedForAmount(meta.method, totalCents);
          const disabled = !meta.available || overLimit;

          return (
            <label
              key={meta.method}
              className={cn(
                "flex gap-4 border p-5 transition-colors",
                disabled
                  ? "cursor-not-allowed border-border bg-surface-muted/40"
                  : "cursor-pointer",
                !disabled && selected === meta.method
                  ? "border-accent bg-accent-soft/40"
                  : !disabled && "border-border-control hover:border-border-hover",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={meta.method}
                checked={selected === meta.method}
                disabled={disabled}
                onChange={() => setSelected(meta.method)}
                className="mt-1 size-4 accent-accent"
              />

              <div className="flex-1">
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                  {meta.label}
                </span>

                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {meta.description}
                </p>

                {overLimit ? (
                  <p className="mt-2 text-xs text-warning-700">
                    Для суммы выше {formatMoney(CARD_LIMIT_CENTS)} оплата картой
                    недоступна: выберите перевод или криптовалюту.
                  </p>
                ) : null}

                {!meta.available && meta.unavailableReason ? (
                  <p className="mt-2 text-xs text-subtle">{meta.unavailableReason}</p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      <Button size="lg" onClick={submit} isPending={isPending}>
        Перейти к оплате
      </Button>

      <p className="flex items-center gap-2 text-xs text-subtle">
        <Lock className="size-3.5" aria-hidden />
        Сумма к оплате зафиксирована в заказе и не меняется на этом шаге.
      </p>
    </div>
  );
}
