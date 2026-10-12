import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_META } from "@/lib/constants/order-status";
import { formatMoney } from "@/lib/money";
import { listOrdersForAdmin } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const status =
    statusParam && statusParam in ORDER_STATUS_META ? statusParam : undefined;

  const orders = await listOrdersForAdmin({ status });

  return (
    <div>
      <h1 className="font-display text-headline font-medium">Заказы</h1>

      <form action="/admin/orders" className="mt-6 flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-12 rounded-md border border-border-control bg-surface-muted px-4 text-sm"
          aria-label="Статус заказа"
        >
          <option value="">Все статусы</option>
          {Object.entries(ORDER_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Показать
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">Найдено: {orders.length}</p>

      <div className="card-surface mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs text-subtle uppercase">
            <tr>
              <th className="p-3 text-left font-normal">Номер</th>
              <th className="p-3 text-left font-normal">Дата</th>
              <th className="p-3 text-left font-normal">Покупатель</th>
              <th className="p-3 text-left font-normal">Куда</th>
              <th className="p-3 text-right font-normal">Сумма</th>
              <th className="p-3 text-left font-normal">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const expired =
                order.status === "pending_payment" &&
                order.reservationExpiresAt !== null &&
                order.reservationExpiresAt < new Date();

              return (
                <tr key={order.id} className="hover:bg-surface-muted/50">
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs hover:text-accent-text"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-xs text-subtle">
                      {order.itemCount} поз.
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted">
                    {DATE_FORMATTER.format(order.placedAt)}
                  </td>
                  <td className="p-3 text-muted">{order.email}</td>
                  <td className="p-3 text-muted">{order.countryCode}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatMoney(order.totalCents)}
                  </td>
                  <td className="p-3">
                    <OrderStatusBadge status={order.status} />
                    {expired ? (
                      <span className="mt-1 block text-xs text-danger-600">
                        резерв истёк
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
