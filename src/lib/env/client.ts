import { z } from "zod";

/**
 * Переменные, безопасные для клиентского бандла.
 * Только `NEXT_PUBLIC_*` — всё остальное живёт в `env/server.ts`.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const parsed = clientEnvSchema.safeParse({
  // Обращение к process.env.NEXT_PUBLIC_* должно быть прямым —
  // иначе Next.js не подставит значение при сборке.
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  throw new Error(
    `Некорректные публичные переменные окружения:\n${z.prettifyError(parsed.error)}`,
  );
}

export const clientEnv = parsed.data;
export const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
