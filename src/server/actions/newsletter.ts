"use server";

import { eq } from "drizzle-orm";

import { newsletterSchema } from "@/lib/validation/newsletter";
import { checkRateLimit, retryAfterMessage } from "@/server/rate-limit";
import { db } from "@/server/db";
import { newsletterSubscriber } from "@/server/db/schema";

export type ActionResult = {
  status: "ok" | "error";
  message: string;
  /** Метка времени: позволяет клиенту отличить новый ответ от предыдущего. */
  at: number;
};

/**
 * Подписка на рассылку (double opt-in).
 *
 * Запись создаётся со статусом `pending` и одноразовым токеном;
 * письмо с подтверждением отправляется на этапе 8 — до подтверждения
 * адрес не считается подписанным, как требует GDPR.
 */
export async function subscribeToNewsletter(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Подписка отправляет письмо на указанный адрес — без лимита форму
  // можно использовать как рассыльщик по чужим адресам.
  const limit = await checkRateLimit("newsletter", {
    limit: 5,
    windowSeconds: 3600,
  });

  if (!limit.ok) {
    return {
      status: "error",
      message: retryAfterMessage(limit.retryAfterSeconds),
      at: Date.now(),
    };
  }

  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Проверьте адрес электронной почты.",
      at: Date.now(),
    };
  }

  const { email, source } = parsed.data;

  try {
    const existing = await db.query.newsletterSubscriber.findFirst({
      where: eq(newsletterSubscriber.email, email),
      columns: { id: true, status: true },
    });

    if (existing?.status === "subscribed") {
      return {
        status: "ok",
        message: "Этот адрес уже подписан на рассылку.",
        at: Date.now(),
      };
    }

    const token = crypto.randomUUID();

    if (existing) {
      // Повторная подписка после отписки — выдаём новый токен подтверждения.
      await db
        .update(newsletterSubscriber)
        .set({ status: "pending", token, unsubscribedAt: null })
        .where(eq(newsletterSubscriber.id, existing.id));
    } else {
      await db.insert(newsletterSubscriber).values({ email, token, source });
    }

    // TODO (этап 8): отправить письмо со ссылкой подтверждения.
    return {
      status: "ok",
      message: "Почти готово — подтвердите подписку в письме.",
      at: Date.now(),
    };
  } catch (error) {
    console.error("newsletter.subscribe", error);
    return {
      status: "error",
      message: "Не получилось сохранить подписку. Попробуйте позже.",
      at: Date.now(),
    };
  }
}
