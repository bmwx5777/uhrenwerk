import { AlertTriangle, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CartLineRow } from "@/components/cart/cart-line-row";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { getCartSummary } from "@/server/services/cart";

export const metadata: Metadata = {
  title: "Корзина",
  robots: { index: false },
};

export default async function CartPage() {
  const summary = await getCartSummary();

  if (summary.lines.length === 0) {
    return (
      <div className="container-page py-10 md:py-16">
        <p className="eyebrow">Оформление</p>
        <h1 className="mt-4 font-display text-headline font-medium">Корзина</h1>

        <EmptyState
          className="mt-12"
          icon={ShoppingBag}
          title="Корзина пуста"
          description="Выберите часы в каталоге — мы придержим их на время оформления заказа."
          action={
            <Button asChild>
              <Link href="/catalog">Выбрать часы</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow">Оформление</p>
      <h1 className="mt-4 font-display text-headline font-medium">Корзина</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div>
          {summary.lines.map((line) => (
            <CartLineRow key={line.itemId} line={line} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6">
            <h2 className="eyebrow">Итого</h2>

            <dl className="mt-6 flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Товары ({summary.itemCount} шт.)</dt>
                <dd>{formatMoney(summary.subtotalDisplayCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Доставка</dt>
                <dd className="text-muted">рассчитаем при оформлении</dd>
              </div>
            </dl>

            <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-border pt-6">
              <span className="text-sm">К оплате</span>
              <span className="text-xl">
                {formatMoney(summary.subtotalDisplayCents)}
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-subtle">
              Цена указана с НДС 19 %. Для доставки за пределы ЕС налог пересчитывается
              при оформлении: сервер заново считает сумму по стране получателя.
            </p>

            {summary.hasUnavailableLines ? (
              <div className="mt-6 flex gap-3 border border-danger-600/40 bg-danger-100/40 p-4">
                <AlertTriangle
                  className="size-5 shrink-0 text-danger-600"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="text-sm">
                  Часть товаров больше не доступна — удалите их, чтобы продолжить.
                </p>
              </div>
            ) : null}

            {summary.hasUnavailableLines ? (
              <Button className="mt-6 w-full" size="lg" disabled>
                Оформить заказ
              </Button>
            ) : (
              <Button asChild className="mt-6 w-full" size="lg">
                <Link href="/checkout">Оформить заказ</Link>
              </Button>
            )}
            <p className="mt-3 text-xs text-subtle">
              Доставка и налог рассчитываются на следующем шаге — по стране получателя.
            </p>

            <Button asChild variant="link" className="mt-4 w-full">
              <Link href="/catalog">Продолжить покупки</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
