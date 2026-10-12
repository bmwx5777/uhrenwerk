"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { emitCartCount, emitWishlistCount } from "@/lib/client-events";
import { formatDisplayPrice } from "@/lib/pricing";
import {
  moveWishlistItemToCartAction,
  removeWishlistItemAction,
} from "@/server/actions/wishlist";
import type { WishlistLine } from "@/server/services/wishlist";

export function WishlistLineCard({ line }: { line: WishlistLine }) {
  const [isPending, startTransition] = useTransition();

  function moveToCart() {
    startTransition(async () => {
      const result = await moveWishlistItemToCartAction({
        itemId: line.itemId,
        productId: line.productId,
        ...(line.productUnitId ? { productUnitId: line.productUnitId } : {}),
      });

      emitWishlistCount(result.wishlistCount);
      if ("cartCount" in result && typeof result.cartCount === "number") {
        emitCartCount(result.cartCount);
      }

      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeWishlistItemAction(line.itemId);
      emitWishlistCount(result.wishlistCount);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <article
      className="card-surface flex gap-4 p-4 md:gap-6 md:p-5"
      aria-busy={isPending || undefined}
    >
      <Link
        href={`/product/${line.slug}`}
        className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted md:size-28"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={`${line.brandName} ${line.name}`}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="eyebrow">{line.brandName}</p>
        <h2 className="mt-1 text-sm md:text-base">
          <Link href={`/product/${line.slug}`} className="hover:text-accent-text">
            {line.name}
          </Link>
        </h2>

        <p className="mt-2 text-sm text-muted">
          {line.priceCents !== null
            ? formatDisplayPrice(line.priceCents, line.vatScheme)
            : "Цена по запросу"}
        </p>

        {!line.isAvailable ? (
          <Badge variant="danger" className="mt-3 self-start">
            Нет в наличии
          </Badge>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={moveToCart}
            disabled={isPending || !line.isAvailable}
            className="gap-2"
          >
            <ShoppingBag className="size-3.5" aria-hidden />В корзину
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={isPending}
            className="gap-2 px-0 text-muted hover:text-danger-600"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Убрать
          </Button>
        </div>
      </div>
    </article>
  );
}
