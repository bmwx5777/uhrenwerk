import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="card-surface p-8">
      <h1 className="font-display text-3xl font-medium">Забыли пароль?</h1>
      <p className="mt-3 text-sm text-muted">
        Укажите адрес, на который зарегистрирован аккаунт. Пришлём ссылку для смены
        пароля — она действует один час.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
