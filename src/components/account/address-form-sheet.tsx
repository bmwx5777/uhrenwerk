"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { createAddressAction, updateAddressAction } from "@/server/actions/account";
import type { UserAddress } from "@/server/services/account";

export type CountryOption = { code: string; name: string };

type AddressFormSheetProps = {
  countries: CountryOption[];
  /** Передан — редактирование, нет — создание нового адреса. */
  address?: UserAddress;
  triggerLabel?: string;
};

/**
 * Форма адреса в выезжающей панели.
 *
 * Результат обрабатывается прямо в обработчике отправки, а не в эффекте:
 * закрыть панель и показать ошибки по полям нужно по событию ответа, и так
 * обходится лишний каскад рендеров (и правило react-hooks о setState в useEffect).
 */
export function AddressFormSheet({
  countries,
  address,
  triggerLabel,
}: AddressFormSheetProps) {
  const isEdit = Boolean(address);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateAddressAction(null, formData)
        : await createAddressAction(null, formData);

      if (result.status === "ok") {
        toast.success(result.message);
        setFieldErrors({});
        setOpen(false);
      } else {
        toast.error(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="px-0">
            {triggerLabel ?? "Изменить"}
          </Button>
        ) : (
          <Button variant="secondary" className="gap-2">
            <Plus className="size-4" aria-hidden />
            {triggerLabel ?? "Добавить адрес"}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent title={isEdit ? "Изменить адрес" : "Новый адрес"} side="right">
        <form action={handleAction} className="flex flex-col gap-5">
          {address ? <input type="hidden" name="id" value={address.id} /> : null}

          <Field label="Тип адреса">
            {(control) => (
              <select
                name="type"
                defaultValue={address?.type ?? "shipping"}
                className="h-12 w-full rounded-md border border-border-control bg-surface-muted px-4 text-sm"
                {...control}
              >
                <option value="shipping">Доставка</option>
                <option value="billing">Выставление счёта</option>
              </select>
            )}
          </Field>

          <Field label="Получатель" error={fieldErrors.recipientName} required>
            {(control) => (
              <Input
                name="recipientName"
                defaultValue={address?.recipientName ?? ""}
                autoComplete="name"
                required
                {...control}
              />
            )}
          </Field>

          <Field label="Телефон" error={fieldErrors.phone}>
            {(control) => (
              <Input
                name="phone"
                type="tel"
                defaultValue={address?.phone ?? ""}
                autoComplete="tel"
                {...control}
              />
            )}
          </Field>

          <Field label="Страна" error={fieldErrors.countryCode} required>
            {(control) => (
              <select
                name="countryCode"
                defaultValue={address?.countryCode ?? "CY"}
                className="h-12 w-full rounded-md border border-border-control bg-surface-muted px-4 text-sm"
                required
                {...control}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Город" error={fieldErrors.city} required>
            {(control) => (
              <Input
                name="city"
                defaultValue={address?.city ?? ""}
                autoComplete="address-level2"
                required
                {...control}
              />
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Индекс" error={fieldErrors.postalCode} required>
              {(control) => (
                <Input
                  name="postalCode"
                  defaultValue={address?.postalCode ?? ""}
                  autoComplete="postal-code"
                  required
                  {...control}
                />
              )}
            </Field>

            <Field label="Регион" error={fieldErrors.state}>
              {(control) => (
                <Input
                  name="state"
                  defaultValue={address?.state ?? ""}
                  autoComplete="address-level1"
                  {...control}
                />
              )}
            </Field>
          </div>

          <Field label="Улица, дом" error={fieldErrors.line1} required>
            {(control) => (
              <Input
                name="line1"
                defaultValue={address?.line1 ?? ""}
                autoComplete="address-line1"
                required
                {...control}
              />
            )}
          </Field>

          <Field label="Квартира, этаж" error={fieldErrors.line2}>
            {(control) => (
              <Input
                name="line2"
                defaultValue={address?.line2 ?? ""}
                autoComplete="address-line2"
                {...control}
              />
            )}
          </Field>

          <Field
            label="Компания"
            hint="Для покупки на юридическое лицо"
            error={fieldErrors.companyName}
          >
            {(control) => (
              <Input
                name="companyName"
                defaultValue={address?.companyName ?? ""}
                autoComplete="organization"
                {...control}
              />
            )}
          </Field>

          <Field
            label="VAT-номер"
            hint="Для компаний из ЕС: при валидном номере НДС не начисляется"
            error={fieldErrors.vatNumber}
          >
            {(control) => (
              <Input
                name="vatNumber"
                defaultValue={address?.vatNumber ?? ""}
                placeholder="CY12345678X"
                {...control}
              />
            )}
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={address?.isDefault ?? false}
              className="size-4 accent-accent"
            />
            Использовать по умолчанию
          </label>

          <Button type="submit" isPending={isPending} className="mt-2 w-full">
            {isEdit ? "Сохранить" : "Добавить адрес"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
