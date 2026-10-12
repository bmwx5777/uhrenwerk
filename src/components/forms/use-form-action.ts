"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { FormState } from "@/server/actions/form-state";

/**
 * Действие формы. Обобщено по типу результата: некоторые действия
 * возвращают не только статус и сообщение, но и данные — например,
 * найденный заказ. Клиент получает их типизированными, без приведений.
 */
type ServerFormAction<TState extends FormState> = (
  state: TState | null,
  formData: FormData,
) => Promise<TState>;

/**
 * Связка формы с серверным действием.
 *
 * Делает три вещи, которые иначе пришлось бы повторять в каждой форме:
 * показывает toast по результату, не повторяет один и тот же toast дважды
 * (сравнивает метку времени `at`) и отдаёт ошибки по полям.
 */
export function useFormAction<TState extends FormState>(
  action: ServerFormAction<TState>,
  options: { resetOnSuccess?: boolean } = {},
) {
  const [state, formAction, isPending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastShownAt = useRef(0);

  useEffect(() => {
    if (!state || state.at === lastShownAt.current) return;
    lastShownAt.current = state.at;

    if (state.status === "ok") {
      toast.success(state.message);
      if (options.resetOnSuccess) formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state, options.resetOnSuccess]);

  return {
    state,
    formAction,
    isPending,
    formRef,
    fieldError: (name: string) => state?.fieldErrors?.[name],
  };
}
