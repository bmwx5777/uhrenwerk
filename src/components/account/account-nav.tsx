import { Settings } from "lucide-react";
import Link from "next/link";

import { NavLink } from "@/components/layout/nav-link";
import { SignOutButton } from "./sign-out-button";

const ACCOUNT_NAV = [
  { href: "/account", label: "Профиль" },
  { href: "/account/orders", label: "Заказы" },
  { href: "/account/addresses", label: "Адреса" },
] as const;

/**
 * Навигация кабинета. На мобильном — горизонтальная прокрутка вкладок,
 * на десктопе — колонка слева.
 *
 * Ссылка на админку показывается только администратору: роль приходит
 * из layout, который уже проверил сессию на сервере. Для покупателя
 * ссылки просто нет — как и самой админки, которая отдаёт ему 404.
 */
export function AccountNav({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <nav aria-label="Разделы кабинета">
      <ul className="-mx-5 flex gap-6 overflow-x-auto border-b border-border px-5 pb-3 lg:mx-0 lg:flex-col lg:gap-3 lg:border-none lg:px-0 lg:pb-0">
        {ACCOUNT_NAV.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink href={item.href} className="text-sm whitespace-nowrap">
              {item.label}
            </NavLink>
          </li>
        ))}

        {isAdmin ? (
          <li className="shrink-0 lg:mt-4 lg:border-t lg:border-border lg:pt-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm whitespace-nowrap text-muted transition-colors hover:text-foreground"
            >
              <Settings className="size-4" strokeWidth={1.5} aria-hidden />
              Админка
            </Link>
          </li>
        ) : null}
      </ul>

      <div className="mt-6 hidden lg:block">
        <SignOutButton />
      </div>
    </nav>
  );
}
