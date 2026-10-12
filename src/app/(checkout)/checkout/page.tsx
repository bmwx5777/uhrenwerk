import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { HOME_COUNTRY_CODE } from "@/lib/constants/tax";
import { getCurrentUser } from "@/server/auth/session";
import { getCartSummary } from "@/server/services/cart";
import { listAddresses, listCountries } from "@/server/services/account";
import { buildCheckoutQuote } from "@/server/services/checkout";

export const metadata: Metadata = {
  title: "Оформление заказа",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCartSummary()]);

  if (cart.lines.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={ShoppingBag}
          title="Оформлять нечего"
          description="Корзина пуста — выберите часы в каталоге, и мы придержим их на время оформления."
          action={
            <Button asChild>
              <Link href="/catalog">В каталог</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [addresses, countries] = await Promise.all([
    user ? listAddresses(user.id) : Promise.resolve([]),
    listCountries(),
  ]);

  // Страна по умолчанию: из основного адреса доставки, иначе домашняя.
  const defaultAddress =
    addresses.find((item) => item.type === "shipping" && item.isDefault) ??
    addresses.find((item) => item.type === "shipping");

  const initialCountryCode = defaultAddress?.countryCode ?? HOME_COUNTRY_CODE;

  const initialQuote = await buildCheckoutQuote({
    countryCode: initialCountryCode,
    vatNumber: defaultAddress?.vatNumber ?? null,
  });

  return (
    <div className="container-page py-10 md:py-14">
      <p className="eyebrow">Шаг 1 из 2</p>
      <h1 className="mt-4 font-display text-headline font-medium">Оформление заказа</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Проверьте состав заказа и адрес. Сумма пересчитывается на сервере при каждом
        изменении страны или способа доставки.
      </p>

      <div className="mt-10">
        <CheckoutForm
          user={
            user
              ? {
                  email: user.email,
                  emailVerified: user.emailVerified,
                  name: user.name,
                }
              : null
          }
          addresses={addresses}
          countries={countries}
          initialQuote={initialQuote}
          initialCountryCode={initialCountryCode}
        />
      </div>
    </div>
  );
}
