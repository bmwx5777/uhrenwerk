import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "outline";

/*
 * На тёмном фоне плашки строятся наоборот, чем на светлом: подложка —
 * сильно затемнённый тон самого цвета, текст — его светлый вариант.
 * Контраст каждой пары проверен на её собственной подложке, а не на
 * фоне страницы.
 */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-surface-raised text-muted",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-600/15 text-success-600",
  warning: "bg-warning-600/15 text-warning-700",
  danger: "bg-danger-100 text-danger-600",
  outline: "border border-border-strong text-muted",
};

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-[0.625rem] font-medium tracking-[0.16em] uppercase",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
