import type { Metadata } from "next";
import Link from "next/link";

import { OrderLookupForm } from "@/components/order/order-lookup-form";

export const metadata: Metadata = {
  title: "Статус заказа",
  description: "Проверить статус заказа по номеру и адресу электронной почты.",
  robots: { index: false },
};

export default function OrderLookupPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="max-w-xl">
        <p className="eyebrow">Заказ без регистрации</p>
        <h1 className="mt-4 font-display text-headline font-medium">Статус заказа</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Если вы оформляли заказ без аккаунта, найдите его по номеру из письма. У
          зарегистрированных покупателей все заказы собраны в{" "}
          <Link href="/account/orders" className="underline">
            личном кабинете
          </Link>
          .
        </p>

        <div className="mt-10">
          <OrderLookupForm />
        </div>
      </div>
    </div>
  );
}
