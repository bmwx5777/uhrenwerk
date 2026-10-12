/**
 * Выдать пользователю роль администратора.
 *
 * Запуск: npm run user:admin -- valera@example.com
 *
 * Отдельный скрипт, а не кнопка в интерфейсе: право выдавать админов
 * должно требовать доступа к серверу, а не только к чужому аккаунту.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/server/db/schema";
import { user } from "@/server/db/schema";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Укажите email: npm run user:admin -- user@example.com");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL не задан. Проверьте .env.local");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

try {
  const updated = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ email: user.email, role: user.role });

  if (updated.length === 0) {
    console.error(`Пользователь ${email} не найден. Сначала зарегистрируйтесь.`);
    process.exitCode = 1;
  } else {
    console.log(`Готово: ${updated[0]!.email} теперь ${updated[0]!.role}`);
  }
} finally {
  await client.end();
}
