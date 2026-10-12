import { PackageOpen } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { ProductGrid } from "@/components/product/product-grid";
import { breadcrumbJsonLd } from "@/components/seo/json-ld";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { firstValue } from "@/lib/validation/catalog";
import { getBrandBySlug, listProducts } from "@/server/services/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const brandItem = await getBrandBySlug(slug);

  // Как и на странице товара: notFound() до стриминга даёт честный 404.
  if (!brandItem) notFound();

  return {
    title: brandItem.name,
    alternates: { canonical: `/brands/${brandItem.slug}` },
    description:
      brandItem.description ??
      `Часы ${brandItem.name} в наличии: новые и pre-owned модели с гарантией подлинности.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const rawParams = await searchParams;
  const pageParam = Number(firstValue(rawParams.page) ?? 1);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const brandItem = await getBrandBySlug(slug);
  if (!brandItem) notFound();

  const result = await listProducts({
    brandSlugs: [slug],
    sort: "newest",
    page,
  });

  return (
    <div className="container-page py-10 md:py-16">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Бренды", path: "/brands" },
          { name: brandItem.name, path: `/brands/${brandItem.slug}` },
        ])}
      />

      <nav aria-label="Навигация" className="text-xs text-subtle">
        <Link href="/brands" className="hover:text-foreground">
          Бренды
        </Link>
      </nav>

      <header className="mt-6 max-w-2xl">
        <h1 className="font-display text-headline font-medium">{brandItem.name}</h1>
        <p className="mt-2 text-xs text-subtle">
          {[
            brandItem.countryCode,
            brandItem.foundedYear ? `основан в ${brandItem.foundedYear}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {brandItem.description ? (
          <p className="mt-5 text-base leading-relaxed text-muted">
            {brandItem.description}
          </p>
        ) : null}
      </header>

      {result.items.length > 0 ? (
        <>
          <ProductGrid className="mt-12" items={result.items} columns={4} />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hrefForPage={(nextPage) =>
              (nextPage > 1
                ? `/brands/${slug}?page=${nextPage}`
                : `/brands/${slug}`) as Route
            }
          />
        </>
      ) : (
        <EmptyState
          className="mt-12"
          icon={PackageOpen}
          title={`Часов ${brandItem.name} сейчас нет в наличии`}
          description="Поступления бывают каждую неделю — подпишитесь на рассылку или посмотрите другие мануфактуры."
          action={
            <Button asChild variant="secondary">
              <Link href="/catalog">Весь каталог</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
