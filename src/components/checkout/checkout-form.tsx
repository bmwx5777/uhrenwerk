"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { CountryOption } from "@/components/account/address-form-sheet";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { placeOrderAction, quoteAction } from "@/server/actions/checkout";
import type { CheckoutQuote } from "@/server/services/checkout";
import type { UserAddress } from "@/server/services/account";
import { AddressFields } from "./address-fields";
import { OrderSummary } from "./order-summary";

const NEW_ADDRESS = "new";

type CheckoutFormProps = {
  user: { email: string; emailVerified: boolean; name: string } | null;
  addresses: UserAddress[];
  countries: CountryOption[];
  initialQuote: CheckoutQuote;
  initialCountryCode: string;
};

/**
 * Форма оформления заказа.
 *
 * Страна доставки, VAT-номер и способ доставки меняют налог и стоимость,
 * поэтому при их изменении форма запрашивает у сервера новый расчёт.
 * Сама она не умножает и не складывает деньги — только показывает то,
 * что вернул сервер.
 */
export function CheckoutForm({
  user,
  addresses,
  countries,
  initialQuote,
  initialCountryCode,
}: CheckoutFormProps) {
  const shippingAddresses = addresses.filter((item) => item.type === "shipping");
  const defaultAddress =
    shippingAddresses.find((item) => item.isDefault) ?? shippingAddresses[0];

  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? NEW_ADDRESS);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [vatNumber, setVatNumber] = useState(defaultAddress?.vatNumber ?? "");
  const [quote, setQuote] = useState(initialQuote);
  const [shippingMethodId, setShippingMethodId] = useState(
    initialQuote.selectedShippingId ?? "",
  );
  const [isRefreshing, startRefresh] = useTransition();

  const { formAction, isPending, fieldError } = useFormAction(placeOrderAction);

  function refreshQuote(next: {
    countryCode: string;
    vatNumber: string;
    shippingMethodId: string;
  }) {
    startRefresh(async () => {
      const result = await quoteAction({
        countryCode: next.countryCode,
        vatNumber: next.vatNumber || undefined,
        shippingMethodId: next.shippingMethodId || undefined,
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      setQuote(result.quote);

      // Способ доставки из другой зоны больше не подходит — берём первый
      // доступный, чтобы сумма на экране всегда соответствовала выбору.
      const stillAvailable = result.quote.shippingOptions.some(
        (option) => option.id === next.shippingMethodId,
      );
      if (!stillAvailable) {
        setShippingMethodId(result.quote.selectedShippingId ?? "");
      }
    });
  }

  function selectSavedAddress(id: string) {
    setAddressId(id);

    const saved = shippingAddresses.find((item) => item.id === id);
    const nextCountry = saved?.countryCode ?? countryCode;
    const nextVat = saved?.vatNumber ?? "";

    setCountryCode(nextCountry);
    setVatNumber(nextVat);
    refreshQuote({
      countryCode: nextCountry,
      vatNumber: nextVat,
      shippingMethodId,
    });
  }

  function selectShipping(id: string) {
    setShippingMethodId(id);
    refreshQuote({ countryCode, vatNumber, shippingMethodId: id });
  }

  const usingNewAddress = addressId === NEW_ADDRESS;

  return (
    <form
      action={formAction}
      className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16"
    >
      <input type="hidden" name="shippingMethodId" value={shippingMethodId} />
      {!usingNewAddress ? (
        <input type="hidden" name="addressId" value={addressId} />
      ) : null}

      <div className="flex flex-col gap-10">
        {/* Контакт */}
        <section>
          <h2 className="eyebrow">Контакт</h2>
          {user ? (
            <div className="mt-4 text-sm">
              <p>{user.email}</p>
              {!user.emailVerified ? (
                <p className="mt-2 text-warning-600">
                  Адрес не подтверждён. Подтвердите его в{" "}
                  <Link href="/account" className="underline">
                    личном кабинете
                  </Link>
                  : на этот адрес уйдут документы по заказу.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <Field
                label="Email"
                hint="Пришлём подтверждение и статусы заказа"
                error={fieldError("email")}
                required
              >
                {(control) => (
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    {...control}
                  />
                )}
              </Field>
              <p className="text-sm text-subtle">
                Уже покупали у нас?{" "}
                <Link href="/sign-in?next=/checkout" className="underline">
                  Войдите
                </Link>
                , чтобы адреса подставились автоматически.
              </p>
            </div>
          )}
        </section>

        {/* Адрес доставки */}
        <section>
          <h2 className="eyebrow">Адрес доставки</h2>

          {shippingAddresses.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {shippingAddresses.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer gap-3 border p-4 text-sm transition-colors",
                    addressId === item.id
                      ? "border-accent bg-accent-soft/40"
                      : "border-border-control hover:border-border-hover",
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={addressId === item.id}
                    onChange={() => selectSavedAddress(item.id)}
                    className="mt-0.5 size-4 accent-accent"
                  />
                  <span>
                    <span className="block">{item.recipientName}</span>
                    <span className="block text-muted">
                      {item.line1}
                      {item.line2 ? `, ${item.line2}` : ""}, {item.postalCode}{" "}
                      {item.city}, {item.countryCode}
                    </span>
                  </span>
                </label>
              ))}

              <label
                className={cn(
                  "flex cursor-pointer gap-3 border p-4 text-sm transition-colors",
                  usingNewAddress
                    ? "border-accent bg-accent-soft/40"
                    : "border-border-control hover:border-border-hover",
                )}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={usingNewAddress}
                  onChange={() => selectSavedAddress(NEW_ADDRESS)}
                  className="mt-0.5 size-4 accent-accent"
                />
                Другой адрес
              </label>
            </div>
          ) : null}

          {usingNewAddress ? (
            <div className="mt-6">
              <AddressFields
                countries={countries}
                countryCode={countryCode}
                onCountryChange={(next) => {
                  setCountryCode(next);
                  refreshQuote({
                    countryCode: next,
                    vatNumber,
                    shippingMethodId,
                  });
                }}
                vatNumber={vatNumber}
                onVatNumberChange={(next) => {
                  setVatNumber(next);
                  refreshQuote({
                    countryCode,
                    vatNumber: next,
                    shippingMethodId,
                  });
                }}
                fieldError={fieldError}
              />

              {user ? (
                <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="saveAddress"
                    className="size-4 accent-accent"
                  />
                  Сохранить адрес в личном кабинете
                </label>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Доставка */}
        <section>
          <h2 className="eyebrow">Доставка</h2>

          {quote.shippingOptions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {quote.shippingOptions.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 border p-4 text-sm transition-colors",
                    shippingMethodId === option.id
                      ? "border-accent bg-accent-soft/40"
                      : "border-border-control hover:border-border-hover",
                  )}
                >
                  <input
                    type="radio"
                    name="shippingOption"
                    checked={shippingMethodId === option.id}
                    onChange={() => selectShipping(option.id)}
                    className="mt-0.5 size-4 accent-accent"
                  />
                  <span className="flex-1">
                    <span className="block">{option.name}</span>
                    <span className="block text-muted">
                      {option.minDays}–{option.maxDays} рабочих дней
                      {option.isInsured ? " · застрахована" : ""}
                    </span>
                    {option.description ? (
                      <span className="mt-1 block text-xs text-subtle">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="whitespace-nowrap">
                    {option.isFree || option.displayCents === 0
                      ? "бесплатно"
                      : formatMoney(option.displayCents)}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Для выбранной страны доставка пока не настроена — напишите нам, подберём
              вариант.
            </p>
          )}
        </section>

        {/* Комментарий */}
        <section>
          <h2 className="eyebrow">Комментарий к заказу</h2>
          <div className="mt-4">
            <Field label="Пожелания по доставке" error={fieldError("customerNote")}>
              {(control) => (
                <Textarea
                  name="customerNote"
                  rows={3}
                  maxLength={500}
                  placeholder="Например: позвонить за час до доставки"
                  {...control}
                />
              )}
            </Field>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-10 lg:self-start">
        <OrderSummary quote={quote} isRefreshing={isRefreshing} />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              Я согласен с{" "}
              <Link href="/terms" className="underline" target="_blank">
                условиями продажи
              </Link>{" "}
              и{" "}
              <Link href="/privacy" className="underline" target="_blank">
                политикой конфиденциальности
              </Link>
              .
            </span>
          </label>
          {fieldError("acceptTerms") ? (
            <p className="mt-2 text-xs text-danger-600" role="alert">
              {fieldError("acceptTerms")}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            isPending={isPending}
            disabled={
              isRefreshing ||
              quote.isEmpty ||
              quote.hasUnavailableLines ||
              shippingMethodId === ""
            }
          >
            Оформить заказ
          </Button>

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Заказ создаётся со статусом «ожидает оплаты»: товар резервируется, а выбор
            способа оплаты появится на этапе 8.
          </p>
        </div>
      </aside>
    </form>
  );
}
