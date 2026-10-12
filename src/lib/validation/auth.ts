import { z } from "zod";

import { emailField } from "./common";

/**
 * Требования к паролю.
 *
 * 10 символов вместо распространённых 8 — у магазина чеки в тысячи евро,
 * а аккаунт даёт доступ к истории заказов и адресам. Без требований
 * «обязательно спецсимвол»: они заставляют людей писать Password1! и
 * хуже защищают, чем длина.
 */
export const passwordField = z
  .string()
  .min(10, "Минимум 10 символов")
  .max(128, "Слишком длинный пароль");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100),
  email: emailField,
  password: passwordField,
});

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Введите пароль"),
  rememberMe: z.coerce.boolean().catch(true),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordField,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
