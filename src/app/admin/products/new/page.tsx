import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";
import { listBrandOptions, listCategoryOptions } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Новый товар",
  robots: { index: false },
};

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
    listBrandOptions(),
    listCategoryOptions(),
  ]);

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-xs text-subtle hover:text-foreground"
      >
        ← Все товары
      </Link>
      <h1 className="mt-4 font-display text-headline font-medium">Новый товар</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Сохраните товар — и сразу откроется его страница с загрузкой фотографий. Для
        pre-owned там же добавляются конкретные экземпляры с их ценами и состоянием.
      </p>
      <p className="mt-2 max-w-xl text-xs text-subtle">
        Фотографии нельзя приложить до сохранения: изображение привязывается к товару, а
        товара ещё нет.
      </p>

      <div className="mt-8 max-w-3xl">
        <ProductForm brands={brands} categories={categories} />
      </div>
    </div>
  );
}
