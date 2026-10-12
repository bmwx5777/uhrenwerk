import { Cog, Gauge, Ruler, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductSpecs } from "@/server/db/schema/catalog";

const MOVEMENT_LABELS: Record<string, string> = {
  automatic: "Автоподзавод",
  manual: "Ручной завод",
  quartz: "Кварцевый",
  spring_drive: "Spring Drive",
  solar: "Solar",
};

const GENDER_LABELS: Record<string, string> = {
  men: "Мужские",
  women: "Женские",
  unisex: "Унисекс",
};

type SpecRow = {
  key: string;
  label: string;
  value: string;
};

/**
 * Характеристики из jsonb → список строк. Порядок фиксирован,
 * отсутствующие поля просто не выводятся: у кварца нет запаса хода,
 * у Reverso нет диаметра.
 */
function buildRows(specs: ProductSpecs): SpecRow[] {
  const rows: Array<[string, string, string | undefined]> = [
    [
      "movement",
      "Механизм",
      specs.movement ? MOVEMENT_LABELS[specs.movement] : undefined,
    ],
    ["caliber", "Калибр", specs.caliber],
    [
      "powerReserve",
      "Запас хода",
      specs.powerReserveHours ? `${specs.powerReserveHours} ч` : undefined,
    ],
    ["caseMaterial", "Корпус", specs.caseMaterial],
    [
      "caseDiameter",
      "Диаметр",
      specs.caseDiameterMm ? `${specs.caseDiameterMm} мм` : undefined,
    ],
    [
      "caseThickness",
      "Толщина",
      specs.caseThicknessMm ? `${specs.caseThicknessMm} мм` : undefined,
    ],
    [
      "lugWidth",
      "Ширина ушек",
      specs.lugWidthMm ? `${specs.lugWidthMm} мм` : undefined,
    ],
    [
      "waterResistance",
      "Водозащита",
      specs.waterResistanceM ? `${specs.waterResistanceM} м` : undefined,
    ],
    ["crystal", "Стекло", specs.crystal],
    ["dialColor", "Циферблат", specs.dialColor],
    ["bracelet", "Браслет", specs.braceletMaterial],
    ["complications", "Функции", specs.complications?.join(", ")],
    ["gender", "Размер", specs.gender ? GENDER_LABELS[specs.gender] : undefined],
  ];

  return rows
    .filter((row): row is [string, string, string] => Boolean(row[2]))
    .map(([key, label, value]) => ({ key, label, value }));
}

/**
 * Четыре характеристики, по которым часы выбирают в первую очередь.
 * Они выносятся наверх крупными плитками, остальное уходит в общую сетку:
 * одинаково набранный список из тринадцати строк читать невозможно.
 */
const HIGHLIGHTS: Array<{ key: string; icon: LucideIcon }> = [
  { key: "movement", icon: Cog },
  { key: "caseDiameter", icon: Ruler },
  { key: "powerReserve", icon: Gauge },
  { key: "waterResistance", icon: Waves },
];

export function ProductSpecHighlights({
  specs,
  className,
}: {
  specs: ProductSpecs;
  className?: string;
}) {
  const rows = buildRows(specs);

  const tiles = HIGHLIGHTS.map(({ key, icon }) => {
    const row = rows.find((item) => item.key === key);
    return row ? { ...row, icon } : null;
  }).filter((tile): tile is SpecRow & { icon: LucideIcon } => tile !== null);

  if (tiles.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {tiles.map((tile) => (
        <div key={tile.key} className="card-surface p-5">
          <tile.icon
            className="size-5 text-accent-text"
            strokeWidth={1.5}
            aria-hidden
          />
          <dt className="eyebrow mt-4">{tile.label}</dt>
          <dd className="mt-2 font-display text-xl font-medium">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Остальные характеристики сеткой пар «подпись — значение».
 * Плитки, уже показанные крупно, сюда не попадают, чтобы не дублировать.
 */
export function ProductSpecsList({
  specs,
  className,
}: {
  specs: ProductSpecs;
  className?: string;
}) {
  const highlightKeys = new Set(HIGHLIGHTS.map((item) => item.key));
  const rows = buildRows(specs).filter((row) => !highlightKeys.has(row.key));

  if (rows.length === 0) return null;

  return (
    <dl className={cn("grid gap-x-10 gap-y-0 sm:grid-cols-2", className)}>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-baseline justify-between gap-6 border-b border-border py-3.5 text-sm"
        >
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-right font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
