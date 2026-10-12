"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FOOTER_NAV, MAIN_NAV } from "@/lib/constants/nav";
import { NavLink } from "./nav-link";

const ACCOUNT_GROUP = FOOTER_NAV.find((group) => group.title === "Аккаунт");

/**
 * Мобильная навигация в выезжающей панели.
 *
 * Полноценное меню, а не сжатый desktop-хедер: крупные зоны нажатия,
 * разделы каталога и аккаунта в одном списке.
 *
 * Закрытие при переходе отдано `SheetClose` — Radix закрывает панель по
 * клику. Синхронизировать состояние с pathname через эффект не нужно:
 * это вызывало бы лишний каскад рендеров.
 */
export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Открыть меню"
        className="-ml-2 flex size-11 items-center justify-center text-foreground md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.5} aria-hidden />
      </SheetTrigger>

      <SheetContent title="Навигация" hideTitle side="right">
        <nav className="flex flex-col">
          {MAIN_NAV.map((item) => (
            <SheetClose key={item.href} asChild>
              <NavLink
                href={item.href}
                className="border-b border-border py-4 font-display text-2xl font-medium"
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>

        {ACCOUNT_GROUP ? (
          <div className="mt-8 flex flex-col gap-3">
            <p className="eyebrow">{ACCOUNT_GROUP.title}</p>
            {ACCOUNT_GROUP.links.map((link) => (
              <SheetClose key={link.href} asChild>
                <Link
                  href={link.href}
                  className="py-1 text-sm text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
