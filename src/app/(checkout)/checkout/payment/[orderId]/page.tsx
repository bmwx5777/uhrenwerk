import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BankTransferInstructions } from "@/components/checkout/bank-transfer-instructions";
import { PaymentMethodPicker } from "@/components/checkout/payment-method-picker";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderById } from "@/server/services/order";
import { bankDetails, listPaymentsForOrder } from "@/server/services/payment";

export const metadata: Metadata = {
  title: "Оплата заказа",
  robots: { index: false },
};

export default async function PaymentPage({
  params,
}: PageProps<"/checkout/payment/[orderId]">) {
  const { orderId } = await params;
  const [order, user] = await Promise.all([getOrderById(orderId), getCurrentUser()]);

  if (!order) notFound();

  // Та же проверка, что на странице подтверждения: заказ пользователя
  // виден только ему, гостевой — по ссылке с непредсказуемым id.
  if (order.userId && order.userId !== user?.id) notFound();

  const payments = await listPaymentsForOrder(order.id);
  const pendingTransfer = payments.find(
    (item) => item.method === "bank_transfer" && item.status === "pending",
  );
  const succeeded = payments.find((item) => item.status === "succeeded");

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Шаг 2 из 2</p>
            <h1 className="mt-3 font-display text-headline font-medium">
              Оплата заказа
            </h1>
            <p className="mt-2 font-mono text-sm text-subtle">{order.orderNumber}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mt-8 flex items-baseline justify-between gap-4 border-y border-border py-5">
          <span className="text-sm text-muted">К оплате</span>
          <span className="text-xl">{formatMoney(order.totalCents)}</span>
        </div>

        <div className="mt-10">
          {succeeded || order.status !== "pending_payment" ? (
            <div className="flex gap-3 border border-success-600/30 bg-success-600/5 p-5">
              <CheckCircle2
                className="size-5 shrink-0 text-success-600"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-sm">
                Этот заказ больше не ожидает оплаты. Текущий статус и состав видны на
                странице заказа.
              </p>
            </div>
          ) : pendingTransfer ? (
            <BankTransferInstructions
              reference={pendingTransfer.providerReference ?? order.orderNumber}
              totalCents={order.totalCents}
              dueAt={order.reservationExpiresAt}
              details={bankDetails()}
            />
          ) : (
            <PaymentMethodPicker orderId={order.id} totalCents={order.totalCents} />
          )}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href={`/checkout/success/${order.id}`}>Детали заказа</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/catalog">Продолжить покупки</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
