"use client";

import Link from "next/link";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const { formAction, isPending, fieldError, state } = useFormAction(
    requestPasswordResetAction,
    { resetOnSuccess: true },
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Email" error={fieldError("email")} required>
        {(control) => (
          <Input type="email" name="email" autoComplete="email" required {...control} />
        )}
      </Field>

      <Button type="submit" isPending={isPending} className="w-full">
        Отправить ссылку
      </Button>

      {state?.status === "ok" ? (
        <p className="text-sm text-success-600">{state.message}</p>
      ) : null}

      <Link href="/sign-in" className="text-sm text-muted hover:text-foreground">
        Вернуться к входу
      </Link>
    </form>
  );
}
