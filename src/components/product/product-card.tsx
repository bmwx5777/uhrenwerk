import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import type { ProductListItem } from "@/server/services/catalog";
import { Price } from "./price";

const NEW_ARRIVAL_DAYS = 30;

function isNewArrival(publishedAt: Date | null): boolean {
  if (!publishedAt) return false;
  const ageMs = Date.now() - publishedAt.getTime();
  return ageMs < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Карточка товара в сетке.
 *
 * Вся карточка — одна ссылка: так проще попасть пальцем на мобильном,
 * и не возникает вложенных интерактивных элементов. Кнопка «в избранное»
 * появится здесь на этапе 6 — поверх ссылки, отдельной кнопкой.
 */
export function ProductCard({ item }: { item: ProductListItem }) {
  const soldOut = item.availableCount === 0;
  const lastOne = item.kind === "serialized" && item.availableCount === 1;
  const multipleUnits = item.kind === "serialized" && item.availableCount > 1;

  return (
    <article className="group relative">
      {/* Кнопка вне ссылки: вложенные интерактивные элементы ломают клавиатуру. */}
      <div className="absolute top-4 left-4 z-10">
        <WishlistButton productId={item.id} />
      </div>

      <Link href={`/product/${item.slug}`} className="block">
        <div className="hairline-frame photo-surface card-interactive relative aspect-square overflow-hidden rounded-lg border border-border">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={`${item.brandName} ${item.name}`}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className={
                "object-cover transition-transform duration-500 ease-[var(--ease-lux)] group-hover:scale-[1.03]" +
                (soldOut ? " opacity-60" : "")
              }
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-subtle">
              Фото готовится
            </div>
          )}

          <div className="absolute top-16 left-4 flex flex-col items-start gap-2">
            {item.condition === "pre_owned" ? (
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                Pre-owned
              </Badge>
            ) : isNewArrival(item.publishedAt) ? (
              <Badge variant="accent">Новинка</Badge>
            ) : null}
          </div>

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {soldOut ? (
              <Badge variant="danger" className="bg-background/80 backdrop-blur-sm">
                Продано
              </Badge>
            ) : lastOne ? (
              <Badge variant="warning" className="bg-background/80 backdrop-blur-sm">
                Последний
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="eyebrow">{item.brandName}</span>
          <span className="rule-fade flex-1" aria-hidden />
        </div>
        <h3 className="mt-2 font-display text-lg leading-snug font-medium transition-colors group-hover:text-accent-text">
          {item.name}
        </h3>
        {item.reference ? (
          <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-subtle">
            {item.reference}
          </p>
        ) : null}

        <Price
          className="mt-3"
          netCents={item.priceCents}
          vatScheme={item.vatScheme}
          compareAtNetCents={item.compareAtPriceCents}
          from={multipleUnits}
        />
      </Link>
    </article>
  );
}
