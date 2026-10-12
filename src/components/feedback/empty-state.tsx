import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Кнопка или ссылка, которая выводит пользователя из пустого состояния. */
  action?: ReactNode;
  className?: string;
};

/**
 * Пустое состояние: не «ничего не найдено», а подсказка, что делать дальше.
 * Поэтому `action` — почти обязательный параметр по смыслу.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center border border-dashed border-border px-6 py-16 text-center md:py-24",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mb-6 size-8 text-subtle" strokeWidth={1.25} aria-hidden />
      ) : null}

      <h2 className="font-display text-2xl font-medium md:text-3xl">{title}</h2>

      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
