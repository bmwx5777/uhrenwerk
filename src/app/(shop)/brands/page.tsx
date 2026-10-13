import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { listBrandsWithCounts } from "@/server/services/catalog";

export const metadata: Metadata = {
  alternates: { canonical: "/brands" },
  title: "Бренды",
  description:
    "Мануфактуры в каталоге UHRENWERK: Rolex, Omega, Grand Seiko, Jaeger-LeCoultre, Tudor и IWC. История марок и доступные модели с проверкой подлинности.",
};

const COUNTRY_LABELS: Record<string, string> = {
  CH: "Швейцария",
  JP: "Япония",
  DE: "Германия",
  FR: "Франция",
  IT: "Италия",
};

export default async function BrandsPage() {
  const brands = await listBrandsWithCounts();
  const inStock = brands.reduce((sum, item) => sum + item.productCount, 0);

  return (
    <div className="container-page py-10 md:py-16">
      <div className="border-b border-border pb-10">
        <div className="flex items-baseline gap-4">
          <span className="section-index">01</span>
          <p className="eyebrow">Мануфактуры</p>
        </div>
        <h1 className="mt-5 font-display text-headline font-medium">Бренды</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
          Мы работаем с мануфактурами, у которых есть собственное производство калибров
          и прослеживаемая история. {brands.length} марки, {inStock} экземпляров в
          наличии.
        </p>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brandItem, index) => {
          const soldOut = brandItem.productCount === 0;

          return (
            <li key={brandItem.id}>
              <Link
                href={`/brands/${brandItem.slug}`}
                className="card-surface card-interactive group relative flex h-full flex-col overflow-hidden p-7"
              >
                {/*
                 * Монограмма — первая буква марки крупной антиквой.
                 * Логотипов у нас нет и быть не может (это чужие товарные
                 * знаки), а карточке нужен визуальный якорь.
                 */}
                <span
                  className="pointer-events-none absolute -top-6 -right-3 font-display text-[7rem] leading-none font-medium text-accent/8 transition-colors duration-500 group-hover:text-accent/14"
                  aria-hidden
                >
                  {brandItem.name.charAt(0)}
                </span>

                <span className="section-index relative">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h2 className="relative mt-4 font-display text-2xl font-medium transition-colors group-hover:text-accent-text">
                  {brandItem.name}
                </h2>

                <p className="relative mt-2 font-mono text-[0.6875rem] tracking-wide text-subtle">
                  {[
                    brandItem.countryCode
                      ? (COUNTRY_LABELS[brandItem.countryCode] ?? brandItem.countryCode)
                      : null,
                    brandItem.foundedYear ? `с ${brandItem.foundedYear}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <div className="rule-fade relative mt-5" aria-hidden />

                {brandItem.description ? (
                  <p className="relative mt-5 flex-1 text-sm leading-relaxed text-muted">
                    {brandItem.description}
                  </p>
                ) : (
                  <span className="flex-1" />
                )}

                <span className="relative mt-7 flex items-center justify-between gap-3">
                  <span
                    className={
                      soldOut
                        ? "text-xs text-subtle"
                        : "text-xs tracking-[0.12em] text-accent-text uppercase"
                    }
                  >
                    {soldOut ? "Нет в наличии" : `${brandItem.productCount} в наличии`}
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-subtle transition-colors group-hover:text-accent-text"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
