"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { REQUIRE_VERIFIED_EMAIL_FOR_ORDER } from "@/lib/constants/checkout";
import { placeOrderSchema, quoteRequestSchema } from "@/lib/validation/checkout";
import { getCurrentUser } from "@/server/auth/session";
import { clearGuestCartToken } from "@/server/cart/cookie";
import { db } from "@/server/db";
import type { OrderAddressSnapshot } from "@/server/db/schema";
import { address } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { buildCheckoutQuote, type CheckoutQuote } from "@/server/services/checkout";
import { placeOrder } from "@/server/services/order";
import { findActiveCart } from "@/server/services/cart";
import { isSupportedCountry } from "@/server/services/tax";
import { fieldErrorsFrom, formError, type FormState } from "./form-state";

/**
 * Действия оформления заказа.
 *
 * Клиент передаёт идентификаторы и адрес. Все деньги считает сервер:
 * и в предварительном расчёте, и при создании заказа — одной и той же
 * функцией `computeOrderTotals`.
 */

export type QuoteResult =
  { status: "ok"; quote: CheckoutQuote } | { status: "error"; message: string };

/** Пересчёт итогов при смене страны, VAT-номера или способа доставки. */
export async function quoteAction(input: {
  countryCode: string;
  vatNumber?: string;
  shippingMethodId?: string;
}): Promise<QuoteResult> {
  const parsed = quoteRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", message: "Укажите страну доставки." };
  }

  if (!(await isSupportedCountry(parsed.data.countryCode))) {
    return {
      status: "error",
      message: "В эту страну мы пока не отправляем — напишите нам.",
    };
  }

  try {
    const quote = await buildCheckoutQuote({
      countryCode: parsed.data.countryCode,
      vatNumber: parsed.data.vatNumber ?? null,
      shippingMethodId: parsed.data.shippingMethodId ?? null,
    });

    return { status: "ok", quote };
  } catch (error) {
    console.error("checkout.quote", error);
    return { status: "error", message: "Не удалось рассчитать заказ." };
  }
}

/** Снимок адреса для заказа: пустые строки не храним. */
function toSnapshot(input: {
  recipientName: string;
  phone?: string | undefined;
  companyName?: string | undefined;
  vatNumber?: string | undefined;
  countryCode: string;
  state?: string | undefined;
  city: string;
  postalCode: string;
  line1: string;
  line2?: string | undefined;
}): OrderAddressSnapshot {
  return {
    recipientName: input.recipientName,
    countryCode: input.countryCode,
    city: input.city,
    postalCode: input.postalCode,
    line1: input.line1,
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.companyName ? { companyName: input.companyName } : {}),
    ...(input.vatNumber ? { vatNumber: input.vatNumber } : {}),
    ...(input.state ? { state: input.state } : {}),
    ...(input.line2 ? { line2: input.line2 } : {}),
  };
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function placeOrderAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();

  const addressId = optionalText(formData.get("addressId"));
  const useNewAddress = !addressId;

  const parsed = placeOrderSchema.safeParse({
    addressId,
    address: useNewAddress
      ? {
          recipientName: formData.get("recipientName"),
          phone: optionalText(formData.get("phone")),
          companyName: optionalText(formData.get("companyName")),
          vatNumber: optionalText(formData.get("vatNumber")),
          countryCode: formData.get("countryCode"),
          state: optionalText(formData.get("state")),
          city: formData.get("city"),
          postalCode: formData.get("postalCode"),
          line1: formData.get("line1"),
          line2: optionalText(formData.get("line2")),
        }
      : undefined,
    email: optionalText(formData.get("email")) ?? user?.email,
    shippingMethodId: formData.get("shippingMethodId"),
    customerNote: optionalText(formData.get("customerNote")),
    acceptTerms: formData.get("acceptTerms") === "on",
    saveAddress: formData.get("saveAddress") === "on",
  });

  if (!parsed.success) {
    return formError("Проверьте заполнение полей.", fieldErrorsFrom(parsed.error));
  }

  const input = parsed.data;

  // Подтверждённый адрес: на него уходят документы и статусы заказа.
  if (REQUIRE_VERIFIED_EMAIL_FOR_ORDER && user && !user.emailVerified) {
    return formError(
      "Подтвердите адрес электронной почты — мы отправили письмо со ссылкой.",
    );
  }

  const email = input.email ?? user?.email;
  if (!email) {
    return formError("Укажите email для подтверждения заказа.", {
      email: "Обязательное поле",
    });
  }

  // Адрес: либо из книги (строго свой), либо из формы.
  let snapshot: OrderAddressSnapshot;

  if (input.addressId) {
    if (!user) return formError("Войдите, чтобы использовать сохранённый адрес.");

    const [saved] = await db
      .select()
      .from(address)
      .where(and(eq(address.id, input.addressId), eq(address.userId, user.id)))
      .limit(1);

    if (!saved) return formError("Адрес не найден.");

    snapshot = toSnapshot({
      recipientName: saved.recipientName,
      phone: saved.phone ?? undefined,
      companyName: saved.companyName ?? undefined,
      vatNumber: saved.vatNumber ?? undefined,
      countryCode: saved.countryCode,
      state: saved.state ?? undefined,
      city: saved.city,
      postalCode: saved.postalCode,
      line1: saved.line1,
      line2: saved.line2 ?? undefined,
    });
  } else if (input.address) {
    snapshot = toSnapshot(input.address);
  } else {
    return formError("Укажите адрес доставки.");
  }

  if (!(await isSupportedCountry(snapshot.countryCode))) {
    return formError("В эту страну мы пока не отправляем — напишите нам.");
  }

  const activeCart = await findActiveCart();
  if (!activeCart) return formError("Корзина пуста.");

  const result = await placeOrder({
    userId: user?.id ?? null,
    cartId: activeCart.id,
    email,
    shippingAddress: snapshot,
    billingAddress: null,
    shippingMethodId: input.shippingMethodId,
    customerNote: input.customerNote,
  });

  if (result.status === "error") {
    return formError(result.message);
  }

  // Новый адрес сохраняем в книгу только по просьбе покупателя.
  if (user && input.saveAddress && input.address) {
    try {
      await db.insert(address).values({
        ...input.address,
        userId: user.id,
        type: "shipping",
      });
    } catch (error) {
      // Не повод отменять уже созданный заказ.
      console.error("checkout.saveAddress", error);
    }
  }

  // Корзина переведена в заказ — гостевой cookie больше не нужен.
  if (!user) await clearGuestCartToken();

  // Следующий шаг покупателя — выбрать способ оплаты.
  redirect(`/checkout/payment/${result.orderId}` as Route);
}
