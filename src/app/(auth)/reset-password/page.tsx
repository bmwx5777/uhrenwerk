import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Новый пароль",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;

  // Better Auth присылает token в ссылке из письма. Без него форму
  // показывать нечему: пароль менять некому.
  if (!tokenParam) {
    return (
      <div className="card-surface p-8">
        <h1 className="font-display text-3xl font-medium">Ссылка не работает</h1>
        <p className="mt-3 text-sm text-muted">
          Похоже, ссылка повреждена или уже использована. Запросите новую — прежний
          пароль пока действует.
        </p>
        <Button asChild variant="secondary" className="mt-8 w-full">
          <Link href="/forgot-password">Запросить новую ссылку</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="card-surface p-8">
      <h1 className="font-display text-3xl font-medium">Новый пароль</h1>
      <p className="mt-3 text-sm text-muted">
        Придумайте пароль не короче 10 символов. После сохранения мы завершим все
        остальные сессии.
      </p>

      <div className="mt-8">
        <ResetPasswordForm token={tokenParam} />
      </div>
    </div>
  );
}
