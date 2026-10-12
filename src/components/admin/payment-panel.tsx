"use client";

import { BanknoteArrowUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { confirmPaymentAction } from "@/server/actions/admin";

export type AdminPayment = {
  id: string;
  method: string;
  provider: string;
  status: string;
  amountCents: number;
  providerReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Банковский перевод",
  card: "Карта",
  crypto: "Криптовалюта",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает поступления",
  requires_action: "Нужно действие",
  succeeded: "Получен",
  failed: "Не прошёл",
  cancelled: "Отменён",
  expired: "Истёк",
  refunded: "Возвращён",
  partially_refunded: "Частичный возврат",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Платежи заказа в админке.
 *
 * Кнопка подтверждения — для банковского перевода: администратор видит
 * поступление в банке и отмечает его здесь. Подтверждение одновременно
 * переводит заказ в «оплачен», то есть списывает резерв со склада,
 * поэтому действие требует подтверждения в диалоге.
 */
export function PaymentPanel({
  orderId,
  payments,
}: {
  orderId: string;
  payments: AdminPayment[];
}) {
  const [isPending, startTransition] = useTransition();

  function confirm(paymentId: string) {
    startTransition(async () => {
      const result = await confirmPaymentAction(paymentId);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted">
        Покупатель ещё не выбрал способ оплаты. Ссылка на оплату:{" "}
        <span className="font-mono text-xs">/checkout/payment/{orderId}</span>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {payments.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {METHOD_LABELS[item.method] ?? item.method}
              {" · "}
              {formatMoney(item.amountCents)}
            </p>
            <p className="mt-1 text-xs text-subtle">
              {DATE_FORMATTER.format(item.createdAt)}
              {item.providerReference ? ` · назначение ${item.providerReference}` : ""}
              {item.paidAt ? ` · получен ${DATE_FORMATTER.format(item.paidAt)}` : ""}
            </p>
          </div>

          <Badge
            variant={
              item.status === "succeeded"
                ? "success"
                : item.status === "pending"
                  ? "warning"
                  : "neutral"
            }
          >
            {STATUS_LABELS[item.status] ?? item.status}
          </Badge>

          {item.status === "pending" && item.method === "bank_transfer" ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={isPending}
              onClick={() => confirm(item.id)}
            >
              <BanknoteArrowUp className="size-3.5" aria-hidden />
              Деньги получены
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
