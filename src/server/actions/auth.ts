"use server";

import { APIError } from "better-auth/api";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { auth } from "@/server/auth";
import { fieldErrorsFrom, formError, formOk, type FormState } from "./form-state";

/**
 * Серверные действия аутентификации.
 *
 * Валидация и работа с паролем происходят только здесь: в браузер уходит
 * httpOnly-cookie сессии, а не токен в localStorage. Плагин `nextCookies`
 * в конфигурации auth переносит Set-Cookie из ответа Better Auth
 * в cookies() Next.js — поэтому вход из серверного действия работает.
 */

/**
 * Человеческие тексты вместо кодов библиотеки.
 *
 * Про вход: сообщение одинаковое и для неизвестного адреса, и для неверного
 * пароля — иначе форма превращается в инструмент проверки, зарегистрирован
 * ли человек в магазине.
 */
function messageFromApiError(error: APIError, fallback: string): string {
  const code = typeof error.body?.code === "string" ? error.body.code : undefined;

  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Этот адрес уже зарегистрирован. Попробуйте войти.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Неверный адрес или пароль.";
    case "EMAIL_NOT_VERIFIED":
      return "Подтвердите адрес — письмо уже отправлено.";
    case "PASSWORD_TOO_SHORT":
      return "Пароль слишком короткий: минимум 10 символов.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return "Ссылка больше не действует. Запросите новую.";
    default:
      return fallback;
  }
}

/**
 * Куда вернуть человека после входа.
 *
 * Значение приходит из формы, поэтому проверяется: только внутренний путь.
 * «//evil.com» браузер считает внешним адресом — это классический
 * open redirect, и такая строка отбрасывается.
 *
 * Приведение к Route необходимо: типизированные маршруты Next.js ожидают
 * литеральный тип, а конкретный адрес известен только во время выполнения.
 */
function safeRedirectTarget(value: FormDataEntryValue | null): Route {
  const target = typeof value === "string" ? value : "";
  const isInternal = target.startsWith("/") && !target.startsWith("//");
  return (isInternal ? target : "/account") as Route;
}

export async function signUpAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return formError("Проверьте заполнение полей.", fieldErrorsFrom(parsed.error));
  }

  try {
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return formError(messageFromApiError(error, "Не удалось создать аккаунт."));
    }
    console.error("auth.signUp", error);
    return formError("Не удалось создать аккаунт. Попробуйте позже.");
  }

  // redirect бросает специальное исключение — только вне try/catch.
  redirect(safeRedirectTarget(formData.get("next")));
}

export async function signInAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") ?? true,
  });

  if (!parsed.success) {
    return formError("Проверьте адрес и пароль.", fieldErrorsFrom(parsed.error));
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return formError(messageFromApiError(error, "Не удалось войти."));
    }
    console.error("auth.signIn", error);
    return formError("Не удалось войти. Попробуйте позже.");
  }

  redirect(safeRedirectTarget(formData.get("next")));
}

export async function requestPasswordResetAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return formError("Укажите корректный адрес.", fieldErrorsFrom(parsed.error));
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: "/reset-password",
      },
      headers: await headers(),
    });
  } catch (error) {
    // Намеренно не показываем, существует ли адрес: иначе форма сброса
    // превращается в способ проверять базу клиентов.
    console.error("auth.requestPasswordReset", error);
  }

  return formOk("Если адрес зарегистрирован, письмо со ссылкой уже отправлено.");
}

export async function resetPasswordAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return formError("Проверьте новый пароль.", fieldErrorsFrom(parsed.error));
  }

  try {
    await auth.api.resetPassword({
      // Библиотека ждёт поле newPassword, а не password.
      body: { token: parsed.data.token, newPassword: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return formError(messageFromApiError(error, "Не удалось изменить пароль."));
    }
    console.error("auth.resetPassword", error);
    return formError("Не удалось изменить пароль. Попробуйте позже.");
  }

  redirect("/sign-in?reset=1");
}

export async function resendVerificationEmailAction(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email");

  if (typeof email !== "string" || email.length === 0) {
    return formError("Не удалось определить адрес.");
  }

  try {
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/account?verified=1" },
      headers: await headers(),
    });
  } catch (error) {
    console.error("auth.sendVerificationEmail", error);
    return formError("Не удалось отправить письмо. Попробуйте позже.");
  }

  return formOk("Письмо отправлено — проверьте почту.");
}
