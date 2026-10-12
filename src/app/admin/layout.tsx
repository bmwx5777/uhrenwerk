import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/server/auth/session";

/**
 * Layout админки.
 *
 * `requireAdmin()` — авторитетная проверка роли: `src/proxy.ts` смотрит
 * только на наличие cookie сессии и роль знать не может. Посторонний
 * получает 404, а не 403: ему не нужно знать, что по этому адресу
 * вообще что-то есть.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link
              href="/admin"
              className="font-display text-base font-medium tracking-[0.14em] uppercase"
            >
              Uhrenwerk
            </Link>
            <span className="eyebrow">админка</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{admin.email}</span>
            <Link href="/" className="text-muted hover:text-foreground">
              На сайт
            </Link>
          </div>
        </div>
      </header>

      <div className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <AdminNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
