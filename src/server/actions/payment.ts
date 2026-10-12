"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMethodAvailable } from "@/lib/constants/payment";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderById } from "@/server/services/order";
import { startPayment } from "@/server/services/payment";
import { formError, formOk, type FormState } from "./form-state";

/**
 * Выбор способа оплаты.
 *
 * Клиент передаёт только идентификатор заказа и способ. Сумма берётся из
 * заказа, который посчитал сервер при оформлении.
 */

const startPaymentSchema = z.object({
  orderId: z.uuid(),
  method: z.enum(["bank_transfer", "card", "crypto"]),
});

export async function startPaymentAction(input: {
  orderId: string;
  method: string;
}): Promise<FormState> {
  const parsed = startPaymentSchema.safeParse(input);
  if (!parsed.success) return formError("Некорректный способ оплаты.");

  if (!isMethodAvailable(parsed.data.method)) {
    return formError("Этот способ оплаты пока не подключён.");
  }

  // Заказ пользователя доступен только ему. Гостевой заказ открывается
  // по ссылке: идентификатор — случайный UUID.
  const [existingOrder, user] = await Promise.all([
    getOrderById(parsed.data.orderId),
    getCurrentUser(),
  ]);

  if (!existingOrder) return formError("Заказ не найден.");
  if (existingOrder.userId && existingOrder.userId !== user?.id) {
    return formError("Заказ не найден.");
  }

  const result = await startPayment({
    orderId: parsed.data.orderId,
    method: parsed.data.method,
  });

  if (result.status === "error") return formError(result.message);

  revalidatePath(`/checkout/payment/${parsed.data.orderId}`);
  revalidatePath("/account/orders");
  revalidatePath("/admin/orders");

  return formOk("Реквизиты для оплаты отправлены на почту.");
}
