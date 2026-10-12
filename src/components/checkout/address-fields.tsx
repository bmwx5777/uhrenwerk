"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CountryOption } from "@/components/account/address-form-sheet";

type AddressFieldsProps = {
  countries: CountryOption[];
  countryCode: string;
  onCountryChange: (countryCode: string) => void;
  vatNumber: string;
  onVatNumberChange: (vatNumber: string) => void;
  fieldError: (name: string) => string | undefined;
};

/**
 * Поля адреса доставки в checkout.
 *
 * Страна и VAT-номер подняты в состояние родителя: их изменение меняет
 * налог и доступные способы доставки, а значит требует пересчёта на
 * сервере. Остальные поля — обычный ввод, он никуда не влияет до отправки.
 */
export function AddressFields({
  countries,
  countryCode,
  onCountryChange,
  vatNumber,
  onVatNumberChange,
  fieldError,
}: AddressFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Получатель" error={fieldError("recipientName")} required>
        {(control) => (
          <Input name="recipientName" autoComplete="name" required {...control} />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Телефон" hint="Нужен курьеру" error={fieldError("phone")}>
          {(control) => (
            <Input name="phone" type="tel" autoComplete="tel" {...control} />
          )}
        </Field>

        <Field label="Страна" error={fieldError("countryCode")} required>
          {(control) => (
            <select
              name="countryCode"
              value={countryCode}
              onChange={(event) => onCountryChange(event.target.value)}
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
      </div>

      <Field label="Улица, дом" error={fieldError("line1")} required>
        {(control) => (
          <Input name="line1" autoComplete="address-line1" required {...control} />
        )}
      </Field>

      <Field label="Квартира, этаж" error={fieldError("line2")}>
        {(control) => <Input name="line2" autoComplete="address-line2" {...control} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Город" error={fieldError("city")} required>
          {(control) => (
            <Input name="city" autoComplete="address-level2" required {...control} />
          )}
        </Field>

        <Field label="Индекс" error={fieldError("postalCode")} required>
          {(control) => (
            <Input name="postalCode" autoComplete="postal-code" required {...control} />
          )}
        </Field>

        <Field label="Регион" error={fieldError("state")}>
          {(control) => (
            <Input name="state" autoComplete="address-level1" {...control} />
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Компания" error={fieldError("companyName")}>
          {(control) => (
            <Input name="companyName" autoComplete="organization" {...control} />
          )}
        </Field>

        <Field
          label="VAT-номер"
          hint="Для компаний из ЕС: НДС не начисляется"
          error={fieldError("vatNumber")}
        >
          {(control) => (
            <Input
              name="vatNumber"
              value={vatNumber}
              onChange={(event) => onVatNumberChange(event.target.value)}
              placeholder="DE123456789"
              {...control}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
