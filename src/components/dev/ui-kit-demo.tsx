"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/** Интерактивная часть ui-kit: оверлеи и уведомления. */
export function UiKitDemo() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast.success("Товар добавлен в избранное")}>
        Toast · успех
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error("Не удалось добавить в корзину", {
            description: "Этот экземпляр уже зарезервирован другим покупателем.",
          })
        }
      >
        Toast · ошибка
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Открыть диалог</Button>
        </DialogTrigger>
        <DialogContent
          title="Запрос на осмотр"
          description="Мы пришлём дополнительные фотографии и видео хода в течение рабочего дня."
          footer={
            <Button onClick={() => toast.success("Запрос отправлен")}>Отправить</Button>
          }
        >
          <p className="text-sm leading-relaxed text-muted">
            Фокус заперт внутри окна, Escape закрывает, скролл страницы заблокирован —
            всё это даёт Radix.
          </p>
        </DialogContent>
      </Dialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Панель справа</Button>
        </SheetTrigger>
        <SheetContent title="Фильтры" side="right">
          <p className="text-sm text-muted">
            На мобильном та же панель открывается снизу: side=&quot;bottom&quot;.
          </p>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Панель снизу</Button>
        </SheetTrigger>
        <SheetContent title="Фильтры" side="bottom">
          <p className="text-sm text-muted">
            Основной мобильный паттерн: большой палец достаёт до элементов.
          </p>
        </SheetContent>
      </Sheet>

      <Button variant="danger" onClick={() => setConfirmOpen(true)}>
        Подтверждение удаления
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title="Удалить из корзины?"
        description="Экземпляр вернётся в продажу и может быть куплен другим покупателем."
        confirmLabel="Удалить"
        onConfirm={async () => {
          // Имитация серверного действия: кнопка показывает спиннер.
          await new Promise((resolve) => setTimeout(resolve, 900));
          toast.success("Товар удалён из корзины");
        }}
      />
    </div>
  );
}
