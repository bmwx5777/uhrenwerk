"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/constants/order-status";
import { formatMoney } from "@/lib/money";
import { lookupOrderAction } from "@/server/actions/order-lookup";

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function OrderLookupForm() {
  const { formAction, isPending, fieldError, state } = useFormAction(lookupOrderAction);
  const found = state?.status === "ok" ? state.order : undefined;

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-5">
        <Field
          label="Номер заказа"
          hint="Из письма с подтверждением: UW-2026-000123"
          error={fieldError("orderNumber")}
          required
        >
          {(control) => (
            <Input
              name="orderNumber"
              placeholder="UW-2026-000123"
              required
              {...control}
            />
          )}
        </Field>

        <Field label="Email заказа" error={fieldError("email")} required>
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

        <Button type="submit" isPending={isPending} className="self-start">
          Найти заказ
        </Button>
      </form>

      {found ? (
        <div className="card-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-sm">{found.orderNumber}</span>
            <OrderStatusBadge status={found.status} />
          </div>

          <p className="mt-2 text-xs text-subtle">
            {DATE_FORMATTER.format(new Date(found.placedAt))}
          </p>

          <p className="mt-4 text-sm text-muted">
            {ORDER_STATUS_META[found.status as OrderStatus]?.description ?? ""}
          </p>

          <ul className="mt-5 divide-y divide-border text-sm">
            {found.itemNames.map((name, index) => (
              <li key={`${name}-${index}`} className="py-2">
                {name}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between gap-4 border-t border-border pt-4 text-sm">
            <span className="text-muted">Доставка · {found.shippingMethodName}</span>
            <span>{formatMoney(found.totalCents)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
