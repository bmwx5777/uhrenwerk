import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/*
 * Границы полей светлее декоративных разделителей: WCAG 1.4.11 требует
 * 3:1 для границ элементов управления, иначе на тёмном фоне поле ввода
 * почти не видно. Подложка поля тоже на тон светлее страницы — так
 * форма читается как форма без дополнительных рамок.
 */
const CONTROL_CLASSES =
  "w-full rounded-md border border-border-control bg-surface-muted px-4 text-sm " +
  "text-foreground placeholder:text-subtle transition-colors duration-200 " +
  "hover:border-border-hover focus:border-accent focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-danger-600";

export function Input({
  className,
  type = "text",
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input type={type} className={cn(CONTROL_CLASSES, "h-12", className)} {...props} />
  );
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(CONTROL_CLASSES, "resize-y py-3", className)}
      {...props}
    />
  );
}
