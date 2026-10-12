"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const { formAction, isPending, fieldError } = useFormAction(resetPasswordAction);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <Field
        label="Новый пароль"
        hint="Минимум 10 символов"
        error={fieldError("password")}
        required
      >
        {(control) => (
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
            {...control}
          />
        )}
      </Field>

      <Button type="submit" isPending={isPending} className="w-full">
        Сохранить пароль
      </Button>
    </form>
  );
}
