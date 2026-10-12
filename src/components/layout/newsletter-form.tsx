"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToNewsletter } from "@/server/actions/newsletter";

/**
 * Форма подписки. Серверное действие возвращает результат,
 * а toast показывает уже клиент — так уведомление не теряется
 * и не дублируется при повторной отправке (сравниваем `at`).
 */
export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeToNewsletter, null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastShownAt = useRef(0);

  useEffect(() => {
    if (!state || state.at === lastShownAt.current) return;
    lastShownAt.current = state.at;

    if (state.status === "ok") {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row">
      <input type="hidden" name="source" value="footer" />
      <Input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="Ваш email"
        aria-label="Email для подписки на рассылку"
        className="sm:max-w-xs"
      />
      <Button type="submit" isPending={isPending}>
        Подписаться
      </Button>
    </form>
  );
}
