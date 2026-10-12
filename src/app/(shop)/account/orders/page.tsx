import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/services/order";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div>
        <h2 className="eyebrow">История заказов</h2>
        <EmptyState
          className="mt-6"
          icon={Receipt}
          title="Заказов пока нет"
          description="Здесь появятся номера заказов, статусы доставки и документы."
          action={
            <Button asChild variant="secondary">
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="eyebrow">История заказов</h2>

      <div className="mt-6 flex flex-col gap-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="card-surface card-interactive block p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-sm">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} />
            </div>

            <p className="mt-2 text-xs text-subtle">
              {DATE_FORMATTER.format(order.placedAt)}
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex gap-2">
                {order.previewImages.map((url) => (
                  <div
                    key={url}
                    className="relative size-12 overflow-hidden rounded-md border border-border bg-surface-muted"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{order.firstItemName ?? "Заказ"}</p>
                <p className="text-xs text-subtle">{order.itemCount} поз.</p>
              </div>

              <p className="text-sm whitespace-nowrap">
                {formatMoney(order.totalCents)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
