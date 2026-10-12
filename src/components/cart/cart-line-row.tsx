"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { emitCartCount } from "@/lib/client-events";
import { formatMoney } from "@/lib/money";
import { formatDisplayPrice, lineDisplayCents } from "@/lib/pricing";
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/server/actions/cart";
import type { CartLine } from "@/server/services/cart";

/**
 * Строка корзины.
 *
 * Количество меняется шагами: на телефоне это надёжнее, чем поле ввода,
 * и исключает «999» или буквы. Верхняя граница всё равно проверяется
 * на сервере по остатку склада.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();
  const isUnit = line.productUnitId !== null;

  function changeQuantity(nextQuantity: number) {
    startTransition(async () => {
      const result = await updateCartItemQuantityAction(line.itemId, nextQuantity);
      emitCartCount(result.cartCount);
      if (result.status === "error") toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemAction(line.itemId);
      emitCartCount(result.cartCount);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <article
      className="flex gap-4 border-b border-border py-6 first:pt-0 md:gap-6"
      aria-busy={isPending || undefined}
    >
      <Link
        href={`/product/${line.slug}`}
        className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted md:size-32"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={`${line.brandName} ${line.name}`}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="eyebrow">{line.brandName}</p>
        <h2 className="mt-1 text-sm md:text-base">
          <Link href={`/product/${line.slug}`} className="hover:text-accent-text">
            {line.name}
          </Link>
        </h2>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {line.reference ? (
            <span className="font-mono text-xs text-subtle">{line.reference}</span>
          ) : null}
          {isUnit ? (
            <span className="text-xs text-subtle">
              {line.productionYear ? `${line.productionYear} год` : null}
              {line.unitCode ? ` · ${line.unitCode}` : null}
            </span>
          ) : null}
        </div>

        {!line.isAvailable ? (
          <Badge variant="danger" className="mt-3">
            {isUnit ? "Экземпляр уже продан" : "Нет в наличии"}
          </Badge>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {isUnit ? (
            <span className="text-sm text-muted">1 экземпляр</span>
          ) : (
            <div className="flex items-center overflow-hidden rounded-md border border-border-control">
              <button
                type="button"
                onClick={() => changeQuantity(line.quantity - 1)}
                disabled={isPending}
                aria-label="Уменьшить количество"
                className="flex size-10 items-center justify-center hover:bg-surface-muted disabled:opacity-40"
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
              <span className="w-10 text-center text-sm">{line.quantity}</span>
              <button
                type="button"
                onClick={() => changeQuantity(line.quantity + 1)}
                disabled={isPending || line.quantity >= line.availableQuantity}
                aria-label="Увеличить количество"
                className="flex size-10 items-center justify-center hover:bg-surface-muted disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </div>
          )}

          <div className="text-right">
            <p className="text-base">
              {formatMoney(
                lineDisplayCents(line.unitPriceCents, line.quantity, line.vatScheme),
              )}
            </p>
            {line.quantity > 1 ? (
              <p className="text-xs text-subtle">
                {formatDisplayPrice(line.unitPriceCents, line.vatScheme)} за шт.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={isPending}
        aria-label="Удалить из корзины"
        className="self-start text-muted hover:text-danger-600"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </article>
  );
}
