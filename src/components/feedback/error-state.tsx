import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  /** Техническая деталь (digest ошибки). Показываем, но мелко и без паники. */
  detail?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Состояние ошибки для блока или страницы.
 *
 * Текст сообщения всегда человеческий: пользователю не нужен stack trace,
 * ему нужно понять, что произошло и что делать. Технические детали —
 * в логах сервера, здесь только digest для обращения в поддержку.
 */
export function ErrorState({
  title = "Что-то пошло не так",
  description = "Мы не смогли загрузить этот раздел. Попробуйте обновить страницу — или напишите нам, если ошибка повторится.",
  detail,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "card-surface flex flex-col items-center px-6 py-16 text-center md:py-24",
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        className="mb-6 size-8 text-danger-600"
        strokeWidth={1.25}
        aria-hidden
      />

      <h2 className="font-display text-2xl font-medium md:text-3xl">{title}</h2>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>

      {action ? <div className="mt-8">{action}</div> : null}

      {detail ? <p className="mt-8 font-mono text-xs text-subtle">{detail}</p> : null}
    </div>
  );
}
