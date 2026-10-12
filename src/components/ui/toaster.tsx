"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast-уведомления. Монтируется один раз в корневом layout.
 *
 * Вызов: `import { toast } from "sonner"` в клиентском компоненте.
 * Серверные действия возвращают результат, а toast показывает вызывающий
 * клиентский компонент — так уведомление не теряется при редиректе.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={4500}
      gap={10}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-lg border border-border-strong " +
            "bg-surface-raised px-4 py-3.5 text-sm text-foreground " +
            "shadow-xl",
          title: "text-sm leading-snug",
          description: "mt-0.5 text-xs text-muted",
          actionButton: "ml-auto text-xs font-medium text-accent-text hover:underline",
          cancelButton: "text-xs text-muted",
          icon: "shrink-0",
          success: "border-success-600/30",
          error: "border-danger-600/40",
          warning: "border-warning-600/40",
        },
      }}
    />
  );
}
