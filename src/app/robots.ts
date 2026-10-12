import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/env/client";

/**
 * robots.txt.
 *
 * Закрываем от индексации всё, что бессмысленно в поиске и может
 * утечь в выдачу: корзину, оформление, кабинет, админку и служебные
 * маршруты. На страницах этих разделов стоит ещё и `robots: index: false`
 * в метаданных — одного файла мало, потому что по прямой ссылке
 * страница всё равно может попасть в индекс.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/account/",
          "/admin",
          "/admin/",
          "/cart",
          "/checkout",
          "/checkout/",
          "/wishlist",
          "/order-lookup",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/ui-kit",
          /*
           * Каталог с фильтрами намеренно НЕ закрыт здесь: он помечен
           * `noindex, follow` в метаданных, а закрытую в robots.txt
           * страницу поисковик не скачивает и эту пометку не прочитает.
           * Закрывать нужно то, что не должно попасть в индекс вообще,
           * а не то, что должно сообщить о себе «не индексируй».
           */
          "/search",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
