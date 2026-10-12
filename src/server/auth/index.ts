import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { appUrl } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { sendEmail } from "@/server/email";

const SESSION_DAYS = 30;

/**
 * Конфигурация аутентификации.
 *
 * Пароли хешируются и проверяются только здесь, на сервере; в браузер
 * уходит лишь httpOnly-cookie сессии. Таблицы `user`, `session`, `account`
 * и `verification` принадлежат Better Auth — они заведены на этапе 2 и
 * сверены с официальным генератором схемы.
 */
export const auth = betterAuth({
  appName: "UHRENWERK",
  baseURL: appUrl,
  secret: serverEnv.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    // 10 символов вместо стандартных 8: магазин с чеками в тысячи евро.
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // Вход не блокируем, но перед оформлением заказа (этап 7)
    // подтверждённый адрес будет обязателен.
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Сброс пароля · UHRENWERK",
        text: [
          "Вы запросили сброс пароля.",
          "",
          `Ссылка действует один час: ${url}`,
          "",
          "Если запрос делали не вы — просто проигнорируйте письмо,",
          "пароль останется прежним.",
        ].join("\n"),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // По умолчанию после подтверждения человек попадает на главную.
      // Отправляем в кабинет, где он увидит подтверждение действия.
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set("callbackURL", "/account?verified=1");

      await sendEmail({
        to: user.email,
        subject: "Подтвердите адрес · UHRENWERK",
        text: [
          "Добро пожаловать в UHRENWERK.",
          "",
          `Подтвердите адрес, чтобы оформлять заказы: ${verificationUrl.toString()}`,
          "",
          "Ссылка действует сутки.",
        ].join("\n"),
      });
    },
  },

  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      /**
       * `input: false` — ключевая деталь: без этого флага клиент мог бы
       * передать role: "admin" при регистрации и получить доступ к админке.
       */
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "customer",
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * SESSION_DAYS,
    // Продлеваем сессию не чаще раза в сутки — меньше записей в базу.
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  // nextCookies должен идти последним в списке плагинов: он забирает
  // Set-Cookie из ответа Better Auth и ставит их через cookies() Next.js,
  // благодаря чему вход работает из серверных действий.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
