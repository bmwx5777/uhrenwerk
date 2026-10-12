"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Модальное окно на Radix: фокус-трап, блокировка скролла, Escape и
 * корректные aria-атрибуты — писать это вручную дороже, чем взять примитив.
 *
 * Заголовок обязателен: без него скринридер объявляет пустой диалог.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// Затемнение позади модалки остаётся тёмным и в светлой теме — так
// принято, и только так окно читается как слой поверх страницы.
export const OVERLAY_CLASSES =
  "fixed inset-0 z-50 bg-ink-950/75 backdrop-blur-sm " +
  "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out";

type DialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  "title"
> & {
  title: string;
  description?: string;
  /** Скрывает заголовок визуально, оставляя его для скринридеров. */
  hideTitle?: boolean;
  footer?: ReactNode;
};

export function DialogContent({
  title,
  description,
  hideTitle = false,
  footer,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY_CLASSES} />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg rounded-lg",
          "border border-border-strong bg-surface-muted shadow-2xl",
          "-translate-x-1/2 -translate-y-1/2 p-6 md:p-8",
          "data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <DialogPrimitive.Title
              className={cn(
                "font-display text-2xl leading-tight font-medium",
                hideTitle && "sr-only",
              )}
            >
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          <DialogPrimitive.Close
            aria-label="Закрыть"
            className="-mt-1 -mr-1 rounded-sm p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </div>

        {children ? <div className="mt-6">{children}</div> : null}

        {footer ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
