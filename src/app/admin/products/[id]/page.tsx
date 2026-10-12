import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { UnitManager } from "@/components/admin/unit-manager";
import { Badge } from "@/components/ui/badge";
import {
  getProductForAdmin,
  listBrandOptions,
  listCategoryOptions,
} from "@/server/services/admin";

export async function generateMetadata({
  params,
}: PageProps<"/admin/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForAdmin(id);

  if (!product) notFound();

  return { title: product.name, robots: { index: false } };
}

export default async function AdminProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    getProductForAdmin(id),
    listBrandOptions(),
    listCategoryOptions(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-xs text-subtle hover:text-foreground"
      >
        ← Все товары
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-headline font-medium">{product.name}</h1>
          <p className="mt-1 font-mono text-xs text-subtle">
            {product.sku} · {product.slug}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {product.status === "active" ? (
            <Link
              href={`/product/${product.slug}`}
              className="text-sm text-muted hover:text-foreground"
              target="_blank"
            >
              Открыть на сайте ↗
            </Link>
          ) : null}
          <Badge variant={product.status === "active" ? "success" : "neutral"}>
            {product.status === "active"
              ? "В продаже"
              : product.status === "draft"
                ? "Черновик"
                : "Архив"}
          </Badge>
        </div>
      </div>

      <div className="mt-10 max-w-3xl">
        <ProductForm
          brands={brands}
          categories={categories}
          product={{
            id: product.id,
            slug: product.slug,
            sku: product.sku,
            name: product.name,
            reference: product.reference,
            brandId: product.brandId,
            categoryId: product.categoryId,
            kind: product.kind,
            status: product.status,
            condition: product.condition,
            vatScheme: product.vatScheme,
            shortDescription: product.shortDescription,
            description: product.description,
            priceCents: product.priceCents,
            compareAtPriceCents: product.compareAtPriceCents,
            isFeatured: product.isFeatured,
            specs: product.specs,
            inventory: product.inventory
              ? {
                  quantity: product.inventory.quantity,
                  lowStockThreshold: product.inventory.lowStockThreshold,
                }
              : null,
          }}
        />
      </div>

      <section className="mt-14 border-t border-border pt-10">
        <h2 className="eyebrow">Фотографии</h2>
        <div className="mt-6 max-w-3xl">
          <ImageManager productId={product.id} images={product.images} />
        </div>
      </section>

      {product.kind === "serialized" ? (
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="eyebrow">Экземпляры</h2>
          <p className="mt-2 text-xs text-subtle">
            У каждого экземпляра своя цена, год и комплектность. Количество доступных
            экземпляров автоматически попадает в наличие товара.
          </p>
          <div className="mt-6">
            <UnitManager
              productId={product.id}
              units={product.units}
              productVatScheme={product.vatScheme}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
