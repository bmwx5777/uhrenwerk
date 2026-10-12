import "server-only";

import { appUrl } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";
import { formatMoney } from "@/lib/money";
import type { EmailMessage } from ".";

/**
 * Письма о заказе.
 *
 * Только текст, без HTML: транзакционные письма читают ради номера,
 * суммы и реквизитов, а текстовая версия доходит везде и не попадает
 * в спам из-за вёрстки. HTML добавим, если понадобится фирменный вид.
 */

type OrderEmailInput = {
  orderNumber: string;
  email: string;
  totalCents: number;
  items: Array<{ productName: string; brandName: string; quantity: number }>;
  shippingMethodName: string;
};

const SIGNATURE = ["", "— UHRENWERK", appUrl].join("\n");

function itemLines(items: OrderEmailInput["items"]): string {
  return items
    .map(
      (item) =>
        `  · ${item.brandName} ${item.productName}` +
        (item.quantity > 1 ? ` × ${item.quantity}` : ""),
    )
    .join("\n");
}

export function orderPlacedEmail(input: OrderEmailInput): EmailMessage {
  return {
    to: input.email,
    subject: `Заказ ${input.orderNumber} принят · UHRENWERK`,
    text: [
      `Спасибо за заказ ${input.orderNumber}.`,
      "",
      "Состав:",
      itemLines(input.items),
      "",
      `Доставка: ${input.shippingMethodName}`,
      `К оплате: ${formatMoney(input.totalCents)}`,
      "",
      "Товар зарезервирован за вами. Следующий шаг — выбрать способ оплаты:",
      `${appUrl}/checkout/payment/${input.orderNumber}`,
      "",
      "Статус заказа всегда можно проверить здесь:",
      `${appUrl}/order-lookup`,
      SIGNATURE,
    ].join("\n"),
  };
}

type BankTransferEmailInput = OrderEmailInput & {
  reference: string;
  dueDate: Date;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function bankTransferInstructionsEmail(
  input: BankTransferEmailInput,
): EmailMessage {
  const beneficiary = serverEnv.BANK_BENEFICIARY ?? "UHRENWERK LTD";
  const iban = serverEnv.BANK_IBAN ?? "— реквизиты не заполнены —";
  const bic = serverEnv.BANK_BIC ?? "—";
  const bankName = serverEnv.BANK_NAME ?? "—";

  return {
    to: input.email,
    subject: `Реквизиты для оплаты заказа ${input.orderNumber} · UHRENWERK`,
    text: [
      `Заказ ${input.orderNumber} ждёт оплаты банковским переводом.`,
      "",
      `Сумма:        ${formatMoney(input.totalCents)}`,
      `Получатель:   ${beneficiary}`,
      `IBAN:         ${iban}`,
      `BIC/SWIFT:    ${bic}`,
      `Банк:         ${bankName}`,
      `Назначение:   ${input.reference}`,
      "",
      "Назначение платежа укажите точно как выше — по нему мы находим",
      "ваш платёж. Без него зачисление задержится.",
      "",
      `Резерв товара действует до ${DATE_FORMATTER.format(input.dueDate)}.`,
      "Как только деньги поступят, пришлём подтверждение и начнём сборку.",
      SIGNATURE,
    ].join("\n"),
  };
}

const STATUS_SUBJECTS: Record<string, string> = {
  paid: "Оплата получена",
  processing: "Заказ в работе",
  shipped: "Заказ отправлен",
  delivered: "Заказ доставлен",
  cancelled: "Заказ отменён",
  refunded: "Возврат оформлен",
};

const STATUS_BODIES: Record<string, string[]> = {
  paid: [
    "Оплата получена — спасибо.",
    "Часы проходят финальную проверку перед отправкой.",
  ],
  processing: ["Заказ в работе: проверяем комплект и готовим к отправке."],
  shipped: [
    "Заказ передан курьеру.",
    "Посылка застрахована и требует подписи получателя.",
  ],
  delivered: [
    "Заказ доставлен. Гарантия отсчитывается с этой даты.",
    "",
    "Если что-то не так — ответьте на это письмо: у покупателей из ЕС",
    "есть 14 дней на возврат без объяснения причин.",
  ],
  cancelled: [
    "Заказ отменён, резерв товара снят.",
    "Если это ошибка — напишите нам, поможем оформить заново.",
  ],
  refunded: [
    "Возврат оформлен. Деньги вернутся тем же способом, которым была",
    "произведена оплата, в течение 14 дней.",
  ],
};

/** Письмо о смене статуса. `null` — для статусов, о которых не пишем. */
export function orderStatusEmail(input: {
  orderNumber: string;
  email: string;
  status: string;
}): EmailMessage | null {
  const subject = STATUS_SUBJECTS[input.status];
  const body = STATUS_BODIES[input.status];

  if (!subject || !body) return null;

  return {
    to: input.email,
    subject: `${subject} · заказ ${input.orderNumber}`,
    text: [
      `Заказ ${input.orderNumber}`,
      "",
      ...body,
      "",
      `Статус заказа: ${appUrl}/order-lookup`,
      SIGNATURE,
    ].join("\n"),
  };
}
