import { appUrl } from "@/lib/env/client";
import { displayPriceCents, type VatScheme } from "@/lib/pricing";

/**
 * Структурированные данные (schema.org).
 *
 * Это то, из чего поиск собирает карточку товара в выдаче: цена,
 * наличие, состояние. Данные обязаны совпадать с тем, что видно на
 * странице — расхождение считается нарушением и карточку отключают.
 * Поэтому цена берётся той же функцией, что и в интерфейсе.
 */

const ORGANIZATION_ID = `${appUrl}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "UHRENWERK",
    url: appUrl,
    description:
      "Магазин механических часов: новые и pre-owned модели с проверкой подлинности и доставкой по миру.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "CY",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: appUrl,
    name: "UHRENWERK",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${appUrl}${item.path}`,
    })),
  };
}

type ProductJsonLdInput = {
  slug: string;
  name: string;
  brandName: string;
  description: string | null;
  reference: string | null;
  sku: string;
  imageUrls: string[];
  netPriceCents: number | null;
  vatScheme: VatScheme;
  condition: "new" | "unworn" | "pre_owned";
  availableCount: number;
};

/** Состояние товара в терминах schema.org. */
const CONDITION_MAP = {
  new: "https://schema.org/NewCondition",
  unworn: "https://schema.org/NewCondition",
  pre_owned: "https://schema.org/UsedCondition",
} as const;

function priceValidUntil(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function productJsonLd(input: ProductJsonLdInput) {
  const priceCents =
    input.netPriceCents !== null
      ? displayPriceCents(input.netPriceCents, input.vatScheme)
      : null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${input.brandName} ${input.name}`,
    description: input.description ?? undefined,
    sku: input.sku,
    mpn: input.reference ?? undefined,
    brand: { "@type": "Brand", name: input.brandName },
    image: input.imageUrls.map((url) =>
      url.startsWith("http") ? url : `${appUrl}${url}`,
    ),
    offers: {
      "@type": "Offer",
      url: `${appUrl}/product/${input.slug}`,
      priceCurrency: "EUR",
      // Цена в разметке — с НДС, как на странице: расхождение
      // с видимой ценой поиск считает нарушением.
      price: priceCents !== null ? (priceCents / 100).toFixed(2) : undefined,
      itemCondition: CONDITION_MAP[input.condition],
      /*
       * Срок действия цены. Поле рекомендованное: без него проверка
       * расширенных результатов выдаёт предупреждение, а карточка
       * товара в выдаче может не собраться.
       *
       * Год вперёд — осознанное допущение: цены в каталоге меняются
       * редко, а страница перегенерируется по ревалидации, поэтому
       * дата не успевает устареть.
       */
      priceValidUntil: priceValidUntil(),
      availability:
        input.availableCount > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      seller: { "@id": ORGANIZATION_ID },
    },
  };
}
