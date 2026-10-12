import { CheckCircle2, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatTaxRate } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderById } from "@/server/services/order";

export const metadata: Metadata = {
  title: "Заказ принят",
  robots: { index: false },
};

const TAX_TREATMENT_LABELS: Record<string, string> = {
  eu_domestic: "НДС Кипра",
  eu_oss: "НДС страны доставки (OSS)",
  eu_reverse_charge: "Reverse charge",
  export_zero_rated: "Экспорт без НДС",
  margin_scheme: "Схема маржи",
};

export default async function CheckoutSuccessPage({
  params,
}: PageProps<"/checkout/success/[orderId]">) {
  const { orderId } = await params;
  const [order, user] = await Promise.all([getOrderById(orderId), getCurrentUser()]);

  if (!order) notFound();

  // Заказ пользователя виден только ему. Гостевой заказ открывается по
  // ссылке: идентификатор — случайный UUID, подобрать его нельзя.
  if (order.userId && order.userId !== user?.id) notFound();

  // НДС по товарам и по доставке разделяем, чтобы показать цены так, как
  // их видел покупатель: с налогом, а сам налог — справочной строкой.
  const itemsTaxCents = order.items.reduce((total, item) => total + item.taxCents, 0);
  const itemsGrossCents = order.subtotalCents + itemsTaxCents;
  const shippingGrossCents = order.shippingCents + (order.taxCents - itemsTaxCents);

  return (
    <div className="container-page py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle2
            className="size-7 text-success-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <h1 className="font-display text-headline font-medium">Заказ принят</h1>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Номер заказа{" "}
          <span className="font-mono text-foreground">{order.orderNumber}</span>.
          Подтверждение отправлено на {order.email}.
        </p>

        <div className="mt-8 flex gap-3 border border-warning-600/40 bg-warning-600/5 p-5">
          <Clock
            className="size-5 shrink-0 text-warning-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="text-sm">
            <p>Ожидает оплаты</p>
            <p className="mt-1 text-muted">
              Товар зарезервирован за вами. Выберите способ оплаты — реквизиты пришлём
              на {order.email}.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href={`/checkout/payment/${order.id}`}>Перейти к оплате</Link>
            </Button>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="eyebrow">Состав заказа</h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-xs text-subtle">{item.brandName}</p>
                  <p className="text-sm">{item.productName}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    {item.quantity > 1 ? `${item.quantity} шт. · ` : ""}
                    {item.serialNumber ? `S/N ${item.serialNumber}` : item.sku}
                  </p>
                </div>
                <p className="text-sm whitespace-nowrap">
                  {formatMoney(item.lineTotalCents + item.taxCents)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">Итоги</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Товары</dt>
              <dd>{formatMoney(itemsGrossCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Доставка · {order.shippingMethodName}</dt>
              <dd>
                {shippingGrossCents === 0
                  ? "бесплатно"
                  : formatMoney(shippingGrossCents)}
              </dd>
            </div>
            {order.taxCents > 0 ? (
              <div className="flex justify-between gap-4 text-xs text-subtle">
                <dt>в том числе НДС {formatTaxRate(order.taxRateBp)}</dt>
                <dd>{formatMoney(order.taxCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt>К оплате</dt>
              <dd className="text-base">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>

          <Badge variant="outline" className="mt-4">
            {TAX_TREATMENT_LABELS[order.taxTreatment] ?? order.taxTreatment}
          </Badge>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">Доставка</h2>
          <address className="mt-4 text-sm leading-relaxed text-muted not-italic">
            {order.shippingAddress.recipientName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
            <br />
            {order.shippingAddress.countryCode}
          </address>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/catalog">Продолжить покупки</Link>
          </Button>
          {order.userId ? (
            <Button asChild variant="secondary">
              <Link href="/account/orders">Мои заказы</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
