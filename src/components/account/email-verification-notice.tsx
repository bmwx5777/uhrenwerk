"use client";

import { MailWarning } from "lucide-react";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { resendVerificationEmailAction } from "@/server/actions/auth";

/**
 * Напоминание подтвердить адрес.
 *
 * Вход мы не блокируем — человек может смотреть каталог и собирать
 * корзину. Но перед оформлением заказа (этап 7) подтверждённый адрес
 * обязателен: иначе некуда отправить документы и статусы.
 */
export function EmailVerificationNotice({ email }: { email: string }) {
  const { formAction, isPending } = useFormAction(resendVerificationEmailAction);

  return (
    <div className="flex flex-col gap-4 border border-warning-600/40 bg-warning-600/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <MailWarning
          className="size-5 shrink-0 text-warning-600"
          strokeWidth={1.5}
          aria-hidden
        />
        <div>
          <p className="text-sm">Адрес не подтверждён</p>
          <p className="mt-1 text-sm text-muted">
            Мы отправили письмо на {email}. Подтверждение потребуется при оформлении
            заказа.
          </p>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="secondary" size="sm" isPending={isPending}>
          Отправить снова
        </Button>
      </form>
    </div>
  );
}
