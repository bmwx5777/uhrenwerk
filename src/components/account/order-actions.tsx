"use client";

import { RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { emitCartCount } from "@/lib/client-events";
import { cancelOrderAction, reorderAction } from "@/server/actions/order";

type OrderActionsProps = {
  orderId: string;
  orderNumber: string;
  canCancel: boolean;
};

/**
 * Действия над заказом: отмена и повтор.
 *
 * Отмена спрашивает подтверждение — она снимает резерв, и товар сразу
 * уходит обратно в продажу, то есть вернуть заказ одним нажатием уже
 * не получится.
 */
export function OrderActions({ orderId, orderNumber, canCancel }: OrderActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReorder() {
    startTransition(async () => {
      const result = await reorderAction(orderId);
      if (result.status === "ok") {
        toast.success(result.message);
        // Счётчик в шапке: сколько именно добавилось, знает сервер,
        // поэтому просто просим обновить значение запросом.
        const response = await fetch("/api/cart/count");
        if (response.ok) {
          const data = (await response.json()) as { cart: number };
          emitCartCount(data.cart);
        }
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleCancel() {
    const result = await cancelOrderAction(orderId);
    if (result.status === "ok") toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReorder}
          isPending={isPending}
          className="gap-2"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Повторить заказ
        </Button>

        {canCancel ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="gap-2 text-muted hover:text-danger-600"
          >
            <X className="size-3.5" aria-hidden />
            Отменить
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title={`Отменить заказ ${orderNumber}?`}
        description="Резерв будет снят, и товар вернётся в продажу. Если это уникальный экземпляр, его может купить другой покупатель."
        confirmLabel="Отменить заказ"
        cancelLabel="Оставить"
        onConfirm={handleCancel}
      />
    </>
  );
}
