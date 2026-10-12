"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { OVERLAY_CLASSES } from "./dialog";

/**
 * Выезжающая панель. На мобильном это основной паттерн вместо модалки:
 * фильтры, навигация и корзина открываются снизу (`side="bottom"`),
 * на десктопе — справа.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type SheetSide = "right" | "bottom";

const SIDE_CLASSES: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-dvh w-full max-w-sm border-l " +
    "shadow-2xl " +
    "data-[state=open]:animate-sheet-right-in data-[state=closed]:animate-sheet-right-out",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-xl border-t " +
    "shadow-2xl " +
    "data-[state=open]:animate-sheet-bottom-in data-[state=closed]:animate-sheet-bottom-out",
};

type SheetContentProps = Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  "title"
> & {
  title: string;
  description?: string;
  hideTitle?: boolean;
  side?: SheetSide;
};

export function SheetContent({
  title,
  description,
  hideTitle = false,
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY_CLASSES} />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col border-border-strong bg-surface-muted",
          SIDE_CLASSES[side],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-6 border-b border-border p-5 md:p-6">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title
              className={cn(
                "text-sm tracking-[0.18em] uppercase",
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
            className="-mt-1 -mr-1 p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 md:p-6">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
