import { AlertTriangle, Clock, Euro, Package, PackageCheck, Watch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatCard } from "@/components/admin/stat-card";
import { formatMoney } from "@/lib/money";
import { getDashboardStats, listLowStockProducts } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Сводка",
  robots: { index: false },
};

export default async function AdminDashboardPage() {
  const [stats, lowStock] = await Promise.all([
    getDashboardStats(),
    listLowStockProducts(),
  ]);

  return (
    <div>
      <h1 className="font-display text-headline font-medium">Сводка</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Ожидают оплаты"
          value={String(stats.pendingPaymentCount)}
          hint="товар зарезервирован"
          icon={Clock}
          href="/admin/orders"
          tone={stats.pendingPaymentCount > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="В работе"
          value={String(stats.paidCount)}
          hint="оплачены, собираются, в пути"
          icon={PackageCheck}
          href="/admin/orders"
        />
        <StatCard
          label="Выручка"
          value={formatMoney(stats.paidRevenueCents)}
          hint="по оплаченным заказам"
          icon={Euro}
        />
        <StatCard
          label="Товаров в продаже"
          value={String(stats.activeProductCount)}
          hint={`черновиков: ${stats.draftProductCount}`}
          icon={Package}
          href="/admin/products"
        />
        <StatCard
          label="Экземпляров доступно"
          value={String(stats.availableUnitCount)}
          hint="pre-owned в продаже"
          icon={Watch}
        />
        <StatCard
          label="Просроченный резерв"
          value={String(stats.expiredReservationCount)}
          hint="снять вручную до этапа 8"
          icon={AlertTriangle}
          href="/admin/orders"
          tone={stats.expiredReservationCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {lowStock.length > 0 ? (
        <section className="mt-12">
          <h2 className="eyebrow">Заканчивается на складе</h2>
          <ul className="card-surface mt-4 divide-y divide-border overflow-hidden">
            {lowStock.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 text-sm"
              >
                <Link
                  href={`/admin/products/${item.id}`}
                  className="hover:text-accent-text"
                >
                  <span className="text-xs text-subtle">{item.brandName}</span>
                  <span className="block">{item.name}</span>
                </Link>
                <span className="whitespace-nowrap text-muted">
                  {item.quantity - item.reserved} из {item.quantity} шт.
                  <span className="block text-xs text-subtle">
                    порог {item.threshold}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
