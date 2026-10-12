import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Регистрация",
  robots: { index: false },
};

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <div className="card-surface p-8">
      <h1 className="font-display text-3xl font-medium">Регистрация</h1>
      <p className="mt-3 text-sm text-muted">
        Аккаунт хранит историю заказов, документы и адреса доставки. Оформить заказ
        можно и без регистрации.
      </p>

      <div className="mt-8">
        <SignUpForm />
      </div>
    </div>
  );
}
