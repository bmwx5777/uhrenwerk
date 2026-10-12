"use client";

import { useState } from "react";

import { Button } from "./button";
import { Dialog, DialogClose, DialogContent } from "./dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Красная кнопка подтверждения — для удаления и отмены заказа. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Подтверждение необратимого действия.
 *
 * Пока `onConfirm` выполняется, кнопка показывает спиннер и блокирует
 * повторный клик — иначе двойное нажатие отправит действие дважды.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Пока действие выполняется, закрывать окно нельзя.
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent
        title={title}
        description={description}
        className="max-w-md"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isPending}>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button
              variant={destructive ? "danger" : "primary"}
              isPending={isPending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
