import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// drizzle-kit запускается отдельным процессом и не видит .env.local Next.js.
// process.loadEnvFile — встроенная функция Node, внешних зависимостей не требует.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL не задан. Запусти `npm run db:up` и проверь .env.local",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
