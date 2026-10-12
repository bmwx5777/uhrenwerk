import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { timestamps } from "./_shared";
import { userRoleEnum } from "./enums";

/**
 * Таблицы ниже принадлежат Better Auth (подключаем на этапе 5).
 * `id` здесь `text`, а не uuid: Better Auth генерирует идентификаторы сам.
 * Доменные таблицы используют uuid — они не зависят от библиотеки авторизации.
 *
 * Инвариант: email всегда хранится в нижнем регистре (проверяется check-constraint).
 */
export const user = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Better Auth всегда передаёт имя при регистрации и из OAuth-профиля,
    // поэтому колонка обязательная — иначе в интерфейсе появлялось бы «null».
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("customer"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_email_unique").on(t.email),
    index("user_role_idx").on(t.role),
    check("user_email_lowercase", sql`${t.email} = lower(${t.email})`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("session_token_unique").on(t.token),
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /** Хэш пароля (credentials-провайдер). Никогда не покидает сервер. */
    password: text("password"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("account_provider_account_unique").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("verification_identifier_idx").on(t.identifier),
    index("verification_expires_at_idx").on(t.expiresAt),
  ],
);
