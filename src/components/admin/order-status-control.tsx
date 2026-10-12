"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ADMIN_STATUS_TRANSITIONS,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/constants/order-status";
import { changeOrderStatusAction } from "@/server/actions/admin";

/**
 * Смена статуса заказа.
 *
 * Показываем только разрешённые переходы — список приходит из одного
 * места, которое проверяет и сервер. Переходы, меняющие склад
 * («оплачен» списывает резерв, «отменён» снимает), требуют подтверждения.
 */
export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const current = status as OrderStatus;
  const transitions = ADMIN_STATUS_TRANSITIONS[current] ?? [];
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(next: OrderStatus) {
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, next);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-subtle">
        Для этого статуса переходов не предусмотрено.
      </p>
    );
  }

  const needsConfirm = (next: OrderStatus) =>
    next === "paid" || next === "cancelled" || next === "refunded";

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {transitions.map((next) => (
          <Button
            key={next}
            variant={next === "cancelled" ? "ghost" : "secondary"}
            size="sm"
            disabled={isPending}
            onClick={() => (needsConfirm(next) ? setPending(next) : apply(next))}
            className={next === "cancelled" ? "text-muted hover:text-danger-600" : ""}
          >
            {ORDER_STATUS_META[next].label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        destructive={pending === "cancelled" || pending === "refunded"}
        title={pending ? `Перевести в «${ORDER_STATUS_META[pending].label}»?` : ""}
        description={
          pending === "paid"
            ? "Резерв будет списан со склада: товар станет проданным, а уникальные экземпляры исчезнут из продажи."
            : pending === "cancelled"
              ? "Резерв будет снят, товар вернётся в продажу."
              : "Статус изменится. Склад при этом не меняется — остатки при возврате поправьте вручную."
        }
        confirmLabel="Изменить статус"
        onConfirm={async () => {
          if (pending) apply(pending);
        }}
      />
    </>
  );
}
