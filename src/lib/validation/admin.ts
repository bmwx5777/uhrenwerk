import { z } from "zod";

/**
 * Схемы админки.
 *
 * Отличие от покупательских схем: здесь цена принимается — но в том виде,
 * в котором её назначает мерчандайзер, то есть как розничную цену с НДС
 * в евро. В центах нетто её переводит сервер (`netCentsFromGrossEur`),
 * и это единственное место в проекте, где цена приходит из формы.
 */

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(3, "Минимум 3 символа")
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  );

const grossEur = z.coerce
  .number("Укажите цену")
  .positive("Цена должна быть больше нуля")
  .max(2_000_000, "Слишком большая цена");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalNumber = z
  .union([z.coerce.number(), z.literal("")])
  .optional()
  .transform((value) =>
    value === "" || value === undefined || Number.isNaN(value)
      ? undefined
      : Number(value),
  );

export const productSpecsSchema = z.object({
  movement: z
    .enum(["automatic", "manual", "quartz", "spring_drive", "solar"])
    .optional()
    .catch(undefined),
  caliber: optionalText(80),
  powerReserveHours: optionalNumber,
  caseMaterial: optionalText(80),
  caseDiameterMm: optionalNumber,
  caseThicknessMm: optionalNumber,
  lugWidthMm: optionalNumber,
  waterResistanceM: optionalNumber,
  crystal: optionalText(80),
  dialColor: optionalText(80),
  braceletMaterial: optionalText(80),
  complications: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      value && value.length > 0
        ? value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined,
    ),
  gender: z.enum(["men", "women", "unisex"]).optional().catch(undefined),
});

export const productFormSchema = z
  .object({
    slug,
    sku: z.string().trim().min(2, "Укажите артикул").max(64),
    name: z.string().trim().min(2, "Укажите название").max(200),
    reference: optionalText(80),
    brandId: z.uuid("Выберите бренд"),
    categoryId: z.uuid("Выберите категорию"),
    kind: z.enum(["stocked", "serialized"]),
    status: z.enum(["draft", "active", "archived"]),
    condition: z.enum(["new", "unworn", "pre_owned"]),
    vatScheme: z.enum(["standard", "margin"]),
    shortDescription: optionalText(300),
    description: optionalText(4000),
    /** Розничная цена с НДС. Обязательна только для обычного товара. */
    priceGrossEur: grossEur.optional(),
    compareAtGrossEur: grossEur.optional(),
    isFeatured: z.coerce.boolean().catch(false),
    specs: productSpecsSchema,
    /** Остаток склада — только для обычного товара. */
    stockQuantity: z.coerce.number().int().min(0).max(10_000).catch(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(100).catch(1),
  })
  .refine((value) => value.kind !== "stocked" || value.priceGrossEur !== undefined, {
    message: "Для обычного товара цена обязательна",
    path: ["priceGrossEur"],
  })
  .refine(
    (value) =>
      value.compareAtGrossEur === undefined ||
      value.priceGrossEur === undefined ||
      value.compareAtGrossEur > value.priceGrossEur,
    {
      message: "Старая цена должна быть выше текущей",
      path: ["compareAtGrossEur"],
    },
  );

export const unitFormSchema = z.object({
  productId: z.uuid(),
  unitCode: z.string().trim().min(2, "Укажите код экземпляра").max(64),
  serialNumber: optionalText(64),
  productionYear: z.coerce
    .number()
    .int()
    .min(1850)
    .max(2100)
    .optional()
    .catch(undefined),
  conditionGrade: z.enum(["unworn", "excellent", "very_good", "good", "fair"]),
  hasBox: z.coerce.boolean().catch(false),
  hasPapers: z.coerce.boolean().catch(false),
  warrantyMonths: z.coerce.number().int().min(0).max(240).catch(24),
  /** Цена экземпляра — тоже розничная, с НДС. */
  priceGrossEur: grossEur,
  /** Закупочная цена в евро: нужна для НДС по схеме маржи, наружу не идёт. */
  costEur: z.coerce.number().min(0).max(2_000_000).optional().catch(undefined),
  vatScheme: z.enum(["standard", "margin"]).optional().catch(undefined),
  status: z.enum(["available", "reserved", "sold", "withdrawn"]),
  notes: optionalText(1000),
});

export const imageFormSchema = z.object({
  productId: z.uuid(),
  url: z
    .string()
    .trim()
    .min(1, "Укажите адрес изображения")
    .max(2000)
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "Нужен путь вида /placeholder/watch-1.svg или полный адрес https://…",
    ),
  alt: optionalText(200),
  isPrimary: z.coerce.boolean().catch(false),
});

export const orderStatusFormSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "pending_payment",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partially_refunded",
  ]),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type UnitFormInput = z.infer<typeof unitFormSchema>;
