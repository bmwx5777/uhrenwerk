import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { AddressFormSheet } from "@/components/account/address-form-sheet";
import { AddressList } from "@/components/account/address-list";
import { EmptyState } from "@/components/feedback/empty-state";
import { requireUser } from "@/server/auth/session";
import { listAddresses, listCountries } from "@/server/services/account";

export const metadata: Metadata = {
  title: "Адреса",
  robots: { index: false },
};

export default async function AddressesPage() {
  const user = await requireUser();
  const [addresses, countries] = await Promise.all([
    listAddresses(user.id),
    listCountries(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="eyebrow">Адресная книга</h2>
        {addresses.length > 0 ? <AddressFormSheet countries={countries} /> : null}
      </div>

      <div className="mt-6">
        {addresses.length > 0 ? (
          <AddressList addresses={addresses} countries={countries} />
        ) : (
          <EmptyState
            icon={MapPin}
            title="Адресов пока нет"
            description="Добавьте адрес доставки заранее — при оформлении заказа его останется только выбрать."
            action={<AddressFormSheet countries={countries} />}
          />
        )}
      </div>
    </div>
  );
}
