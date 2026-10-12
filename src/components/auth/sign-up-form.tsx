"use client";

import Link from "next/link";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm({ next }: { next?: string }) {
  const { formAction, isPending, fieldError } = useFormAction(signUpAction);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Имя" error={fieldError("name")} required>
        {(control) => <Input name="name" autoComplete="name" required {...control} />}
      </Field>

      <Field label="Email" error={fieldError("email")} required>
        {(control) => (
          <Input type="email" name="email" autoComplete="email" required {...control} />
        )}
      </Field>

      <Field
        label="Пароль"
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

      <Button type="submit" isPending={isPending} className="mt-2 w-full">
        Создать аккаунт
      </Button>

      <p className="text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/sign-in" className="text-foreground hover:text-accent-text">
          Войти
        </Link>
      </p>

      <p className="text-xs leading-relaxed text-subtle">
        Создавая аккаунт, вы соглашаетесь с{" "}
        <Link href="/terms" className="underline">
          условиями продажи
        </Link>{" "}
        и{" "}
        <Link href="/privacy" className="underline">
          политикой конфиденциальности
        </Link>
        .
      </p>
    </form>
  );
}
