import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env/server";
import * as schema from "./schema";

/**
 * Один пул соединений на процесс.
 *
 * В dev Next.js перезагружает модули при каждом изменении файла — без кэша
 * в globalThis пулы накапливались бы до исчерпания лимита подключений Postgres.
 */
const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.dbClient ??
  postgres(serverEnv.DATABASE_URL, {
    max: serverEnv.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // При деплое за пулером в transaction mode (Supabase/pgbouncer)
    // добавить prepare: false — prepared statements там не поддерживаются.
  });

if (serverEnv.NODE_ENV !== "production") {
  globalForDb.dbClient = client;
}

export const db = drizzle(client, {
  schema,
  logger: serverEnv.NODE_ENV === "development",
});

export type Database = typeof db;
export { schema };
