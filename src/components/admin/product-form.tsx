"use client";

import { useState } from "react";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { grossEurFromNetCents } from "@/lib/pricing";
import { createProductAction, updateProductAction } from "@/server/actions/admin";
import type { ProductSpecs } from "@/server/db/schema/catalog";

type Option = { id: string; name: string };

type ProductFormProps = {
  brands: Option[];
  categories: Option[];
  product?: {
    id: string;
    slug: string;
    sku: string;
    name: string;
    reference: string | null;
    brandId: string;
    categoryId: string;
    kind: "stocked" | "serialized";
    status: "draft" | "active" | "archived";
    condition: "new" | "unworn" | "pre_owned";
    vatScheme: "standard" | "margin";
    shortDescription: string | null;
    description: string | null;
    priceCents: number | null;
    compareAtPriceCents: number | null;
    isFeatured: boolean;
    specs: ProductSpecs;
    inventory: { quantity: number; lowStockThreshold: number } | null;
  };
};

const SELECT_CLASSES =
  "border-border-control bg-surface h-12 w-full border px-4 text-sm";

/**
 * Текстовое поле формы товара.
 *
 * Объявлено на уровне модуля, а не внутри компонента: иначе React видел бы
 * новый тип компонента на каждом рендере и пересоздавал бы поле — ввод
 * терял бы фокус и состояние. На это же указывает правило
 * react-hooks/static-components.
 */
function TextField({
  label,
  name,
  defaultValue,
  hint,
  required,
  type = "text",
  step,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | undefined;
  hint?: string;
  required?: boolean;
  type?: string;
  step?: string;
  error?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(control) => (
        <Input
          name={name}
          type={type}
          step={step}
          defaultValue={defaultValue ?? ""}
          required={required}
          {...control}
        />
      )}
    </Field>
  );
}

/**
 * Форма товара: создание и редактирование одним компонентом.
 *
 * Цена вводится так, как её назначают — розничной, с НДС. Перевод в
 * нетто делает сервер, и он же предупредит, если круглая сумма окажется
 * непредставимой при округлении до цента.
 */
export function ProductForm({ brands, categories, product }: ProductFormProps) {
  const isEdit = Boolean(product);
  const { formAction, isPending, fieldError } = useFormAction(
    isEdit ? updateProductAction : createProductAction,
  );

  // Тип товара влияет на то, где живёт цена: у обычного — в товаре,
  // у уникального — в каждом экземпляре.
  const [kind, setKind] = useState(product?.kind ?? "stocked");

  const specs = product?.specs ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

      <section className="flex flex-col gap-5">
        <h2 className="eyebrow">Основное</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            error={fieldError("name")}
            label="Название"
            name="name"
            defaultValue={product?.name}
            required
          />
          <TextField
            error={fieldError("reference")}
            label="Заводской референс"
            name="reference"
            defaultValue={product?.reference ?? ""}
            hint="Например 310.30.42.50.01.001"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            error={fieldError("slug")}
            label="Slug"
            name="slug"
            defaultValue={product?.slug}
            hint="Адрес страницы: /product/slug"
            required
          />
          <TextField
            error={fieldError("sku")}
            label="Артикул (SKU)"
            name="sku"
            defaultValue={product?.sku}
            required
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Бренд" error={fieldError("brandId")} required>
            {(control) => (
              <select
                name="brandId"
                defaultValue={product?.brandId ?? ""}
                className={SELECT_CLASSES}
                required
                {...control}
              >
                <option value="">— выберите —</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Категория" error={fieldError("categoryId")} required>
            {(control) => (
              <select
                name="categoryId"
                defaultValue={product?.categoryId ?? ""}
                className={SELECT_CLASSES}
                required
                {...control}
              >
                <option value="">— выберите —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Тип товара" error={fieldError("kind")}>
            {(control) => (
              <select
                name="kind"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as "stocked" | "serialized")
                }
                className={SELECT_CLASSES}
                {...control}
              >
                <option value="stocked">Обычный (склад)</option>
                <option value="serialized">Уникальные экземпляры</option>
              </select>
            )}
          </Field>

          <Field label="Статус" error={fieldError("status")}>
            {(control) => (
              <select
                name="status"
                defaultValue={product?.status ?? "draft"}
                className={SELECT_CLASSES}
                {...control}
              >
                <option value="draft">Черновик</option>
                <option value="active">В продаже</option>
                <option value="archived">Архив</option>
              </select>
            )}
          </Field>

          <Field label="Состояние" error={fieldError("condition")}>
            {(control) => (
              <select
                name="condition"
                defaultValue={product?.condition ?? "new"}
                className={SELECT_CLASSES}
                {...control}
              >
                <option value="new">Новые</option>
                <option value="unworn">Неношеные</option>
                <option value="pre_owned">Pre-owned</option>
              </select>
            )}
          </Field>
        </div>

        <Field
          label="Краткое описание"
          hint="Одна строка под названием в каталоге"
          error={fieldError("shortDescription")}
        >
          {(control) => (
            <Textarea
              name="shortDescription"
              rows={2}
              maxLength={300}
              defaultValue={product?.shortDescription ?? ""}
              {...control}
            />
          )}
        </Field>

        <Field label="Полное описание" error={fieldError("description")}>
          {(control) => (
            <Textarea
              name="description"
              rows={6}
              maxLength={4000}
              defaultValue={product?.description ?? ""}
              {...control}
            />
          )}
        </Field>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={product?.isFeatured ?? false}
            className="size-4 accent-accent"
          />
          Показывать в подборках на главной
        </label>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="eyebrow">Цена и налог</h2>
        <p className="text-xs leading-relaxed text-subtle">
          Цена вводится розничной, с НДС 19 % — так, как её увидит покупатель из ЕС. В
          базе хранится цена без налога: сервер пересчитает её сам. Для товара из
          уникальных экземпляров цена задаётся у каждого экземпляра отдельно.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            error={fieldError("priceGrossEur")}
            label="Цена с НДС, €"
            name="priceGrossEur"
            type="number"
            step="0.01"
            defaultValue={
              product?.priceCents
                ? grossEurFromNetCents(product.priceCents, product.vatScheme)
                : ""
            }
            hint={kind === "serialized" ? "Можно оставить пустым" : undefined}
            required={kind === "stocked"}
          />
          <TextField
            error={fieldError("compareAtGrossEur")}
            label="Старая цена с НДС, €"
            name="compareAtGrossEur"
            type="number"
            step="0.01"
            defaultValue={
              product?.compareAtPriceCents
                ? grossEurFromNetCents(product.compareAtPriceCents, product.vatScheme)
                : ""
            }
            hint="Показывается зачёркнутой"
          />
        </div>

        <Field
          label="Режим НДС"
          hint="«Схема маржи» — для pre-owned, купленных у частных лиц: НДС не выделяется в счёте"
          error={fieldError("vatScheme")}
        >
          {(control) => (
            <select
              name="vatScheme"
              defaultValue={product?.vatScheme ?? "standard"}
              className={SELECT_CLASSES}
              {...control}
            >
              <option value="standard">Обычный</option>
              <option value="margin">Схема маржи</option>
            </select>
          )}
        </Field>
      </section>

      {kind === "stocked" ? (
        <section className="flex flex-col gap-5">
          <h2 className="eyebrow">Склад</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              error={fieldError("stockQuantity")}
              label="Остаток, шт."
              name="stockQuantity"
              type="number"
              defaultValue={product?.inventory?.quantity ?? 0}
            />
            <TextField
              error={fieldError("lowStockThreshold")}
              label="Порог «осталось мало»"
              name="lowStockThreshold"
              type="number"
              defaultValue={product?.inventory?.lowStockThreshold ?? 1}
            />
          </div>
        </section>
      ) : (
        <input
          type="hidden"
          name="stockQuantity"
          value={product?.inventory?.quantity ?? 0}
        />
      )}

      <section className="flex flex-col gap-5">
        <h2 className="eyebrow">Характеристики</h2>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Механизм" error={fieldError("movement")}>
            {(control) => (
              <select
                name="movement"
                defaultValue={specs.movement ?? ""}
                className={SELECT_CLASSES}
                {...control}
              >
                <option value="">—</option>
                <option value="automatic">Автоподзавод</option>
                <option value="manual">Ручной завод</option>
                <option value="spring_drive">Spring Drive</option>
                <option value="quartz">Кварцевый</option>
                <option value="solar">Solar</option>
              </select>
            )}
          </Field>

          <TextField
            error={fieldError("caliber")}
            label="Калибр"
            name="caliber"
            defaultValue={specs.caliber ?? ""}
          />
          <TextField
            error={fieldError("powerReserveHours")}
            label="Запас хода, ч"
            name="powerReserveHours"
            type="number"
            defaultValue={specs.powerReserveHours ?? ""}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            error={fieldError("caseMaterial")}
            label="Материал корпуса"
            name="caseMaterial"
            defaultValue={specs.caseMaterial ?? ""}
          />
          <TextField
            error={fieldError("caseDiameterMm")}
            label="Диаметр, мм"
            name="caseDiameterMm"
            type="number"
            step="0.1"
            defaultValue={specs.caseDiameterMm ?? ""}
          />
          <TextField
            error={fieldError("caseThicknessMm")}
            label="Толщина, мм"
            name="caseThicknessMm"
            type="number"
            step="0.1"
            defaultValue={specs.caseThicknessMm ?? ""}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            error={fieldError("lugWidthMm")}
            label="Ширина ушек, мм"
            name="lugWidthMm"
            type="number"
            defaultValue={specs.lugWidthMm ?? ""}
          />
          <TextField
            error={fieldError("waterResistanceM")}
            label="Водозащита, м"
            name="waterResistanceM"
            type="number"
            defaultValue={specs.waterResistanceM ?? ""}
          />
          <TextField
            error={fieldError("crystal")}
            label="Стекло"
            name="crystal"
            defaultValue={specs.crystal ?? ""}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            error={fieldError("dialColor")}
            label="Циферблат"
            name="dialColor"
            defaultValue={specs.dialColor ?? ""}
          />
          <TextField
            error={fieldError("braceletMaterial")}
            label="Браслет / ремень"
            name="braceletMaterial"
            defaultValue={specs.braceletMaterial ?? ""}
          />
          <Field label="Размер" error={fieldError("gender")}>
            {(control) => (
              <select
                name="gender"
                defaultValue={specs.gender ?? ""}
                className={SELECT_CLASSES}
                {...control}
              >
                <option value="">—</option>
                <option value="men">Мужские</option>
                <option value="women">Женские</option>
                <option value="unisex">Унисекс</option>
              </select>
            )}
          </Field>
        </div>

        <TextField
          error={fieldError("complications")}
          label="Функции"
          name="complications"
          defaultValue={specs.complications?.join(", ") ?? ""}
          hint="Через запятую: Хронограф, Дата, GMT"
        />
      </section>

      <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm md:static md:mx-0 md:border-none md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <Button type="submit" isPending={isPending} size="lg">
          {isEdit ? "Сохранить" : "Создать товар"}
        </Button>
      </div>
    </form>
  );
}
