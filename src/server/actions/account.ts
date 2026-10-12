"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  addressIdSchema,
  addressSchema,
  profileSchema,
} from "@/lib/validation/account";
import { auth } from "@/server/auth";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { address } from "@/server/db/schema";
import { hasAddressOfType } from "@/server/services/account";
import { fieldErrorsFrom, formError, formOk, type FormState } from "./form-state";

/**
 * Действия личного кабинета.
 *
 * Каждое начинается с `requireUser()` и работает только с данными этого
 * пользователя: в условиях запросов всегда есть `userId`, поэтому подменить
 * id адреса в форме и отредактировать чужой адрес невозможно.
 */

/** Пустая строка из формы — это «не заполнено», а не пустое значение. */
function optionalText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function updateProfileAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: optionalText(formData.get("phone")),
  });

  if (!parsed.success) {
    return formError("Проверьте заполнение полей.", fieldErrorsFrom(parsed.error));
  }

  try {
    // Через API Better Auth, а не напрямую в базу: так обновляется и
    // кэш сессии, иначе в интерфейсе осталось бы старое имя.
    await auth.api.updateUser({
      body: { name: parsed.data.name, phone: parsed.data.phone ?? null },
      headers: await headers(),
    });
  } catch (error) {
    console.error("account.updateProfile", { userId: user.id, error });
    return formError("Не удалось сохранить профиль. Попробуйте позже.");
  }

  revalidatePath("/account");
  return formOk("Профиль сохранён.");
}

function addressFromFormData(formData: FormData) {
  return addressSchema.safeParse({
    type: formData.get("type"),
    recipientName: formData.get("recipientName"),
    phone: optionalText(formData.get("phone")),
    companyName: optionalText(formData.get("companyName")),
    vatNumber: optionalText(formData.get("vatNumber")),
    countryCode: formData.get("countryCode"),
    state: optionalText(formData.get("state")),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    line1: formData.get("line1"),
    line2: optionalText(formData.get("line2")),
    isDefault: formData.get("isDefault") === "on",
  });
}

export async function createAddressAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = addressFromFormData(formData);

  if (!parsed.success) {
    return formError("Проверьте заполнение полей.", fieldErrorsFrom(parsed.error));
  }

  const input = parsed.data;
  // Первый адрес этого типа становится основным автоматически.
  const makeDefault = input.isDefault || !(await hasAddressOfType(user.id, input.type));

  try {
    await db.transaction(async (tx) => {
      if (makeDefault) {
        // В базе стоит частичный уникальный индекс «один основной адрес
        // на тип», поэтому снимаем флаг со старого в той же транзакции.
        await tx
          .update(address)
          .set({ isDefault: false })
          .where(
            and(
              eq(address.userId, user.id),
              eq(address.type, input.type),
              eq(address.isDefault, true),
            ),
          );
      }

      await tx.insert(address).values({
        ...input,
        isDefault: makeDefault,
        userId: user.id,
      });
    });
  } catch (error) {
    console.error("account.createAddress", { userId: user.id, error });
    return formError("Не удалось сохранить адрес. Попробуйте позже.");
  }

  revalidatePath("/account/addresses");
  return formOk("Адрес добавлен.");
}

export async function updateAddressAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const id = addressIdSchema.safeParse(formData.get("id"));
  const parsed = addressFromFormData(formData);

  if (!id.success) return formError("Адрес не найден.");
  if (!parsed.success) {
    return formError("Проверьте заполнение полей.", fieldErrorsFrom(parsed.error));
  }

  const input = parsed.data;

  try {
    const updated = await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(address)
          .set({ isDefault: false })
          .where(
            and(
              eq(address.userId, user.id),
              eq(address.type, input.type),
              eq(address.isDefault, true),
            ),
          );
      }

      // userId в условии — ключевая защита: чужой адрес не найдётся.
      return tx
        .update(address)
        .set(input)
        .where(and(eq(address.id, id.data), eq(address.userId, user.id)))
        .returning({ id: address.id });
    });

    if (updated.length === 0) return formError("Адрес не найден.");
  } catch (error) {
    console.error("account.updateAddress", { userId: user.id, error });
    return formError("Не удалось сохранить адрес. Попробуйте позже.");
  }

  revalidatePath("/account/addresses");
  return formOk("Адрес обновлён.");
}

export async function deleteAddressAction(addressId: string): Promise<FormState> {
  const user = await requireUser();
  const id = addressIdSchema.safeParse(addressId);

  if (!id.success) return formError("Адрес не найден.");

  try {
    const deleted = await db
      .delete(address)
      .where(and(eq(address.id, id.data), eq(address.userId, user.id)))
      .returning({ id: address.id });

    if (deleted.length === 0) return formError("Адрес не найден.");
  } catch (error) {
    console.error("account.deleteAddress", { userId: user.id, error });
    return formError("Не удалось удалить адрес.");
  }

  revalidatePath("/account/addresses");
  return formOk("Адрес удалён.");
}

export async function setDefaultAddressAction(addressId: string): Promise<FormState> {
  const user = await requireUser();
  const id = addressIdSchema.safeParse(addressId);

  if (!id.success) return formError("Адрес не найден.");

  try {
    const result = await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: address.id, type: address.type })
        .from(address)
        .where(and(eq(address.id, id.data), eq(address.userId, user.id)))
        .limit(1);

      if (!target) return null;

      await tx
        .update(address)
        .set({ isDefault: false })
        .where(
          and(
            eq(address.userId, user.id),
            eq(address.type, target.type),
            eq(address.isDefault, true),
          ),
        );

      await tx
        .update(address)
        .set({ isDefault: true })
        .where(eq(address.id, target.id));

      return target;
    });

    if (!result) return formError("Адрес не найден.");
  } catch (error) {
    console.error("account.setDefaultAddress", { userId: user.id, error });
    return formError("Не удалось изменить адрес по умолчанию.");
  }

  revalidatePath("/account/addresses");
  return formOk("Адрес по умолчанию изменён.");
}
