import "server-only";

import { isProduction, serverEnv } from "@/lib/env/server";

/**
 * Отправка писем.
 *
 * Два транспорта и явное правило выбора:
 *   есть RESEND_API_KEY → отправляем через Resend;
 *   нет и это разработка → печатаем в консоль сервера (со ссылками,
 *     чтобы можно было пройти сценарий руками);
 *   нет и это production → падаем с понятной ошибкой.
 *
 * Последнее намеренно: молча потерянное письмо подтверждения — это
 * заблокированный аккаунт покупателя или заказ, о котором он не узнал.
 * Лучше увидеть ошибку в логе при запуске, чем ловить её по жалобам.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** Текстовая версия: для транзакционных писем её достаточно. */
  text: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "UHRENWERK <onboarding@resend.dev>";

/**
 * Отправка через HTTP API Resend.
 *
 * Без SDK: нужен один POST-запрос, а лишняя зависимость в проекте — это
 * лишние обновления и лишний код в сборке.
 *
 * ВНИМАНИЕ: этот путь не проверялся живым ключом — у проекта его пока
 * нет. При подключении ключа первым делом отправьте тестовое письмо и
 * сверьте ответ: Resend возвращает `{ id }` при успехе и `{ message }`
 * с кодом 4xx при ошибке.
 */
async function sendViaResend(message: EmailMessage): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM ?? DEFAULT_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend ответил ${response.status}: ${details.slice(0, 300)}`);
  }
}

function logToConsole(message: EmailMessage): void {
  console.info(
    [
      "",
      "─".repeat(72),
      `ПИСЬМО → ${message.to}`,
      `Тема: ${message.subject}`,
      "",
      message.text,
      "─".repeat(72),
      "",
    ].join("\n"),
  );
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (serverEnv.RESEND_API_KEY) {
    await sendViaResend(message);
    return;
  }

  if (isProduction) {
    throw new Error(
      "Транспорт писем не настроен: задайте RESEND_API_KEY и EMAIL_FROM.",
    );
  }

  logToConsole(message);
}

/**
 * Отправка, которая не роняет основную операцию.
 *
 * Заказ уже создан и товар зарезервирован — падение письма не повод
 * отменять покупку. Ошибку пишем в лог с контекстом, чтобы её было видно.
 */
export async function sendEmailSafely(
  message: EmailMessage,
  context: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    await sendEmail(message);
    return true;
  } catch (error) {
    console.error("email.send", { to: message.to, ...context, error });
    return false;
  }
}
