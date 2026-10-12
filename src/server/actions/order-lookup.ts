"use server";

import { and, eq } from "drizzle-orm";

import { orderLookupSchema } from "@/lib/validation/order-lookup";
import { checkRateLimit, retryAfterMessage } from "@/server/rate-limit";
import { db } from "@/server/db";
import { order } from "@/server/db/schema";
import { fieldErrorsFrom, formError, type FormState } from "./form-state";

export type LookupResult = FormState & {
  order?: {
    orderNumber: string;
    status: string;
    placedAt: Date;
    totalCents: number;
    shippingMethodName: string;
    itemNames: string[];
  };
};

/**
 * Найти заказ по номеру и email.
 *
 * Пара «номер + email» работает как одноразовый ключ: номер
 * предсказуем, email известен только покупателю. Поэтому и при
 * неверной паре ответ один — «заказ не найден», без подсказки,
 * существует ли такой номер.
 */
export async function lookupOrderAction(
  _prevState: LookupResult | null,
  formData: FormData,
): Promise<LookupResult> {
  // Номера заказов последовательны: без лимита пару «номер + email»
  // можно подбирать перебором.
  const limit = await checkRateLimit("order-lookup", {
    limit: 10,
    windowSeconds: 300,
  });

  if (!limit.ok) {
    return formError(retryAfterMessage(limit.retryAfterSeconds));
  }

  const parsed = orderLookupSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return formError("Проверьте номер и email.", fieldErrorsFrom(parsed.error));
  }

  const row = await db.query.order.findFirst({
    where: and(
      eq(order.orderNumber, parsed.data.orderNumber),
      eq(order.email, parsed.data.email),
    ),
    columns: {
      orderNumber: true,
      status: true,
      placedAt: true,
      totalCents: true,
      shippingMethodName: true,
    },
    with: { items: { columns: { productName: true } } },
  });

  if (!row) {
    return formError(
      "Заказ не найден. Проверьте номер и адрес — они должны совпадать с теми, что указаны при оформлении.",
    );
  }

  return {
    status: "ok",
    message: "Заказ найден.",
    at: Date.now(),
    order: {
      orderNumber: row.orderNumber,
      status: row.status,
      placedAt: row.placedAt,
      totalCents: row.totalCents,
      shippingMethodName: row.shippingMethodName,
      itemNames: row.items.map((item) => item.productName),
    },
  };
}
