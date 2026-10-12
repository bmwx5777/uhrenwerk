import "server-only";

import { and, desc, eq, isNotNull, lt, sql } from "drizzle-orm";

import { ORDER_NUMBER_PREFIX, RESERVATION_MINUTES } from "@/lib/constants/checkout";
import {
  canTransition,
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/constants/order-status";
import { computeOrderTotals } from "@/lib/order-math";
import type { VatScheme } from "@/lib/pricing";
import { sendEmailSafely } from "@/server/email";
import { orderPlacedEmail, orderStatusEmail } from "@/server/email/templates";
import { db } from "@/server/db";
import {
  brand,
  cart,
  inventory,
  order,
  orderItem,
  cartItem,
  product,
  productImage,
  productUnit,
  type OrderAddressSnapshot,
} from "@/server/db/schema";
import { getShippingOption, shippingCostCents } from "./shipping";
import { resolveTaxTreatment } from "./tax";

/**
 * Создание заказа.
 *
 * Здесь выполняется главное требование проекта: цена НЕ принимается от
 * клиента. На входе — только идентификаторы (корзина, способ доставки) и
 * адрес. Цены читаются из базы внутри транзакции, прямо перед резервом
 * товара, и из них считается сумма к оплате.
 *
 * Вся работа идёт одной транзакцией: либо заказ создан и товар
 * зарезервирован, либо не изменилось ничего.
 */

export type PlaceOrderInput = {
  userId: string | null;
  cartId: string;
  email: string;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot | null;
  shippingMethodId: string;
  customerNote?: string | undefined;
};

export type PlaceOrderResult =
  | {
      status: "ok";
      orderId: string;
      orderNumber: string;
      /** Нужны для письма — чтобы не читать заказ ещё раз. */
      totalCents: number;
      shippingMethodName: string;
    }
  | { status: "error"; message: string };

/** Ошибка, понятная покупателю: прерывает транзакцию и откатывает резерв. */
class CheckoutError extends Error {}

const PRIMARY_IMAGE_URL = sql<string | null>`(
  SELECT ${productImage.url}
  FROM ${productImage}
  WHERE ${productImage.productId} = ${product.id}
    AND ${productImage.productUnitId} IS NULL
  ORDER BY ${productImage.isPrimary} DESC, ${productImage.position} ASC
  LIMIT 1
)`;

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const result = await createOrderInTransaction(input);

  // Письмо отправляем после коммита: внутри транзакции это означало бы
  // письмо о заказе, который ещё может откатиться.
  if (result.status === "ok") {
    const items = await db
      .select({
        productName: orderItem.productName,
        brandName: orderItem.brandName,
        quantity: orderItem.quantity,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, result.orderId));

    await sendEmailSafely(
      orderPlacedEmail({
        orderNumber: result.orderNumber,
        email: input.email,
        totalCents: result.totalCents,
        items,
        shippingMethodName: result.shippingMethodName,
      }),
      { orderId: result.orderId, kind: "order-placed" },
    );
  }

  return result;
}

async function createOrderInTransaction(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const shippingOption = await getShippingOption(
    input.shippingMethodId,
    input.shippingAddress.countryCode,
  );

  // Способ доставки должен принадлежать зоне страны получателя: иначе
  // можно было бы подставить европейский тариф для отправки в Австралию.
  if (!shippingOption) {
    return { status: "error", message: "Выберите доступный способ доставки." };
  }

  const tax = await resolveTaxTreatment({
    countryCode: input.shippingAddress.countryCode,
    vatNumber: input.billingAddress?.vatNumber ?? input.shippingAddress.vatNumber,
  });

  try {
    return await db.transaction(async (tx) => {
      // 1. Состав корзины и АКТУАЛЬНЫЕ цены из базы.
      const rows = await tx
        .select({
          productId: product.id,
          productUnitId: cartItem.productUnitId,
          quantity: cartItem.quantity,
          kind: product.kind,
          status: product.status,
          productName: product.name,
          sku: product.sku,
          reference: product.reference,
          productPriceCents: product.priceCents,
          productVatScheme: product.vatScheme,
          unitPriceCents: productUnit.priceCents,
          unitVatScheme: productUnit.vatScheme,
          unitStatus: productUnit.status,
          serialNumber: productUnit.serialNumber,
          conditionGrade: productUnit.conditionGrade,
          brandName: brand.name,
          imageUrl: PRIMARY_IMAGE_URL,
        })
        .from(cartItem)
        .innerJoin(product, eq(product.id, cartItem.productId))
        .innerJoin(brand, eq(brand.id, product.brandId))
        .leftJoin(productUnit, eq(productUnit.id, cartItem.productUnitId))
        .where(eq(cartItem.cartId, input.cartId))
        .orderBy(cartItem.createdAt);

      if (rows.length === 0) {
        throw new CheckoutError("Корзина пуста.");
      }

      // 2. Резерв товара. Условие внутри UPDATE делает проверку и
      // изменение одной атомарной операцией — два одновременных заказа
      // на последние часы не смогут оба пройти.
      for (const row of rows) {
        if (row.status !== "active") {
          throw new CheckoutError(`«${row.productName}» больше не продаётся.`);
        }

        if (row.productUnitId) {
          const reserved = await tx
            .update(productUnit)
            .set({ status: "reserved" })
            .where(
              and(
                eq(productUnit.id, row.productUnitId),
                eq(productUnit.status, "available"),
              ),
            )
            .returning({ id: productUnit.id });

          if (reserved.length === 0) {
            throw new CheckoutError(
              `Экземпляр «${row.productName}» уже забронирован другим покупателем.`,
            );
          }

          // Кэш количества для уникальных товаров пересчитываем из
          // истины — статусов экземпляров, чтобы он не мог разойтись.
          await tx
            .update(inventory)
            .set({
              quantity: sql`(
                SELECT count(*)::int FROM ${productUnit}
                WHERE ${productUnit.productId} = ${row.productId}
                  AND ${productUnit.status} = 'available'
              )`,
            })
            .where(eq(inventory.productId, row.productId));
        } else {
          const reserved = await tx
            .update(inventory)
            .set({ reserved: sql`${inventory.reserved} + ${row.quantity}` })
            .where(
              and(
                eq(inventory.productId, row.productId),
                sql`${inventory.quantity} - ${inventory.reserved} >= ${row.quantity}`,
              ),
            )
            .returning({ id: inventory.id });

          if (reserved.length === 0) {
            throw new CheckoutError(
              `«${row.productName}»: на складе осталось меньше, чем в корзине.`,
            );
          }
        }
      }

      // 3. Суммы. Цена за единицу — из базы: у экземпляра своя, у
      // обычного товара своя.
      const mathLines = rows.map((row) => {
        const netUnitCents = row.unitPriceCents ?? row.productPriceCents;
        if (netUnitCents === null || netUnitCents <= 0) {
          throw new CheckoutError(
            `Для «${row.productName}» не задана цена — напишите нам.`,
          );
        }

        return {
          netUnitCents,
          quantity: row.quantity,
          vatScheme: (row.unitVatScheme ?? row.productVatScheme) as VatScheme,
        };
      });

      const subtotalNetCents = mathLines.reduce(
        (total, line) => total + line.netUnitCents * line.quantity,
        0,
      );

      const totals = computeOrderTotals({
        lines: mathLines,
        taxRateBp: tax.rateBp,
        shippingNetCents: shippingCostCents(shippingOption, subtotalNetCents),
      });

      // 4. Человекочитаемый номер: последовательность в базе исключает
      // совпадения при одновременных заказах.
      const [numberRow] = await tx.execute<{ value: string }>(
        sql`SELECT lpad(nextval('order_number_seq')::text, 6, '0') AS value`,
      );

      const orderNumber = `${ORDER_NUMBER_PREFIX}-${new Date().getFullYear()}-${
        numberRow?.value ?? "000000"
      }`;

      const reservationExpiresAt = new Date(
        Date.now() + RESERVATION_MINUTES * 60 * 1000,
      );

      const [createdOrder] = await tx
        .insert(order)
        .values({
          orderNumber,
          userId: input.userId,
          email: input.email,
          status: "pending_payment",
          subtotalCents: totals.subtotalNetCents,
          discountCents: totals.discountCents,
          shippingCents: totals.shippingNetCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          taxTreatment: tax.treatment,
          taxRateBp: tax.rateBp,
          vatNumber:
            input.billingAddress?.vatNumber ?? input.shippingAddress.vatNumber ?? null,
          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress,
          shippingMethodId: shippingOption.id,
          shippingMethodName: shippingOption.name,
          customerNote: input.customerNote ?? null,
          reservationExpiresAt,
        })
        .returning({ id: order.id, orderNumber: order.orderNumber });

      if (!createdOrder) throw new CheckoutError("Не удалось создать заказ.");

      // 5. Позиции со снимками: переименование товара не изменит заказ.
      await tx.insert(orderItem).values(
        rows.map((row, index) => {
          const computed = totals.lines[index]!;

          return {
            orderId: createdOrder.id,
            productId: row.productId,
            productUnitId: row.productUnitId,
            productName: row.productName,
            brandName: row.brandName,
            sku: row.sku,
            reference: row.reference,
            serialNumber: row.serialNumber,
            conditionGrade: row.conditionGrade,
            imageUrl: row.imageUrl,
            vatScheme: computed.vatScheme,
            unitPriceCents: computed.netUnitCents,
            quantity: computed.quantity,
            taxRateBp: computed.taxRateBp,
            taxCents: computed.lineTaxCents,
            lineTotalCents: computed.lineNetCents,
          };
        }),
      );

      // 6. Корзина отработала: позиции остаются как история.
      await tx
        .update(cart)
        .set({ status: "converted" })
        .where(eq(cart.id, input.cartId));

      return {
        status: "ok" as const,
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        totalCents: totals.totalCents,
        shippingMethodName: shippingOption.name,
      };
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { status: "error", message: error.message };
    }

    console.error("order.place", error);
    return {
      status: "error",
      message: "Не удалось оформить заказ. Попробуйте ещё раз.",
    };
  }
}

/** Заказ для страницы подтверждения и личного кабинета. */
export async function getOrderById(orderId: string) {
  const row = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: {
      items: true,
      payments: true,
    },
  });

  return row ?? null;
}

/**
 * Заказ конкретного пользователя.
 *
 * `userId` в условии — не удобство, а защита: идентификатор заказа из
 * адресной строки сам по себе не должен открывать чужую покупку.
 */
export async function getOrderForUser(orderId: string, userId: string) {
  const row = await db.query.order.findFirst({
    where: and(eq(order.id, orderId), eq(order.userId, userId)),
    with: {
      items: true,
      payments: true,
    },
  });

  return row ?? null;
}

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  placedAt: Date;
  reservationExpiresAt: Date | null;
  itemCount: number;
  previewImages: string[];
  firstItemName: string | null;
};

/**
 * История заказов для кабинета.
 *
 * Превью собирается в том же запросе агрегатами — иначе на десять заказов
 * пришлось бы делать одиннадцать запросов.
 */
export async function listOrdersForUser(userId: string): Promise<OrderListItem[]> {
  const rows = await db
    .select({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      placedAt: order.placedAt,
      reservationExpiresAt: order.reservationExpiresAt,
      itemCount: sql<number>`coalesce(sum(${orderItem.quantity}), 0)::int`,
      previewImages: sql<
        string[]
      >`coalesce(array_agg(${orderItem.imageUrl}) FILTER (WHERE ${orderItem.imageUrl} IS NOT NULL), '{}')`,
      firstItemName: sql<
        string | null
      >`(array_agg(${orderItem.productName} ORDER BY ${orderItem.createdAt}))[1]`,
    })
    .from(order)
    .leftJoin(orderItem, eq(orderItem.orderId, order.id))
    .where(eq(order.userId, userId))
    .groupBy(order.id)
    .orderBy(desc(order.placedAt));

  return rows.map((row) => ({
    ...row,
    previewImages: row.previewImages.slice(0, 3),
  }));
}

/**
 * Снять резерв с товаров заказа.
 *
 * Обратная операция к резерву при создании заказа. Используется при
 * отмене, а на этапе 8 будет вызываться и фоновой задачей для заказов
 * с истёкшим сроком оплаты.
 *
 * Работает только с позициями, которые ещё числятся зарезервированными:
 * повторный вызов ничего не испортит.
 */
export async function releaseOrderReservation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
): Promise<void> {
  const items = await tx
    .select({
      productId: orderItem.productId,
      productUnitId: orderItem.productUnitId,
      quantity: orderItem.quantity,
    })
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));

  for (const item of items) {
    if (item.productUnitId) {
      await tx
        .update(productUnit)
        .set({ status: "available" })
        .where(
          and(
            eq(productUnit.id, item.productUnitId),
            eq(productUnit.status, "reserved"),
          ),
        );

      if (item.productId) {
        await tx
          .update(inventory)
          .set({
            quantity: sql`(
              SELECT count(*)::int FROM ${productUnit}
              WHERE ${productUnit.productId} = ${item.productId}
                AND ${productUnit.status} = 'available'
            )`,
          })
          .where(eq(inventory.productId, item.productId));
      }
      continue;
    }

    if (item.productId) {
      await tx
        .update(inventory)
        .set({
          // greatest на случай, если резерв уже был снят вручную:
          // отрицательным он стать не должен.
          reserved: sql`greatest(${inventory.reserved} - ${item.quantity}, 0)`,
        })
        .where(eq(inventory.productId, item.productId));
    }
  }
}

export type CancelOrderResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Отмена неоплаченного заказа покупателем.
 *
 * Резерв снимается в той же транзакции: товар сразу возвращается
 * в продажу. Оплаченные заказы покупатель не отменяет — там нужен
 * возврат средств, это делает администратор.
 */
export async function cancelPendingOrder(
  orderId: string,
  userId: string,
): Promise<CancelOrderResult> {
  try {
    return await db.transaction(async (tx) => {
      const cancelled = await tx
        .update(order)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          reservationExpiresAt: null,
        })
        .where(
          and(
            eq(order.id, orderId),
            eq(order.userId, userId),
            eq(order.status, "pending_payment"),
          ),
        )
        .returning({ id: order.id });

      if (cancelled.length === 0) {
        return {
          status: "error" as const,
          message: "Этот заказ уже нельзя отменить.",
        };
      }

      await releaseOrderReservation(tx, orderId);
      return { status: "ok" as const };
    });
  } catch (error) {
    console.error("order.cancel", { orderId, userId, error });
    return { status: "error", message: "Не удалось отменить заказ." };
  }
}

/**
 * Превратить резерв в продажу.
 *
 * Вызывается при переходе заказа в «оплачен»: обычный товар уходит со
 * склада (и из резерва), уникальный экземпляр получает статус `sold`
 * и навсегда исчезает из продажи.
 */
export async function consumeOrderReservation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
): Promise<void> {
  const items = await tx
    .select({
      productId: orderItem.productId,
      productUnitId: orderItem.productUnitId,
      quantity: orderItem.quantity,
    })
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));

  for (const item of items) {
    if (item.productUnitId) {
      await tx
        .update(productUnit)
        .set({ status: "sold" })
        .where(eq(productUnit.id, item.productUnitId));

      if (item.productId) {
        await tx
          .update(inventory)
          .set({
            quantity: sql`(
              SELECT count(*)::int FROM ${productUnit}
              WHERE ${productUnit.productId} = ${item.productId}
                AND ${productUnit.status} = 'available'
            )`,
          })
          .where(eq(inventory.productId, item.productId));
      }
      continue;
    }

    if (item.productId) {
      await tx
        .update(inventory)
        .set({
          quantity: sql`greatest(${inventory.quantity} - ${item.quantity}, 0)`,
          reserved: sql`greatest(${inventory.reserved} - ${item.quantity}, 0)`,
        })
        .where(eq(inventory.productId, item.productId));
    }
  }
}

export type StatusChangeResult =
  | {
      status: "ok";
      next: string;
      email: string;
      orderNumber: string;
    }
  | { status: "error"; message: string };

/**
 * Смена статуса заказа администратором.
 *
 * Склад меняется вместе со статусом и в той же транзакции: оплата
 * списывает резерв, отмена его снимает. Иначе рассинхрон между
 * заказами и складом — вопрос времени.
 */
export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StatusChangeResult> {
  const result = await applyStatusChange(orderId, nextStatus);

  // Письмо — после коммита: иначе покупатель узнал бы об оплате,
  // которая могла откатиться вместе с транзакцией.
  if (result.status === "ok") {
    const message = orderStatusEmail({
      orderNumber: result.orderNumber,
      email: result.email,
      status: nextStatus,
    });

    if (message) {
      await sendEmailSafely(message, { orderId, kind: `status-${nextStatus}` });
    }
  }

  return result;
}

async function applyStatusChange(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StatusChangeResult> {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          status: order.status,
          email: order.email,
          orderNumber: order.orderNumber,
        })
        .from(order)
        .where(eq(order.id, orderId))
        .limit(1);

      if (!current) {
        return { status: "error" as const, message: "Заказ не найден." };
      }

      const from = current.status as OrderStatus;

      if (!canTransition(from, nextStatus)) {
        return {
          status: "error" as const,
          message: `Переход «${ORDER_STATUS_META[from].label}» → «${ORDER_STATUS_META[nextStatus].label}» не предусмотрен.`,
        };
      }

      const now = new Date();
      const timestamps: Partial<typeof order.$inferInsert> = {};

      if (nextStatus === "paid") timestamps.paidAt = now;
      if (nextStatus === "shipped") timestamps.shippedAt = now;
      if (nextStatus === "delivered") timestamps.deliveredAt = now;
      if (nextStatus === "cancelled") timestamps.cancelledAt = now;

      await tx
        .update(order)
        .set({
          status: nextStatus,
          ...timestamps,
          ...(nextStatus === "paid" || nextStatus === "cancelled"
            ? { reservationExpiresAt: null }
            : {}),
        })
        .where(eq(order.id, orderId));

      if (nextStatus === "paid") {
        await consumeOrderReservation(tx, orderId);
      } else if (nextStatus === "cancelled") {
        await releaseOrderReservation(tx, orderId);
      }

      return {
        status: "ok" as const,
        next: nextStatus,
        email: current.email,
        orderNumber: current.orderNumber,
      };
    });
  } catch (error) {
    console.error("order.changeStatus", { orderId, nextStatus, error });
    return { status: "error", message: "Не удалось изменить статус." };
  }
}

export type ExpiredReservationsResult = {
  released: number;
  orderNumbers: string[];
};

/**
 * Снять резерв с заказов, которые не оплатили в срок.
 *
 * Запускается по расписанию (см. /api/cron/release-reservations).
 * Обрабатывает заказы по одному: один проблемный заказ не должен мешать
 * освободить товар из остальных.
 *
 * Срок резерва зависит от способа оплаты и выставляется при его выборе:
 * у перевода это дни, у карты — минуты.
 */
export async function releaseExpiredReservations(): Promise<ExpiredReservationsResult> {
  const expired = await db
    .select({ id: order.id, orderNumber: order.orderNumber })
    .from(order)
    .where(
      and(
        eq(order.status, "pending_payment"),
        isNotNull(order.reservationExpiresAt),
        lt(order.reservationExpiresAt, new Date()),
      ),
    );

  const released: string[] = [];

  for (const row of expired) {
    const result = await changeOrderStatus(row.id, "cancelled");

    if (result.status === "ok") {
      released.push(row.orderNumber);
    } else {
      console.error("order.releaseExpired", {
        orderId: row.id,
        message: result.message,
      });
    }
  }

  if (released.length > 0) {
    console.info("order.releaseExpired", { released });
  }

  return { released: released.length, orderNumbers: released };
}
