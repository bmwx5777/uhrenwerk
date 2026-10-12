"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { orderItem, product } from "@/server/db/schema";
import { cancelPendingOrder, getOrderForUser } from "@/server/services/order";
import { addToCartAction } from "./cart";
import { formError, formOk, type FormState } from "./form-state";

/**
 * Действия с заказами в кабинете.
 *
 * Каждое начинается с `requireUser()`, и все запросы ограничены заказами
 * этого пользователя: идентификатор заказа из адресной строки сам по себе
 * ничего не даёт.
 */

const orderIdSchema = z.uuid();

export async function cancelOrderAction(orderId: string): Promise<FormState> {
  const user = await requireUser();
  const id = orderIdSchema.safeParse(orderId);

  if (!id.success) return formError("Заказ не найден.");

  const result = await cancelPendingOrder(id.data, user.id);

  if (result.status === "error") return formError(result.message);

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${id.data}`);
  return formOk("Заказ отменён, резерв снят.");
}

/**
 * Повторить заказ: вернуть позиции в корзину.
 *
 * Уникальные экземпляры пропускаем — те часы уже проданы, второй раз их
 * не купить. Обычные товары добавляем по текущей цене: цена заказа была
 * снимком на момент покупки и повторно не применяется.
 */
export async function reorderAction(orderId: string): Promise<FormState> {
  const user = await requireUser();
  const id = orderIdSchema.safeParse(orderId);

  if (!id.success) return formError("Заказ не найден.");

  const existing = await getOrderForUser(id.data, user.id);
  if (!existing) return formError("Заказ не найден.");

  const items = await db
    .select({
      productId: orderItem.productId,
      productUnitId: orderItem.productUnitId,
      quantity: orderItem.quantity,
      productStatus: product.status,
    })
    .from(orderItem)
    .leftJoin(product, eq(product.id, orderItem.productId))
    .where(eq(orderItem.orderId, id.data));

  let added = 0;
  let skipped = 0;

  for (const item of items) {
    // Уникальный экземпляр или снятый с продажи товар повторить нельзя.
    if (
      !item.productId ||
      item.productUnitId !== null ||
      item.productStatus !== "active"
    ) {
      skipped += 1;
      continue;
    }

    const result = await addToCartAction({
      productId: item.productId,
      quantity: item.quantity,
    });

    if (result.status === "ok") added += 1;
    else skipped += 1;
  }

  revalidatePath("/cart");

  if (added === 0) {
    return formError(
      "Ни одну позицию не удалось повторить: уникальные экземпляры продаются один раз.",
    );
  }

  return formOk(
    skipped > 0
      ? `Добавили в корзину ${added} позиц. — часть товаров больше недоступна.`
      : "Позиции заказа добавлены в корзину.",
  );
}
