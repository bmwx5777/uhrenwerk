import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

/*
 * Кнопки больше не капслоком: плотный сентенс-кейс с медиумом читается
 * лучше и выглядит современнее, а разрядка остаётся только у надзаголовков.
 * Скругление задаётся классом, а не базовым слоем CSS, потому что при
 * `asChild` кнопка рендерится как <a>, а не как <button>.
 */
const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-sm whitespace-nowrap " +
  "text-xs font-medium tracking-[0.1em] uppercase transition-colors duration-300 " +
  "ease-[var(--ease-lux)] disabled:pointer-events-none disabled:opacity-40 " +
  "aria-busy:pointer-events-none";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-inverse text-inverse-foreground hover:bg-inverse-hover",
  secondary:
    "border border-border-control bg-surface text-foreground " +
    "hover:border-border-hover hover:bg-surface-raised",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger-500 text-white hover:bg-danger-500/85",
  link: "px-0 text-foreground underline-offset-4 hover:text-accent-text hover:underline",
};

/*
 * Ссылка-кнопка набирается строчными: прописные уместны для действия,
 * но не для «подробнее о проверке» внутри текста.
 */
const CASE_OVERRIDES: Partial<Record<ButtonVariant, string>> = {
  link: "text-sm tracking-normal normal-case",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[0.6875rem]",
  md: "h-11 px-6",
  lg: "h-13 px-8 text-[0.8125rem]",
  icon: "size-11 px-0",
};

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Рендерит классы кнопки на дочернем элементе (например, на `<Link>`),
   * чтобы ссылка не оборачивалась в button — это ломает семантику и клавиатуру.
   */
  asChild?: boolean;
  /** Показывает спиннер, блокирует повторный клик и выставляет aria-busy. */
  isPending?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  isPending = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        CASE_OVERRIDES[variant],
        className,
      )}
      // Slot пробрасывает пропсы в дочерний элемент: type/disabled там не нужны.
      {...(asChild ? {} : { type, disabled: disabled || isPending })}
      aria-busy={isPending || undefined}
      {...props}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}
