import "server-only";

import { z } from "zod";

/**
 * Серверные переменные окружения, включая секреты.
 *
 * `import "server-only"` превращает случайный импорт этого файла
 * в клиентском компоненте в ошибку сборки — секрет физически
 * не может попасть в браузерный бандл.
 *
 * Необязательные переменные объявлены как `.optional()`: без них проект
 * работает в разработке (письма печатаются в консоль), но для production
 * они нужны — список проверок в DEPLOY.md.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      "DATABASE_URL должен начинаться с postgres:// или postgresql://",
    ),
  /**
   * Ключ подписи сессий и токенов. Минимум 32 символа.
   * Смена ключа разлогинивает всех пользователей.
   */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET должен быть не короче 32 символов"),

  /** Ключ Resend. Без него письма печатаются в консоль (только в dev). */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Адрес отправителя: домен должен быть подтверждён у провайдера. */
  EMAIL_FROM: z.string().min(3).optional(),
  /**
   * Секрет для задач по расписанию. Эндпоинт снятия просроченных резервов
   * меняет данные, поэтому без заголовка с этим секретом он отвечает 401.
   */
  CRON_SECRET: z.string().min(16).optional(),

  /**
   * Банковские реквизиты для проформы. Не секреты, но зависят от
   * окружения: в тестовом стенде они другие.
   */
  BANK_BENEFICIARY: z.string().min(1).optional(),
  BANK_IBAN: z.string().min(1).optional(),
  BANK_BIC: z.string().min(1).optional(),
  BANK_NAME: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  CRON_SECRET: process.env.CRON_SECRET,
  BANK_BENEFICIARY: process.env.BANK_BENEFICIARY,
  BANK_IBAN: process.env.BANK_IBAN,
  BANK_BIC: process.env.BANK_BIC,
  BANK_NAME: process.env.BANK_NAME,
});

if (!parsed.success) {
  throw new Error(
    `Некорректные серверные переменные окружения:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;
export const isProduction = serverEnv.NODE_ENV === "production";
