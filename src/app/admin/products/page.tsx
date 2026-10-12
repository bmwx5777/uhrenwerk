import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { grossEurFromNetCents } from "@/lib/pricing";
import { listProductsForAdmin } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Товары",
  robots: { index: false },
};

const STATUS_LABELS = {
  draft: { label: "Черновик", variant: "neutral" },
  active: { label: "В продаже", variant: "success" },
  archived: { label: "Архив", variant: "outline" },
} as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const params = await searchParams;
  const search = firstValue(params.q)?.trim();
  const statusParam = firstValue(params.status);
  const status =
    statusParam === "draft" || statusParam === "active" || statusParam === "archived"
      ? statusParam
      : undefined;

  const products = await listProductsForAdmin({ search, status });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-headline font-medium">Товары</h1>
        <Button asChild className="gap-2">
          <Link href="/admin/products/new">
            <Plus className="size-4" aria-hidden />
            Новый товар
          </Link>
        </Button>
      </div>

      {/* Обычная GET-форма: фильтр работает и без JavaScript. */}
      <form action="/admin/products" className="mt-6 flex flex-wrap gap-3">
        <Input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Название, артикул или slug"
          aria-label="Поиск товаров"
          className="sm:max-w-xs"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-12 rounded-md border border-border-control bg-surface-muted px-4 text-sm"
          aria-label="Статус"
        >
          <option value="">Все статусы</option>
          <option value="active">В продаже</option>
          <option value="draft">Черновики</option>
          <option value="archived">Архив</option>
        </select>
        <Button type="submit" variant="secondary">
          Найти
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">Найдено: {products.length}</p>

      <div className="card-surface mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs text-subtle uppercase">
            <tr>
              <th className="p-3 text-left font-normal">Товар</th>
              <th className="p-3 text-left font-normal">Бренд</th>
              <th className="p-3 text-right font-normal">Цена на витрине</th>
              <th className="p-3 text-left font-normal">Наличие</th>
              <th className="p-3 text-left font-normal">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((item) => {
              const statusMeta = STATUS_LABELS[item.status];

              return (
                <tr key={item.id} className="hover:bg-surface-muted/50">
                  <td className="p-3">
                    <Link
                      href={`/admin/products/${item.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                        <span className="block font-mono text-xs text-subtle">
                          {item.sku}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{item.brandName}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {item.priceCents
                      ? formatMoney(
                          Math.round(
                            grossEurFromNetCents(item.priceCents, item.vatScheme) * 100,
                          ),
                        )
                      : "от экземпляров"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted">
                    {item.kind === "serialized"
                      ? `${item.availableUnits} из ${item.totalUnits} экз.`
                      : `${item.stockQuantity - item.stockReserved} шт.` +
                        (item.stockReserved > 0
                          ? ` (резерв ${item.stockReserved})`
                          : "")}
                  </td>
                  <td className="p-3">
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
