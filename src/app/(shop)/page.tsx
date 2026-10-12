import {
  ArrowUpRight,
  BadgeCheck,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/product/product-grid";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { organizationJsonLd, websiteJsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getNewArrivals, listCategoriesWithCounts } from "@/server/services/catalog";

const GUARANTEES = [
  {
    icon: BadgeCheck,
    title: "Проверка подлинности",
    text: "Каждый экземпляр проходит часовщика перед продажей.",
  },
  {
    icon: ShieldCheck,
    title: "Гарантия 24 месяца",
    text: "На pre-owned — наша собственная, на новые — от мануфактуры.",
  },
  {
    icon: PackageCheck,
    title: "Страховая доставка",
    text: "Курьером с подписью получателя, по всему миру.",
  },
  {
    icon: RotateCcw,
    title: "Возврат 14 дней",
    text: "Без объяснения причин для покупателей из ЕС.",
  },
] as const;

/** Быстрые входы под героем: три способа начать выбор. */
const ENTRY_POINTS = [
  {
    href: "/catalog",
    title: "Весь каталог",
    text: "Новые и pre-owned в одной сетке",
  },
  { href: "/brands", title: "Бренды", text: "От мануфактур до независимых" },
  {
    href: "/search",
    title: "Подбор по параметрам",
    text: "Диаметр, механизм, цена",
  },
] as const;

/**
 * Данные каталога меняются вместе со складом, поэтому страница
 * перегенерируется не только при сборке.
 *
 * На этапе 10 (админка) это заменится адресной инвалидацией:
 * revalidateTag("catalog") при изменении товара — тогда обновление
 * будет мгновенным, а не по таймеру.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description:
    "Механические часы с проверкой подлинности: новые модели от мануфактур и отобранные pre-owned экземпляры. Гарантия 24 месяца, страховая доставка по миру.",
};

export default async function HomePage() {
  const [newArrivals, categories] = await Promise.all([
    getNewArrivals(4),
    listCategoriesWithCounts(),
  ]);

  const categoryTiles = categories
    .filter((category) => category.productCount > 0)
    .slice(0, 3);

  return (
    <>
      <JsonLdScript data={organizationJsonLd()} />
      <JsonLdScript data={websiteJsonLd()} />

      {/*
       * Герой собран как бенто-сетка: текстовый блок и визуал — равноправные
       * плитки, под ними три входа в каталог. На мобильном плитки встают
       * в столбец в том же порядке, в котором их читают.
       */}
      <section className="container-page py-10 md:py-16">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="card-surface relative animate-fade-up overflow-hidden p-7 sm:p-10 lg:col-span-7 lg:p-14">
            {/* Декоративное свечение в углу плитки. */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/12 blur-3xl"
              aria-hidden
            />

            <div className="relative">
              <p className="eyebrow">Коллекция 2026</p>
              <h1 className="mt-6 font-display text-display font-medium">
                Время, которое
                <br />
                <span className="text-accent-text">выбирают</span> однажды
              </h1>
              <p className="mt-7 max-w-md text-base leading-relaxed text-muted">
                Механика с историей: новые и pre-owned часы, проверенные часовщиком, с
                гарантией подлинности и доставкой по миру.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/catalog">Смотреть коллекцию</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/search">Подбор по параметрам</Link>
                </Button>
              </div>
            </div>
          </div>

          {/*
           * Обёртка без фона: свечение из `.halo` рисуется под
           * плиткой и выходит за её границы.
           */}
          <div className="halo lg:col-span-5">
            <div className="corner-marks hairline-frame card-surface relative aspect-4/5 overflow-hidden lg:aspect-auto lg:h-full">
              <div className="photo-surface absolute inset-0" aria-hidden />
              <span className="eyebrow absolute bottom-6 left-6">
                Фото модели · 4:5
              </span>
            </div>
          </div>

          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="card-surface card-interactive group flex items-start justify-between gap-4 p-6 lg:col-span-4"
            >
              <span>
                <span className="block font-medium -tracking-[0.015em]">
                  {entry.title}
                </span>
                <span className="mt-1 block text-sm text-subtle">{entry.text}</span>
              </span>
              <ArrowUpRight
                className="size-5 shrink-0 text-subtle transition-colors group-hover:text-accent-text"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="container-page">
        <div className="rule-indices" aria-hidden />
      </div>

      {newArrivals.length > 0 ? (
        <section className="container-page py-10 md:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-baseline gap-4">
                <span className="section-index">01</span>
                <p className="eyebrow">Витрина</p>
              </div>
              <h2 className="mt-4 font-display text-3xl font-medium md:text-4xl">
                Новые поступления
              </h2>
            </div>
            <Link
              href="/catalog"
              className="hidden items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground md:flex"
            >
              Все часы
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          <ProductGrid className="mt-10" items={newArrivals} columns={4} />

          <Button asChild variant="secondary" className="mt-10 w-full md:hidden">
            <Link href="/catalog">Все часы</Link>
          </Button>
        </section>
      ) : null}

      <section className="container-page py-10 md:py-16">
        <div className="card-surface grid gap-10 overflow-hidden p-7 sm:p-10 md:grid-cols-2 md:items-center md:gap-14 lg:p-14">
          <div
            className="photo-surface aspect-3/2 rounded-lg border border-border md:order-last"
            aria-hidden
          />
          <div>
            <div className="flex items-baseline gap-4">
              <span className="section-index">02</span>
              <p className="eyebrow">Как мы работаем</p>
            </div>
            <h2 className="mt-4 font-display text-3xl font-medium md:text-4xl">
              Подлинность, подтверждённая руками
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Pre-owned часы попадают в каталог только после полной проверки:
              соответствие компонентов заводскому референсу, точность хода на
              таймграфере, тест водозащиты, оценка состояния корпуса и браслета.
              Результат мы пишем в карточку экземпляра — вместе с годом выпуска и
              комплектностью.
            </p>
            <Button asChild variant="link" className="mt-6">
              <Link href="/about">Подробнее о проверке</Link>
            </Button>
          </div>
        </div>
      </section>

      {categoryTiles.length > 0 ? (
        <section className="container-page py-10 md:py-16">
          <div className="flex items-baseline gap-4">
            <span className="section-index">03</span>
            <p className="eyebrow">Категории</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {categoryTiles.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="card-surface card-interactive flex flex-col p-7"
              >
                <h3 className="font-display text-2xl font-medium">{category.name}</h3>
                {category.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {category.description}
                  </p>
                ) : null}
                <span className="mt-8 inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-text">
                  {category.productCount} в наличии
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-page py-10 md:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((item) => (
            <div key={item.title} className="card-surface p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-accent-soft">
                <item.icon
                  className="size-5 text-accent-text"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
              <h3 className="mt-5 text-sm font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
