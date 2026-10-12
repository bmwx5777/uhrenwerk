import { z } from "zod";

/**
 * Общие части схем валидации.
 *
 * Email нормализуется до проверки формата: адрес, скопированный с пробелом
 * или с заглавной буквы, должен приниматься. Нижний регистр обязателен ещё
 * и для базы — там стоит check-constraint `email = lower(email)`.
 */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Укажите корректный адрес").max(254));

/** Телефон в свободном формате: страны разные, жёсткая маска только мешает. */
export const phoneField = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+0-9()\-\s]*$/, "Допустимы цифры, пробелы, дефисы и скобки");

/** Код страны по ISO 3166-1 alpha-2, всегда в верхнем регистре. */
export const countryCodeField = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(/^[A-Z]{2}$/, "Выберите страну"));
