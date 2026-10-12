"use client";

import { Check, Package, ScrollText } from "lucide-react";
import { useState } from "react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatDisplayPrice, type VatScheme } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const CONDITION_GRADE_LABELS: Record<string, string> = {
  unworn: "Неношеные",
  excellent: "Отличное состояние",
  very_good: "Очень хорошее состояние",
  good: "Хорошее состояние",
  fair: "Удовлетворительное состояние",
};

export type SelectableUnit = {
  id: string;
  unitCode: string;
  serialNumber: string | null;
  productionYear: number | null;
  conditionGrade: string;
  hasBox: boolean;
  hasPapers: boolean;
  warrantyMonths: number;
  priceCents: number;
  vatScheme: VatScheme | null;
};

type UnitSelectorProps = {
  productId: string;
  units: SelectableUnit[];
  /** Режим НДС модели: используется, если у экземпляра он не переопределён. */
  productVatScheme: VatScheme;
};

/**
 * Выбор конкретного экземпляра pre-owned часов.
 *
 * У каждого экземпляра своя цена, год и комплектность — поэтому выбирается
 * не «количество», а конкретные часы. Выбранный `unitId` на этапе 6 уйдёт
 * в корзину: сервер всё равно перечитает цену из базы по этому id.
 */
export function UnitSelector({
  productId,
  units,
  productVatScheme,
}: UnitSelectorProps) {
  const [selectedId, setSelectedId] = useState(units[0]?.id ?? null);
  const selected = units.find((unit) => unit.id === selectedId) ?? units[0];

  if (!selected) return null;

  return (
    <div>
      <p className="eyebrow mb-4">
        {units.length === 1
          ? "Доступный экземпляр"
          : `Доступно экземпляров: ${units.length}`}
      </p>

      <div className="flex flex-col gap-3">
        {units.map((unit) => {
          const isSelected = unit.id === selected.id;
          const scheme = unit.vatScheme ?? productVatScheme;

          return (
            <label
              key={unit.id}
              className={cn(
                "flex cursor-pointer gap-4 rounded-lg border p-4 transition-colors",
                isSelected
                  ? "border-accent bg-accent-soft/40"
                  : "border-border-control hover:border-border-hover",
              )}
            >
              <input
                type="radio"
                name="product-unit"
                value={unit.id}
                checked={isSelected}
                onChange={() => setSelectedId(unit.id)}
                className="mt-1 size-4 accent-accent"
              />

              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm">
                    {unit.productionYear
                      ? `${unit.productionYear} год`
                      : "Год не указан"}
                  </span>
                  <span className="text-base">
                    {formatDisplayPrice(unit.priceCents, scheme)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {CONDITION_GRADE_LABELS[unit.conditionGrade] ?? unit.conditionGrade}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
                  <span className="flex items-center gap-1.5">
                    <Package className="size-3.5" aria-hidden />
                    {unit.hasBox ? "Коробка есть" : "Без коробки"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ScrollText className="size-3.5" aria-hidden />
                    {unit.hasPapers ? "Документы есть" : "Без документов"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5" aria-hidden />
                    Гарантия {unit.warrantyMonths} мес.
                  </span>
                </div>

                <p className="mt-2 font-mono text-xs text-subtle">
                  {unit.unitCode}
                  {unit.serialNumber ? ` · S/N ${unit.serialNumber}` : ""}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <AddToCartButton
        className="mt-6 w-full"
        productId={productId}
        productUnitId={selected.id}
      />
      <p className="mt-3 text-xs text-subtle">
        Мы придержим экземпляр на время оформления заказа.
      </p>
    </div>
  );
}
