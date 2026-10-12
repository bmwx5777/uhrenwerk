import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { methodAllowedForAmount, type PaymentMethod } from "@/lib/constants/payment";
import { serverEnv } from "@/lib/env/server";
import { sendEmailSafely } from "@/server/email";
import { bankTransferInstructionsEmail } from "@/server/email/templates";
import { getPaymentProvider } from "@/server/payments/registry";
import type { CheckoutSession } from "@/server/payments/types";
import { db } from "@/server/db";
import { order, orderItem, payment } from "@/server/db/schema";

/**
 * Платежи заказа.
 *
 * Сумма платежа берётся из `order.totalCents` — то есть из расчёта,
 * который сервер сделал при создании заказа. Ни страница оплаты, ни
 * провайдер не могут её изменить.
 */

export type StartPaymentResult =
  | { status: "ok"; session: CheckoutSession; paymentId: string }
  | { status: "error"; message: string };

/** Реквизиты для проформы. Берутся из окружения, а не из кода. */
export function bankDetails() {
  return {
    beneficiary: serverEnv.BANK_BENEFICIARY ?? null,
    iban: serverEnv.BANK_IBAN ?? null,
    bic: serverEnv.BANK_BIC ?? null,
    bankName: serverEnv.BANK_NAME ?? null,
  };
}

export async function listPaymentsForOrder(orderId: string) {
  return db
    .select()
    .from(payment)
    .where(eq(payment.orderId, orderId))
    .orderBy(desc(payment.createdAt));
}

/**
 * Начать оплату выбранным способом.
 *
 * Повторный выбор того же способа не создаёт второй платёж: ключ
 * идемпотентности собран из заказа и способа, а уникальный индекс в базе
 * не даст записать дубль. Это защита от двойного клика и от возврата
 * «назад» в браузере.
 */
export async function startPayment(input: {
  orderId: string;
  method: PaymentMethod;
}): Promise<StartPaymentResult> {
  const provider = getPaymentProvider(input.method);

  if (!provider) {
    return {
      status: "error",
      message: "Этот способ оплаты пока не подключён.",
    };
  }

  const [existingOrder] = await db
    .select({
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      shippingMethodName: order.shippingMethodName,
    })
    .from(order)
    .where(eq(order.id, input.orderId))
    .limit(1);

  if (!existingOrder) {
    return { status: "error", message: "Заказ не найден." };
  }

  if (existingOrder.status !== "pending_payment") {
    return {
      status: "error",
      message: "Этот заказ уже не ожидает оплаты.",
    };
  }

  if (!methodAllowedForAmount(input.method, existingOrder.totalCents)) {
    return {
      status: "error",
      message:
        "Для этой суммы оплата картой недоступна — выберите перевод или криптовалюту.",
    };
  }

  const session = await provider.createCheckout({
    orderId: existingOrder.id,
    orderNumber: existingOrder.orderNumber,
    amountCents: existingOrder.totalCents,
    currency: existingOrder.currency,
    email: existingOrder.email,
  });

  const idempotencyKey = `${existingOrder.id}:${input.method}`;

  try {
    const [created] = await db
      .insert(payment)
      .values({
        orderId: existingOrder.id,
        method: input.method,
        provider: provider.id,
        status: "pending",
        amountCents: existingOrder.totalCents,
        currency: existingOrder.currency,
        idempotencyKey,
        ...(session.kind === "instructions"
          ? { providerReference: session.reference }
          : {
              providerPaymentId: session.providerPaymentId,
            }),
      })
      .onConflictDoNothing({ target: payment.idempotencyKey })
      .returning({ id: payment.id });

    // Платёж уже был создан раньше — берём его, а не плодим новый.
    const isNewPayment = Boolean(created);
    const paymentId =
      created?.id ??
      (
        await db
          .select({ id: payment.id })
          .from(payment)
          .where(eq(payment.idempotencyKey, idempotencyKey))
          .limit(1)
      )[0]?.id;

    if (!paymentId) {
      return { status: "error", message: "Не удалось создать платёж." };
    }

    // Срок резерва зависит от способа: перевод идёт дни, карта — минуты.
    // Письмо с реквизитами отправляем только при первом выборе способа:
    // повторное открытие страницы оплаты не должно присылать его снова.
    if (session.kind === "instructions" && isNewPayment) {
      await db
        .update(order)
        .set({ reservationExpiresAt: session.dueAt })
        .where(eq(order.id, existingOrder.id));

      const items = await db
        .select({
          productName: orderItem.productName,
          brandName: orderItem.brandName,
          quantity: orderItem.quantity,
        })
        .from(orderItem)
        .where(eq(orderItem.orderId, existingOrder.id));

      await sendEmailSafely(
        bankTransferInstructionsEmail({
          orderNumber: existingOrder.orderNumber,
          email: existingOrder.email,
          totalCents: existingOrder.totalCents,
          items,
          shippingMethodName: existingOrder.shippingMethodName,
          reference: session.reference,
          dueDate: session.dueAt,
        }),
        { orderId: existingOrder.id, kind: "bank-transfer-instructions" },
      );
    }

    return { status: "ok", session, paymentId };
  } catch (error) {
    console.error("payment.start", { orderId: input.orderId, error });
    return { status: "error", message: "Не удалось создать платёж." };
  }
}

/**
 * Отметить поступление денег вручную (администратор увидел перевод).
 *
 * Сам перевод статуса заказа в «оплачен» делает `changeOrderStatus`:
 * он списывает резерв со склада. Здесь только фиксируем факт платежа.
 */
export async function markPaymentReceived(
  paymentId: string,
): Promise<{ status: "ok"; orderId: string } | { status: "error"; message: string }> {
  const [row] = await db
    .select({ id: payment.id, orderId: payment.orderId, status: payment.status })
    .from(payment)
    .where(eq(payment.id, paymentId))
    .limit(1);

  if (!row) return { status: "error", message: "Платёж не найден." };

  if (row.status === "succeeded") {
    return { status: "error", message: "Этот платёж уже подтверждён." };
  }

  await db
    .update(payment)
    .set({ status: "succeeded", paidAt: new Date() })
    .where(and(eq(payment.id, paymentId), eq(payment.status, "pending")));

  return { status: "ok", orderId: row.orderId };
}
