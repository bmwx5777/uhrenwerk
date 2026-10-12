import { BadgeCheck, ChevronRight, PackageCheck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Price } from "@/components/product/price";
import { ProductGallery } from "@/components/product/product-gallery";
import { PaymentMethods } from "@/components/payment/payment-methods";
import { ProductGrid } from "@/components/product/product-grid";
import {
  ProductSpecHighlights,
  ProductSpecsList,
} from "@/components/product/product-specs";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { breadcrumbJsonLd, productJsonLd } from "@/components/seo/json-ld";
import { UnitSelector } from "@/components/product/unit-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { getProductBySlug, getRelatedProducts } from "@/server/services/catalog";
import { getWishlistProductIds } from "@/server/services/wishlist";

const CONDITION_LABELS = {
  new: "Новые",
  unworn: "Неношеные",
  pre_owned: "Pre-owned",
} as const;

/** Обещания магазина, одинаковые для любого товара. */
const ASSURANCES = [
  { icon: BadgeCheck, text: "Проверено часовщиком" },
  { icon: ShieldCheck, text: "Гарантия 24 месяца" },
  { icon: PackageCheck, text: "Страховая доставка" },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // notFound() именно здесь: метаданные считаются до начала стриминга,
  // поэтому страница отдаётся с кодом 404. Если полагаться только на
  // проверку в компоненте, Next уже отправил бы заголовки со статусом 200
  // (из-за loading.tsx ответ начинает стримиться сразу) — и поисковики
  // получили бы «мягкий 404».
  if (!product) notFound();

  const title = `${product.brand.name} ${product.name}`;
  const image = product.images[0]?.url;

  return {
    title,
    alternates: { canonical: `/product/${product.slug}` },
    description:
      product.shortDescription ??
      `${title}${product.reference ? ` (${product.reference})` : ""} — в наличии в UHRENWERK.`,
    openGraph: {
      title,
      description: product.shortDescription ?? undefined,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [product, wishlistProductIds] = await Promise.all([
    getProductBySlug(slug),
    getWishlistProductIds(),
  ]);

  if (!product) notFound();

  // Запрашивается после проверки: для несуществующего товара подборка
  // не нужна, а «похожие» без опорного товара не имеют смысла.
  const related = await getRelatedProducts({
    id: product.id,
    brandId: product.brand.id,
    categoryId: product.category.id,
  });

  const inWishlist = wishlistProductIds.has(product.id);
  const isSerialized = product.kind === "serialized";
  const soldOut = product.availableCount === 0;
  const lowestUnitPrice = product.units[0]?.priceCents ?? null;
  const priceCents = isSerialized ? lowestUnitPrice : product.priceCents;

  return (
    <div className="container-page mx-auto max-w-6xl py-6 md:py-10">
      <JsonLdScript
        data={productJsonLd({
          slug: product.slug,
          name: product.name,
          brandName: product.brand.name,
          description: product.shortDescription ?? product.description,
          reference: product.reference,
          sku: product.sku,
          imageUrls: product.images.map((image) => image.url),
          netPriceCents: priceCents,
          vatScheme: product.vatScheme,
          condition: product.condition,
          availableCount: product.availableCount,
        })}
      />
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Каталог", path: "/catalog" },
          { name: product.brand.name, path: `/brands/${product.brand.slug}` },
          { name: product.name, path: `/product/${product.slug}` },
        ])}
      />

      <nav aria-label="Навигация по каталогу" className="text-xs">
        <ol className="flex flex-wrap items-center gap-1.5 text-subtle">
          <li>
            <Link href="/catalog" className="transition-colors hover:text-foreground">
              Каталог
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li>
            <Link
              href={`/brands/${product.brand.slug}`}
              className="transition-colors hover:text-foreground"
            >
              {product.brand.name}
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li className="text-muted">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[28rem_minmax(0,1fr)] xl:gap-16">
        {/* Галерея остаётся на месте, пока прокручивается колонка покупки. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            images={product.images}
            title={`${product.brand.name} ${product.name}`}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.condition === "pre_owned" ? "outline" : "accent"}>
              {CONDITION_LABELS[product.condition]}
            </Badge>
            {soldOut ? <Badge variant="danger">Продано</Badge> : null}
            {!soldOut && isSerialized && product.availableCount === 1 ? (
              <Badge variant="warning">Последний экземпляр</Badge>
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="eyebrow">{product.brand.name}</span>
            <span className="rule-fade flex-1" aria-hidden />
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight font-medium md:text-[2.75rem]">
            {product.name}
          </h1>
          {product.reference ? (
            <p className="mt-3 font-mono text-xs tracking-[0.12em] text-subtle uppercase">
              Референс · {product.reference}
            </p>
          ) : null}

          {/*
           * Цена отбита линиями, а не подложкой: карточка внутри карточки
           * дробила бы колонку, а главное число должно стоять в воздухе.
           */}
          <div className="mt-7 border-y border-border py-6">
            <Price
              size="lg"
              netCents={priceCents}
              vatScheme={product.vatScheme}
              compareAtNetCents={product.compareAtPriceCents}
              from={isSerialized && product.availableCount > 1}
              showTaxNote
            />
          </div>

          {product.shortDescription ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-8">
            {soldOut ? (
              <div className="card-surface p-5">
                <p className="text-sm">
                  Этот экземпляр продан. Напишите нам — сообщим, когда появится похожая
                  модель.
                </p>
                <Button asChild variant="secondary" className="mt-4 w-full">
                  <Link href="/catalog">Смотреть похожие</Link>
                </Button>
              </div>
            ) : isSerialized ? (
              <UnitSelector
                productId={product.id}
                units={product.units}
                productVatScheme={product.vatScheme}
              />
            ) : (
              <div>
                <p className="text-sm text-success-600">
                  В наличии: {product.availableCount}
                  {product.availableCount <= 2 ? " — осталось мало" : ""}
                </p>
                <AddToCartButton className="mt-5 w-full" productId={product.id} />
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <WishlistButton
                productId={product.id}
                initialInWishlist={inWishlist}
                variant="inline"
                className="-ml-3"
              />
              <span className="text-sm text-muted">
                {inWishlist ? "В избранном" : "Сохранить в избранное"}
              </span>
            </div>
          </div>

          <PaymentMethods className="mt-9 border-t border-border pt-7" />

          <ul className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
            {ASSURANCES.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5 text-xs">
                <item.icon
                  className="size-4 shrink-0 text-accent-text"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="text-muted">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!soldOut ? (
        <StickyBuyBar
          productId={product.id}
          productUnitId={isSerialized ? (product.units[0]?.id ?? undefined) : undefined}
          netPriceCents={priceCents}
          vatScheme={product.vatScheme}
          name={`${product.brand.name} ${product.name}`}
        />
      ) : null}

      {/*
       * Нижний блок во всю ширину. Раньше здесь были две колонки:
       * короткое описание слева и длинный столбец характеристик справа —
       * половина экрана оставалась пустой. Теперь сначала четыре главные
       * характеристики плитками, затем описание и остальная таблица.
       */}
      <div className="rule-indices mt-16" aria-hidden />

      <section className="mt-12 pb-20 md:pb-0">
        <div className="flex items-baseline gap-4">
          <span className="section-index">01</span>
          <h2 className="eyebrow">Характеристики</h2>
        </div>

        <ProductSpecHighlights className="mt-5" specs={product.specs} />

        {/* Без описания вторая колонка была бы пустой — сетка складывается. */}
        <div
          className={
            product.description
              ? "mt-10 grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-14"
              : "mt-10"
          }
        >
          {product.description ? (
            <div>
              <h3 className="font-display text-xl font-medium">Об этой модели</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {product.description}
              </p>
            </div>
          ) : null}

          <ProductSpecsList specs={product.specs} />
        </div>
      </section>

      {related.length > 0 ? (
        <>
          <div className="rule-indices mt-16" aria-hidden />

          <section className="mt-12 pb-20 md:pb-0">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="section-index">02</span>
                  <h2 className="eyebrow">Похожие модели</h2>
                </div>
                <p className="mt-4 font-display text-2xl font-medium md:text-3xl">
                  Из той же витрины
                </p>
              </div>
              <Link
                href="/catalog"
                className="hidden items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-text md:flex"
              >
                Весь каталог
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ProductGrid className="mt-9" items={related} columns={4} />
          </section>
        </>
      ) : null}
    </div>
  );
}
