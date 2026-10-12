import { BadgeCheck, PackageCheck, RotateCcw } from "lucide-react";
import Link from "next/link";

import { MAIN_NAV } from "@/lib/constants/nav";
import { listBrandsWithCounts } from "@/server/services/catalog";
import { BrandsMenu } from "./brands-menu";
import { HeaderActions } from "./header-actions";
import { HeaderSearch } from "./header-search";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";

/**
 * Обещания магазина строкой над шапкой. Те же три, что и на главной:
 * покупатель видит их до того, как откроет первый товар.
 */
const ASSURANCES = [
  { icon: BadgeCheck, text: "Проверка подлинности часовщиком" },
  { icon: PackageCheck, text: "Страховая доставка по миру" },
  { icon: RotateCcw, text: "Возврат 14 дней для ЕС" },
] as const;

/**
 * Шапка сайта. Серверный компонент: клиентские только мобильное меню,
 * поиск и блок иконок со счётчиками — им нужны состояние и сессия.
 *
 * Список брендов нужен и выпадающему меню, и подсказкам поиска. Запрос
 * обёрнут в `cache()`, поэтому страница каталога, которая просит тот же
 * список, не вызовет второго обращения к базе.
 */
export async function SiteHeader() {
  const brands = await listBrandsWithCounts();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      {/* Узкая полоса доверия. На мобильном помещается только первое обещание. */}
      <div className="border-b border-border/70 bg-surface-muted/40">
        <div className="container-page flex h-9 items-center justify-between gap-6">
          <ul className="flex items-center gap-7">
            {ASSURANCES.map((item, index) => (
              <li
                key={item.text}
                className={
                  index === 0
                    ? "flex items-center gap-2"
                    : "hidden items-center gap-2 md:flex"
                }
              >
                <item.icon
                  className="size-3.5 shrink-0 text-accent-text"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="text-[0.6875rem] tracking-[0.06em] text-muted">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>

          <p className="hidden font-mono text-[0.6875rem] tracking-[0.12em] text-subtle lg:block">
            EUR €
          </p>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-4 md:h-20 md:gap-8">
        <MobileNav />

        <Link href="/" className="group flex shrink-0 flex-col gap-1.5">
          <span className="font-display text-lg leading-none font-medium tracking-[0.22em] uppercase md:text-xl">
            Uhrenwerk
          </span>
          {/* Волосяная линия под знаком — подпись мастерской. */}
          <span
            className="h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-lux)] group-hover:scale-x-100"
            aria-hidden
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {MAIN_NAV.map((item) =>
            // Бренды разворачиваются списком мануфактур, остальные ведут прямо.
            item.href === "/brands" ? (
              <BrandsMenu key={item.href} brands={brands} />
            ) : (
              <NavLink key={item.href} href={item.href} className="text-sm">
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        {/*
         * Поиск занимает середину шапки и растягивается на свободное
         * место. На узких экранах его прячем: вместо поля остаётся
         * иконка в блоке действий, ведущая на страницу поиска.
         */}
        <HeaderSearch
          brands={brands}
          className="ml-auto hidden max-w-md flex-1 md:block"
        />

        <HeaderActions />
      </div>
    </header>
  );
}
