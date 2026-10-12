import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false },
};

/** Внутренний адрес возврата; «//evil.com» браузер считает внешним. */
function safeNext(value: string | string[] | undefined): string | undefined {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNext(params.next);

  // Вошедшему человеку форма входа не нужна.
  const user = await getCurrentUser();
  // Приведение к Route: адрес возврата известен только во время выполнения,
  // но уже проверен функцией safeNext выше.
  if (user) redirect((next ?? "/account") as Route);

  const justReset = params.reset === "1";

  return (
    <div className="card-surface p-8">
      <h1 className="font-display text-3xl font-medium">Вход</h1>

      {justReset ? (
        <p className="mt-4 text-sm text-success-600">
          Пароль изменён — войдите с новым паролем.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Войдите, чтобы видеть историю заказов и сохранённые адреса.
        </p>
      )}

      <div className="mt-8">
        <SignInForm next={next} />
      </div>
    </div>
  );
}
