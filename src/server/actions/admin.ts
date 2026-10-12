"use server";

import { and, eq, sql } from "drizzle-orm";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { netCentsFromGrossEur } from "@/lib/pricing";
import {
  imageFormSchema,
  orderStatusFormSchema,
  productFormSchema,
  unitFormSchema,
} from "@/lib/validation/admin";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { inventory, product, productImage, productUnit } from "@/server/db/schema";
import { changeOrderStatus } from "@/server/services/order";
import { markPaymentReceived } from "@/server/services/payment";
import { fieldErrorsFrom, formError, formOk, type FormState } from "./form-state";

/**
 * Действия админки.
 *
 * Каждое начинается с `requireAdmin()`: роль проверяется в серверном коде
 * при каждом вызове, а не только при открытии страницы. Серверное
 * действие — это HTTP-эндпоинт, и защищать его надо так же.
 */

function readSpecs(formData: FormData) {
  return {
    movement: formData.get("movement"),
    caliber: formData.get("caliber"),
    powerReserveHours: formData.get("powerReserveHours"),
    caseMaterial: formData.get("caseMaterial"),
    caseDiameterMm: formData.get("caseDiameterMm"),
    caseThicknessMm: formData.get("caseThicknessMm"),
    lugWidthMm: formData.get("lugWidthMm"),
    waterResistanceM: formData.get("waterResistanceM"),
    crystal: formData.get("crystal"),
    dialColor: formData.get("dialColor"),
    braceletMaterial: formData.get("braceletMaterial"),
    complications: formData.get("complications"),
    gender: formData.get("gender"),
  };
}

function readProductForm(formData: FormData) {
  const price = formData.get("priceGrossEur");
  const compareAt = formData.get("compareAtGrossEur");

  return productFormSchema.safeParse({
    slug: formData.get("slug"),
    sku: formData.get("sku"),
    name: formData.get("name"),
    reference: formData.get("reference"),
    brandId: formData.get("brandId"),
    categoryId: formData.get("categoryId"),
    kind: formData.get("kind"),
    status: formData.get("status"),
    condition: formData.get("condition"),
    vatScheme: formData.get("vatScheme"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    priceGrossEur: price === "" ? undefined : price,
    compareAtGrossEur: compareAt === "" ? undefined : compareAt,
    isFeatured: formData.get("isFeatured") === "on",
    specs: readSpecs(formData),
    stockQuantity: formData.get("stockQuantity") ?? 0,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 1,
  });
}

/** Поля товара для записи. Цена переводится из розничной в нетто. */
function toProductValues(input: z.infer<typeof productFormSchema>) {
  const price = input.priceGrossEur ? netCentsFromGrossEur(input.priceGrossEur) : null;
  const compareAt = input.compareAtGrossEur
    ? netCentsFromGrossEur(input.compareAtGrossEur)
    : null;

  return {
    values: {
      slug: input.slug,
      sku: input.sku,
      name: input.name,
      reference: input.reference ?? null,
      brandId: input.brandId,
      categoryId: input.categoryId,
      kind: input.kind,
      status: input.status,
      condition: input.condition,
      vatScheme: input.vatScheme,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      priceCents: price?.netCents ?? null,
      compareAtPriceCents: compareAt?.netCents ?? null,
      isFeatured: input.isFeatured,
      specs: input.specs,
      // Дата публикации ставится при первом переводе в «активен»:
      // по ней каталог сортирует новинки.
      publishedAt: input.status === "active" ? new Date() : null,
    },
    priceWarning:
      price && !price.isExact
        ? `Цена ${input.priceGrossEur} € не представима точно при НДС 19 %: на витрине будет ${(price.actualGrossCents / 100).toFixed(2)} €.`
        : null,
  };
}

export async function createProductAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = readProductForm(formData);

  if (!parsed.success) {
    return formError("Проверьте поля товара.", fieldErrorsFrom(parsed.error));
  }

  const { values, priceWarning } = toProductValues(parsed.data);
  let createdId: string;

  try {
    createdId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(product)
        .values(values)
        .returning({ id: product.id });

      if (!created) throw new Error("insert returned no row");

      // Строка склада создаётся всегда: для уникальных товаров это кэш
      // доступного количества, он поддерживается сервисом заказов.
      await tx.insert(inventory).values({
        productId: created.id,
        quantity: parsed.data.kind === "stocked" ? parsed.data.stockQuantity : 0,
        lowStockThreshold: parsed.data.lowStockThreshold,
      });

      return created.id;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return formError("Товар с таким slug или артикулом уже есть.");
    }
    console.error("admin.createProduct", error);
    return formError("Не удалось создать товар.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");

  if (priceWarning) console.warn("admin.createProduct", priceWarning);

  // Открываем страницу товара: фотографии и экземпляры добавляются там,
  // и без перехода администратор остаётся на пустой форме, не понимая,
  // куда делся только что созданный товар.
  redirect(`/admin/products/${createdId}` as Route);
}

export async function updateProductAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const productId = z.uuid().safeParse(formData.get("productId"));
  const parsed = readProductForm(formData);

  if (!productId.success) return formError("Товар не найден.");
  if (!parsed.success) {
    return formError("Проверьте поля товара.", fieldErrorsFrom(parsed.error));
  }

  const { values, priceWarning } = toProductValues(parsed.data);

  try {
    const [existing] = await db
      .select({ publishedAt: product.publishedAt })
      .from(product)
      .where(eq(product.id, productId.data))
      .limit(1);

    const updated = await db
      .update(product)
      .set({
        ...values,
        // Уже опубликованному товару дату публикации не переписываем:
        // иначе он снова станет «новинкой» в каталоге.
        publishedAt:
          parsed.data.status === "active"
            ? (existing?.publishedAt ?? new Date())
            : (existing?.publishedAt ?? null),
      })
      .where(eq(product.id, productId.data))
      .returning({ id: product.id, slug: product.slug });

    if (updated.length === 0) return formError("Товар не найден.");

    if (parsed.data.kind === "stocked") {
      await db
        .update(inventory)
        .set({
          quantity: parsed.data.stockQuantity,
          lowStockThreshold: parsed.data.lowStockThreshold,
        })
        .where(eq(inventory.productId, productId.data));
    }

    revalidatePath(`/admin/products/${productId.data}`);
    revalidatePath("/admin/products");
    revalidatePath("/catalog");
    revalidatePath(`/product/${updated[0]!.slug}`);
  } catch (error) {
    console.error("admin.updateProduct", error);
    return formError("Не удалось сохранить товар.");
  }

  return formOk(priceWarning ?? "Товар сохранён.");
}

export async function addProductImageAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = imageFormSchema.safeParse({
    productId: formData.get("productId"),
    url: formData.get("url"),
    alt: formData.get("alt"),
    isPrimary: formData.get("isPrimary") === "on",
  });

  if (!parsed.success) {
    return formError("Проверьте адрес изображения.", fieldErrorsFrom(parsed.error));
  }

  try {
    await db.transaction(async (tx) => {
      const [last] = await tx
        .select({ position: productImage.position })
        .from(productImage)
        .where(
          and(
            eq(productImage.productId, parsed.data.productId),
            sql`${productImage.productUnitId} IS NULL`,
          ),
        )
        .orderBy(sql`${productImage.position} DESC`)
        .limit(1);

      const [count] = await tx
        .select({ value: sql<number>`count(*)::int` })
        .from(productImage)
        .where(
          and(
            eq(productImage.productId, parsed.data.productId),
            sql`${productImage.productUnitId} IS NULL`,
          ),
        );

      // Первое фото становится главным автоматически; при явном
      // выборе снимаем флаг со старого — в базе стоит частичный
      // уникальный индекс «одно главное фото на товар».
      const makePrimary = parsed.data.isPrimary || (count?.value ?? 0) === 0;

      if (makePrimary) {
        await tx
          .update(productImage)
          .set({ isPrimary: false })
          .where(
            and(
              eq(productImage.productId, parsed.data.productId),
              eq(productImage.isPrimary, true),
              sql`${productImage.productUnitId} IS NULL`,
            ),
          );
      }

      await tx.insert(productImage).values({
        productId: parsed.data.productId,
        url: parsed.data.url,
        alt: parsed.data.alt ?? null,
        position: (last?.position ?? -1) + 1,
        isPrimary: makePrimary,
      });
    });
  } catch (error) {
    console.error("admin.addImage", error);
    return formError("Не удалось добавить изображение.");
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  revalidatePath("/catalog");
  return formOk("Изображение добавлено.");
}

export async function deleteProductImageAction(imageId: string): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(imageId);
  if (!id.success) return formError("Изображение не найдено.");

  try {
    const deleted = await db
      .delete(productImage)
      .where(eq(productImage.id, id.data))
      .returning({ productId: productImage.productId });

    if (deleted.length === 0) return formError("Изображение не найдено.");

    revalidatePath(`/admin/products/${deleted[0]!.productId}`);
    revalidatePath("/catalog");
  } catch (error) {
    console.error("admin.deleteImage", error);
    return formError("Не удалось удалить изображение.");
  }

  return formOk("Изображение удалено.");
}

function readUnitForm(formData: FormData) {
  return unitFormSchema.safeParse({
    productId: formData.get("productId"),
    unitCode: formData.get("unitCode"),
    serialNumber: formData.get("serialNumber"),
    productionYear: formData.get("productionYear") || undefined,
    conditionGrade: formData.get("conditionGrade"),
    hasBox: formData.get("hasBox") === "on",
    hasPapers: formData.get("hasPapers") === "on",
    warrantyMonths: formData.get("warrantyMonths") ?? 24,
    priceGrossEur: formData.get("priceGrossEur"),
    costEur: formData.get("costEur") || undefined,
    vatScheme: formData.get("vatScheme") || undefined,
    status: formData.get("status") ?? "available",
    notes: formData.get("notes"),
  });
}

/** Пересчёт кэша количества по статусам экземпляров. */
async function syncUnitInventory(productId: string): Promise<void> {
  await db
    .update(inventory)
    .set({
      quantity: sql`(
        SELECT count(*)::int FROM ${productUnit}
        WHERE ${productUnit.productId} = ${productId}
          AND ${productUnit.status} = 'available'
      )`,
    })
    .where(eq(inventory.productId, productId));
}

export async function saveUnitAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const unitId = formData.get("unitId");
  const parsed = readUnitForm(formData);

  if (!parsed.success) {
    return formError("Проверьте поля экземпляра.", fieldErrorsFrom(parsed.error));
  }

  const input = parsed.data;
  const price = netCentsFromGrossEur(input.priceGrossEur);

  const values = {
    productId: input.productId,
    unitCode: input.unitCode,
    serialNumber: input.serialNumber ?? null,
    productionYear: input.productionYear ?? null,
    conditionGrade: input.conditionGrade,
    hasBox: input.hasBox,
    hasPapers: input.hasPapers,
    warrantyMonths: input.warrantyMonths,
    priceCents: price.netCents,
    costCents: input.costEur ? Math.round(input.costEur * 100) : null,
    vatScheme: input.vatScheme ?? null,
    status: input.status,
    notes: input.notes ?? null,
  };

  try {
    if (typeof unitId === "string" && unitId.length > 0) {
      const id = z.uuid().safeParse(unitId);
      if (!id.success) return formError("Экземпляр не найден.");

      const updated = await db
        .update(productUnit)
        .set(values)
        .where(eq(productUnit.id, id.data))
        .returning({ id: productUnit.id });

      if (updated.length === 0) return formError("Экземпляр не найден.");
    } else {
      await db.insert(productUnit).values(values);
    }

    await syncUnitInventory(input.productId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return formError("Экземпляр с таким кодом или серийным номером уже есть.");
    }
    console.error("admin.saveUnit", error);
    return formError("Не удалось сохранить экземпляр.");
  }

  revalidatePath(`/admin/products/${input.productId}`);
  revalidatePath("/catalog");
  return formOk(
    price.isExact
      ? "Экземпляр сохранён."
      : `Экземпляр сохранён. Цена на витрине: ${(price.actualGrossCents / 100).toFixed(2)} €.`,
  );
}

export async function deleteUnitAction(unitId: string): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(unitId);
  if (!id.success) return formError("Экземпляр не найден.");

  try {
    const [unit] = await db
      .select({ status: productUnit.status, productId: productUnit.productId })
      .from(productUnit)
      .where(eq(productUnit.id, id.data))
      .limit(1);

    if (!unit) return formError("Экземпляр не найден.");

    // Проданный или зарезервированный экземпляр удалять нельзя: на него
    // ссылается заказ, и история покупки должна остаться достоверной.
    if (unit.status !== "available" && unit.status !== "withdrawn") {
      return formError(
        "Экземпляр участвует в заказе. Снимите его с продажи вместо удаления.",
      );
    }

    await db.delete(productUnit).where(eq(productUnit.id, id.data));
    await syncUnitInventory(unit.productId);

    revalidatePath(`/admin/products/${unit.productId}`);
    revalidatePath("/catalog");
  } catch (error) {
    console.error("admin.deleteUnit", error);
    return formError("Не удалось удалить экземпляр.");
  }

  return formOk("Экземпляр удалён.");
}

export async function changeOrderStatusAction(
  orderId: string,
  status: string,
): Promise<FormState> {
  await requireAdmin();

  const parsed = orderStatusFormSchema.safeParse({ orderId, status });
  if (!parsed.success) return formError("Некорректный статус.");

  const result = await changeOrderStatus(parsed.data.orderId, parsed.data.status);

  if (result.status === "error") return formError(result.message);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/account/orders");
  revalidatePath("/catalog");
  return formOk("Статус обновлён.");
}

/**
 * Подтвердить поступление денег.
 *
 * Два шага в одном действии: отмечаем платёж полученным и переводим заказ
 * в «оплачен». Второе списывает резерв со склада — поэтому порядок важен:
 * если смена статуса не прошла, платёж остаётся подтверждённым, и
 * администратор увидит несоответствие, а не потерянные деньги.
 */
export async function confirmPaymentAction(paymentId: string): Promise<FormState> {
  await requireAdmin();

  const id = z.uuid().safeParse(paymentId);
  if (!id.success) return formError("Платёж не найден.");

  const received = await markPaymentReceived(id.data);
  if (received.status === "error") return formError(received.message);

  const statusChange = await changeOrderStatus(received.orderId, "paid");

  revalidatePath(`/admin/orders/${received.orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  revalidatePath("/catalog");

  if (statusChange.status === "error") {
    return formError(
      `Платёж отмечен полученным, но статус заказа не изменился: ${statusChange.message}`,
    );
  }

  return formOk("Оплата подтверждена, заказ переведён в «оплачен».");
}
