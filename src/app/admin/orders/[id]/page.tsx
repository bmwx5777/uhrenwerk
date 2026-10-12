import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusControl } from "@/components/admin/order-status-control";
import { PaymentPanel } from "@/components/admin/payment-panel";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { OrderTimeline } from "@/components/order/order-timeline";
import { formatMoney, formatTaxRate } from "@/lib/money";
import { getOrderById } from "@/server/services/order";
import { listPaymentsForOrder } from "@/server/services/payment";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  return { title: `Заказ ${order.orderNumber}`, robots: { index: false } };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  const payments = await listPaymentsForOrder(order.id);

  const itemsTaxCents = order.items.reduce((total, item) => total + item.taxCents, 0);

  return (
    <div>
      <Link href="/admin/orders" className="text-xs text-subtle hover:text-foreground">
        ← Все заказы
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-mono text-2xl font-medium">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-xs text-subtle">
            {DATE_FORMATTER.format(order.placedAt)} · {order.email}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="card-surface mt-8 p-5">
        <h2 className="eyebrow">Изменить статус</h2>
        <div className="mt-4">
          <OrderStatusControl orderId={order.id} status={order.status} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Оплата</h2>
        <div className="mt-4">
          <PaymentPanel orderId={order.id} payments={payments} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Состав</h2>
        <div className="card-surface mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-subtle uppercase">
              <tr>
                <th className="p-3 text-left font-normal">Товар</th>
                <th className="p-3 text-left font-normal">Экземпляр</th>
                <th className="p-3 text-right font-normal">Цена без НДС</th>
                <th className="p-3 text-right font-normal">Кол-во</th>
                <th className="p-3 text-right font-normal">НДС</th>
                <th className="p-3 text-right font-normal">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">
                    <span className="text-xs text-subtle">{item.brandName}</span>
                    <span className="block">{item.productName}</span>
                    <span className="block font-mono text-xs text-subtle">
                      {item.sku}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted">
                    {item.serialNumber ?? "—"}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatMoney(item.unitPriceCents)}
                  </td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatMoney(item.taxCents)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatMoney(item.lineTotalCents + item.taxCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="eyebrow">Деньги</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Товары без НДС</dt>
              <dd>{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Доставка без НДС</dt>
              <dd>{formatMoney(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                НДС{order.taxRateBp > 0 ? ` ${formatTaxRate(order.taxRateBp)}` : ""}
              </dt>
              <dd>{formatMoney(order.taxCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-xs text-subtle">
              <dt>из них НДС по товарам</dt>
              <dd>{formatMoney(itemsTaxCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt>К оплате</dt>
              <dd className="text-base">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-subtle">
            Налоговый режим: {order.taxTreatment}
            {order.vatNumber ? ` · VAT ${order.vatNumber}` : ""}
          </p>
        </section>

        <section>
          <h2 className="eyebrow">Путь заказа</h2>
          <div className="mt-4">
            <OrderTimeline
              placedAt={order.placedAt}
              paidAt={order.paidAt}
              shippedAt={order.shippedAt}
              deliveredAt={order.deliveredAt}
              cancelledAt={order.cancelledAt}
            />
          </div>

          {order.reservationExpiresAt ? (
            <p className="mt-6 text-xs text-subtle">
              Резерв до {DATE_FORMATTER.format(order.reservationExpiresAt)}
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="eyebrow">Доставка</h2>
          <p className="mt-3 text-sm text-muted">{order.shippingMethodName}</p>
          <address className="mt-3 text-sm leading-relaxed text-muted not-italic">
            {order.shippingAddress.recipientName}
            {order.shippingAddress.companyName ? (
              <>
                <br />
                {order.shippingAddress.companyName}
              </>
            ) : null}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
            <br />
            {order.shippingAddress.countryCode}
            {order.shippingAddress.phone ? (
              <>
                <br />
                {order.shippingAddress.phone}
              </>
            ) : null}
          </address>
        </div>

        {order.customerNote ? (
          <div>
            <h2 className="eyebrow">Комментарий покупателя</h2>
            <p className="mt-3 text-sm text-muted">{order.customerNote}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
