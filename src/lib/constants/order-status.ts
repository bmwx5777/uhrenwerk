/** Статусы заказа: подписи и оформление. Единый источник для кабинета и админки. */

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; variant: BadgeVariant; description: string }
> = {
  pending_payment: {
    label: "Ожидает оплаты",
    variant: "warning",
    description: "Товар зарезервирован за вами до оплаты.",
  },
  paid: {
    label: "Оплачен",
    variant: "success",
    description: "Оплата получена, готовим заказ к отправке.",
  },
  processing: {
    label: "В работе",
    variant: "accent",
    description: "Проверяем часы и собираем комплект перед отправкой.",
  },
  shipped: {
    label: "Отправлен",
    variant: "accent",
    description: "Посылка передана курьеру.",
  },
  delivered: {
    label: "Доставлен",
    variant: "success",
    description: "Заказ получен. Гарантия отсчитывается с этой даты.",
  },
  cancelled: {
    label: "Отменён",
    variant: "neutral",
    description: "Заказ отменён, резерв снят.",
  },
  refunded: {
    label: "Возврат",
    variant: "neutral",
    description: "Средства возвращены полностью.",
  },
  partially_refunded: {
    label: "Частичный возврат",
    variant: "neutral",
    description: "Часть суммы возвращена.",
  },
};

/** Статусы, в которых покупатель ещё может отменить заказ сам. */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ["pending_payment"];

/** Заказ ещё не оплачен — показываем срок резерва. */
export function isAwaitingPayment(status: OrderStatus): boolean {
  return status === "pending_payment";
}

/**
 * Разрешённые переходы статусов для администратора.
 *
 * Список явный, а не «любой статус в любой»: случайный перевод
 * доставленного заказа обратно в «ожидает оплаты» сломал бы и склад,
 * и отчётность. Переход в `paid` списывает резерв со склада,
 * переход в `cancelled` — снимает его.
 */
export const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "refunded", "cancelled"],
  processing: ["shipped", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded", "partially_refunded"],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
