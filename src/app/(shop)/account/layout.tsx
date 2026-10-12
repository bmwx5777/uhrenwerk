import { AccountNav } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/account/sign-out-button";
import { requireUser } from "@/server/auth/session";

/**
 * Layout личного кабинета.
 *
 * Здесь происходит авторитетная проверка входа: middleware лишь смотрит
 * на наличие cookie, а подлинность сессии проверяется обращением к базе —
 * и только на сервере.
 */
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser();

  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow">Личный кабинет</p>
      <h1 className="mt-4 font-display text-headline font-medium">{user.name}</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <AccountNav isAdmin={user.role === "admin"} />
        <div className="min-w-0">{children}</div>
      </div>

      <div className="mt-12 border-t border-border pt-6 lg:hidden">
        <SignOutButton />
      </div>
    </div>
  );
}
