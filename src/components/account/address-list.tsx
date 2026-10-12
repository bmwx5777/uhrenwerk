"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAddressAction, setDefaultAddressAction } from "@/server/actions/account";
import type { UserAddress } from "@/server/services/account";
import { AddressFormSheet, type CountryOption } from "./address-form-sheet";

const TYPE_LABELS = {
  shipping: "Доставка",
  billing: "Счёт",
} as const;

type AddressListProps = {
  addresses: UserAddress[];
  countries: CountryOption[];
};

export function AddressList({ addresses, countries }: AddressListProps) {
  const [pendingDelete, setPendingDelete] = useState<UserAddress | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSetDefault(addressId: string) {
    startTransition(async () => {
      const result = await setDefaultAddressAction(addressId);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const result = await deleteAddressAction(pendingDelete.id);
    if (result.status === "ok") toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((item) => (
          <article key={item.id} className="card-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
              {item.isDefault ? <Badge variant="accent">По умолчанию</Badge> : null}
            </div>

            <p className="mt-4 text-sm">{item.recipientName}</p>
            {item.companyName ? (
              <p className="text-sm text-muted">{item.companyName}</p>
            ) : null}

            <address className="mt-2 text-sm leading-relaxed text-muted not-italic">
              {item.line1}
              {item.line2 ? `, ${item.line2}` : ""}
              <br />
              {item.postalCode} {item.city}
              {item.state ? `, ${item.state}` : ""}
              <br />
              {item.countryCode}
            </address>

            {item.phone ? (
              <p className="mt-2 text-sm text-subtle">{item.phone}</p>
            ) : null}
            {item.vatNumber ? (
              <p className="mt-1 font-mono text-xs text-subtle">VAT {item.vatNumber}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <AddressFormSheet address={item} countries={countries} />

              {!item.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0"
                  disabled={isPending}
                  onClick={() => handleSetDefault(item.id)}
                >
                  Сделать основным
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                className="ml-auto px-0 text-danger-600"
                onClick={() => setPendingDelete(item)}
              >
                Удалить
              </Button>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        destructive
        title="Удалить адрес?"
        description={
          pendingDelete
            ? `${pendingDelete.recipientName}, ${pendingDelete.city} — адрес будет удалён из книги. Оформленные заказы это не затронет: в них хранится копия адреса.`
            : ""
        }
        confirmLabel="Удалить"
        onConfirm={handleDelete}
      />
    </>
  );
}
