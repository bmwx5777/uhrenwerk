import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActions } from "@/components/account/order-actions";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { OrderTimeline } from "@/components/order/order-timeline";
import { formatMoney, formatTaxRate } from "@/lib/money";
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/constants/order-status";
import { requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/services/order";

export async function generateMetadata({
  params,
}: PageProps<"/account/orders/[orderId]">): Promise<Metadata> {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(orderId, user.id);

  if (!order) notFound();

  return { title: `Заказ ${order.orderNumber}`, robots: { index: false } };
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function OrderDetailPage({
  params,
}: PageProps<"/account/orders/[orderId]">) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(orderId, user.id);

  if (!order) notFound();

  const statusMeta = ORDER_STATUS_META[order.status as OrderStatus];
  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status as OrderStatus);

  const itemsTaxCents = order.items.reduce((total, item) => total + item.taxCents, 0);
  const itemsGrossCents = order.subtotalCents + itemsTaxCents;
  const shippingGrossCents = order.shippingCents + (order.taxCents - itemsTaxCents);

  return (
    <div>
      <Link
        href="/account/orders"
        className="text-xs text-subtle hover:text-foreground"
      >
        ← Все заказы
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-lg">{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-subtle">
            {DATE_TIME_FORMATTER.format(order.placedAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {statusMeta ? (
        <p className="mt-4 text-sm text-muted">{statusMeta.description}</p>
      ) : null}

      {order.status === "pending_payment" && order.reservationExpiresAt ? (
        <div className="mt-6 flex gap-3 border border-warning-600/40 bg-warning-600/5 p-4">
          <Clock
            className="size-5 shrink-0 text-warning-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-sm">
            Резерв действует до {DATE_TIME_FORMATTER.format(order.reservationExpiresAt)}
            . Способы оплаты подключаются на этапе 8 — пока менеджер свяжется с вами по
            email {order.email}.
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <OrderActions
          orderId={order.id}
          orderNumber={order.orderNumber}
          canCancel={canCancel}
        />
      </div>

      <section className="mt-10">
        <h3 className="eyebrow">Состав</h3>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-xs text-subtle">{item.brandName}</p>
                <p className="text-sm">{item.productName}</p>
                <p className="mt-0.5 font-mono text-xs text-subtle">
                  {item.serialNumber ? `S/N ${item.serialNumber}` : item.sku}
                </p>
                {item.quantity > 1 ? (
                  <p className="text-xs text-subtle">{item.quantity} шт.</p>
                ) : null}
              </div>
              <p className="text-sm whitespace-nowrap">
                {formatMoney(item.lineTotalCents + item.taxCents)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <h3 className="eyebrow">Итоги</h3>
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
              <dt>Итого</dt>
              <dd className="text-base">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="eyebrow">Путь заказа</h3>
          <div className="mt-4">
            <OrderTimeline
              placedAt={order.placedAt}
              paidAt={order.paidAt}
              shippedAt={order.shippedAt}
              deliveredAt={order.deliveredAt}
              cancelledAt={order.cancelledAt}
            />
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h3 className="eyebrow">Адрес доставки</h3>
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

        {order.customerNote ? (
          <div className="mt-6">
            <h3 className="eyebrow">Комментарий к заказу</h3>
            <p className="mt-3 text-sm text-muted">{order.customerNote}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
