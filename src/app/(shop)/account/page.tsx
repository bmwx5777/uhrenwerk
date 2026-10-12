import type { Metadata } from "next";

import { EmailVerificationNotice } from "@/components/account/email-verification-notice";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false },
};

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser();
  const params = await searchParams;
  const justVerified = params.verified === "1";

  return (
    <div className="flex flex-col gap-8">
      {justVerified ? (
        <p className="border border-success-600/30 bg-success-600/5 p-4 text-sm text-success-600">
          Адрес подтверждён — теперь можно оформлять заказы.
        </p>
      ) : null}

      {!user.emailVerified ? <EmailVerificationNotice email={user.email} /> : null}

      <section>
        <h2 className="eyebrow">Личные данные</h2>
        <div className="mt-6">
          <ProfileForm name={user.name} phone={user.phone ?? null} email={user.email} />
        </div>
      </section>
    </div>
  );
}
