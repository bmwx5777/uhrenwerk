import { z } from "zod";

/**
 * Результат серверного действия для формы.
 *
 * `at` — метка времени: клиент по ней отличает новый ответ от предыдущего
 * и не показывает один и тот же toast дважды.
 */
export type FormState = {
  status: "ok" | "error";
  message: string;
  /** Ошибки по полям для показа рядом с конкретным input. */
  fieldErrors?: Record<string, string>;
  at: number;
};

/** Первая ошибка на каждое поле: в интерфейсе больше одной всё равно не нужно. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  // flattenError на обобщённом ZodError отдаёт {}; сужаем тип вручную.
  const flattened = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const result: Record<string, string> = {};

  for (const [field, messages] of Object.entries(flattened)) {
    const first = messages?.[0];
    if (first) result[field] = first;
  }

  return result;
}

export function formError(
  message: string,
  fieldErrors?: Record<string, string>,
): FormState {
  return {
    status: "error",
    message,
    at: Date.now(),
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function formOk(message: string): FormState {
  return { status: "ok", message, at: Date.now() };
}
