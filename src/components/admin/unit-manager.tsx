"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { grossEurFromNetCents } from "@/lib/pricing";
import { deleteUnitAction, saveUnitAction } from "@/server/actions/admin";

export type AdminUnit = {
  id: string;
  unitCode: string;
  serialNumber: string | null;
  productionYear: number | null;
  conditionGrade: string;
  hasBox: boolean;
  hasPapers: boolean;
  warrantyMonths: number;
  priceCents: number;
  costCents: number | null;
  vatScheme: "standard" | "margin" | null;
  status: string;
  notes: string | null;
};

const UNIT_STATUS_LABELS: Record<string, string> = {
  available: "В продаже",
  reserved: "Зарезервирован",
  sold: "Продан",
  withdrawn: "Снят с продажи",
};

const GRADE_LABELS: Record<string, string> = {
  unworn: "Неношеные",
  excellent: "Отличное",
  very_good: "Очень хорошее",
  good: "Хорошее",
  fair: "Удовлетворительное",
};

const SELECT_CLASSES =
  "border-border-control bg-surface h-12 w-full border px-4 text-sm";

/**
 * Экземпляры pre-owned товара.
 *
 * Проданный или зарезервированный экземпляр нельзя удалить — на него
 * ссылается заказ. Вместо удаления у него есть статус «снят с продажи».
 */
export function UnitManager({
  productId,
  units,
  productVatScheme,
}: {
  productId: string;
  units: AdminUnit[];
  productVatScheme: "standard" | "margin";
}) {
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminUnit | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openFor(unit: AdminUnit | null) {
    setEditing(unit);
    setFieldErrors({});
    setIsOpen(true);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveUnitAction(null, formData);
      if (result.status === "ok") {
        toast.success(result.message);
        setFieldErrors({});
        setIsOpen(false);
      } else {
        toast.error(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const result = await deleteUnitAction(pendingDelete.id);
    if (result.status === "ok") toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-6">
      {units.length > 0 ? (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-subtle uppercase">
              <tr>
                <th className="p-3 text-left font-normal">Код</th>
                <th className="p-3 text-left font-normal">Год</th>
                <th className="p-3 text-left font-normal">Состояние</th>
                <th className="p-3 text-left font-normal">Комплект</th>
                <th className="p-3 text-right font-normal">Цена</th>
                <th className="p-3 text-left font-normal">Статус</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="p-3">
                    <span className="font-mono text-xs">{unit.unitCode}</span>
                    {unit.serialNumber ? (
                      <span className="block font-mono text-xs text-subtle">
                        S/N {unit.serialNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{unit.productionYear ?? "—"}</td>
                  <td className="p-3">
                    {GRADE_LABELS[unit.conditionGrade] ?? unit.conditionGrade}
                  </td>
                  <td className="p-3 text-xs text-subtle">
                    {unit.hasBox ? "коробка" : "без коробки"}
                    {", "}
                    {unit.hasPapers ? "документы" : "без документов"}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatMoney(unit.priceCents)}
                    <span className="block text-xs text-subtle">без НДС</span>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        unit.status === "available"
                          ? "success"
                          : unit.status === "sold"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Изменить экземпляр"
                        onClick={() => openFor(unit)}
                        className="size-8"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить экземпляр"
                        onClick={() => setPendingDelete(unit)}
                        className="size-8 text-muted hover:text-danger-600"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Экземпляров пока нет. Пока их нет, товар не появится в продаже.
        </p>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            className="gap-2 self-start"
            onClick={() => openFor(null)}
          >
            <Plus className="size-4" aria-hidden />
            Добавить экземпляр
          </Button>
        </SheetTrigger>

        <SheetContent
          title={editing ? `Экземпляр ${editing.unitCode}` : "Новый экземпляр"}
          side="right"
        >
          <form action={handleSubmit} className="flex flex-col gap-5">
            <input type="hidden" name="productId" value={productId} />
            {editing ? <input type="hidden" name="unitId" value={editing.id} /> : null}

            <Field label="Код экземпляра" error={fieldErrors.unitCode} required>
              {(control) => (
                <Input
                  name="unitCode"
                  defaultValue={editing?.unitCode ?? ""}
                  placeholder="UW-U-000105"
                  required
                  {...control}
                />
              )}
            </Field>

            <Field label="Серийный номер" error={fieldErrors.serialNumber}>
              {(control) => (
                <Input
                  name="serialNumber"
                  defaultValue={editing?.serialNumber ?? ""}
                  {...control}
                />
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Год выпуска" error={fieldErrors.productionYear}>
                {(control) => (
                  <Input
                    name="productionYear"
                    type="number"
                    defaultValue={editing?.productionYear ?? ""}
                    {...control}
                  />
                )}
              </Field>

              <Field label="Состояние" error={fieldErrors.conditionGrade}>
                {(control) => (
                  <select
                    name="conditionGrade"
                    defaultValue={editing?.conditionGrade ?? "excellent"}
                    className={SELECT_CLASSES}
                    {...control}
                  >
                    <option value="unworn">Неношеные</option>
                    <option value="excellent">Отличное</option>
                    <option value="very_good">Очень хорошее</option>
                    <option value="good">Хорошее</option>
                    <option value="fair">Удовлетворительное</option>
                  </select>
                )}
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Цена с НДС, €" error={fieldErrors.priceGrossEur} required>
                {(control) => (
                  <Input
                    name="priceGrossEur"
                    type="number"
                    step="0.01"
                    defaultValue={
                      editing
                        ? grossEurFromNetCents(
                            editing.priceCents,
                            editing.vatScheme ?? productVatScheme,
                          )
                        : ""
                    }
                    required
                    {...control}
                  />
                )}
              </Field>

              <Field
                label="Закупочная цена, €"
                hint="Нужна для НДС по схеме маржи. Покупателю не видна."
                error={fieldErrors.costEur}
              >
                {(control) => (
                  <Input
                    name="costEur"
                    type="number"
                    step="0.01"
                    defaultValue={editing?.costCents ? editing.costCents / 100 : ""}
                    {...control}
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Гарантия, мес." error={fieldErrors.warrantyMonths}>
                {(control) => (
                  <Input
                    name="warrantyMonths"
                    type="number"
                    defaultValue={editing?.warrantyMonths ?? 24}
                    {...control}
                  />
                )}
              </Field>

              <Field label="Статус" error={fieldErrors.status}>
                {(control) => (
                  <select
                    name="status"
                    defaultValue={editing?.status ?? "available"}
                    className={SELECT_CLASSES}
                    {...control}
                  >
                    <option value="available">В продаже</option>
                    <option value="withdrawn">Снят с продажи</option>
                    <option value="reserved">Зарезервирован</option>
                    <option value="sold">Продан</option>
                  </select>
                )}
              </Field>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="hasBox"
                  defaultChecked={editing?.hasBox ?? false}
                  className="size-4 accent-accent"
                />
                Коробка в комплекте
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="hasPapers"
                  defaultChecked={editing?.hasPapers ?? false}
                  className="size-4 accent-accent"
                />
                Документы в комплекте
              </label>
            </div>

            <Field label="Заметки часовщика" error={fieldErrors.notes}>
              {(control) => (
                <Textarea
                  name="notes"
                  rows={3}
                  defaultValue={editing?.notes ?? ""}
                  {...control}
                />
              )}
            </Field>

            <Button type="submit" isPending={isPending} className="w-full">
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        destructive
        title="Удалить экземпляр?"
        description={
          pendingDelete
            ? `${pendingDelete.unitCode} будет удалён безвозвратно. Экземпляр из оформленного заказа удалить нельзя — его нужно снять с продажи.`
            : ""
        }
        confirmLabel="Удалить"
        onConfirm={handleDelete}
      />
    </div>
  );
}
