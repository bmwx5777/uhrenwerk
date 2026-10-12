import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/env/client";
import {
  listBrandsWithCounts,
  listProductsForSitemap,
} from "@/server/services/catalog";

/**
 * Карта сайта из базы.
 *
 * Товары и бренды берутся запросом, а не перечисляются руками: добавили
 * часы в админке — они появились в карте. `lastModified` у товара — дата
 * изменения, по ней поисковик понимает, что стоит переобойти.
 */
export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/catalog", priority: 0.9, changeFrequency: "daily" },
  { path: "/brands", priority: 0.7, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.4, changeFrequency: "monthly" },
  { path: "/returns", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Берём с запасом: при росте каталога понадобится разбивка на части
  // (лимит одного файла — 50 000 адресов).
  const [products, brands] = await Promise.all([
    listProductsForSitemap(),
    listBrandsWithCounts(),
  ]);

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${appUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productEntries = products.map((item) => ({
    url: `${appUrl}/product/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const brandEntries = brands
    .filter((brand) => brand.productCount > 0)
    .map((brand) => ({
      url: `${appUrl}/brands/${brand.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...productEntries, ...brandEntries];
}
