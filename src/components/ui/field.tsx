import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Атрибуты, которые Field передаёт в поле ввода — связывают label, подсказку и ошибку. */
export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
};

type FieldProps = {
  label: string;
  /** Текст-подсказка под полем. Скрывается, когда есть ошибка. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Обёртка поля формы: label, подсказка, сообщение об ошибке и их связь
 * через aria-атрибуты. Поле получает атрибуты через render-prop —
 * никакой магии с клонированием элементов.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showHint = Boolean(hint) && !error;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        {required ? (
          <span className="text-danger-600" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </label>

      {children({
        id,
        "aria-describedby": error ? errorId : showHint ? hintId : undefined,
        "aria-invalid": error ? true : undefined,
      })}

      {showHint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
