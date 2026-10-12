"use client";

import Link from "next/link";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/server/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  const { formAction, isPending, fieldError } = useFormAction(signInAction);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email" error={fieldError("email")} required>
        {(control) => (
          <Input type="email" name="email" autoComplete="email" required {...control} />
        )}
      </Field>

      <Field label="Пароль" error={fieldError("password")} required>
        {(control) => (
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            {...control}
          />
        )}
      </Field>

      <Button type="submit" isPending={isPending} className="mt-2 w-full">
        Войти
      </Button>

      <div className="flex flex-col gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-foreground">
          Забыли пароль?
        </Link>
        <p className="text-muted">
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="text-foreground hover:text-accent-text">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </form>
  );
}
