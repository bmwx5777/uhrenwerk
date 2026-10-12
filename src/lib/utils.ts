import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединяет классы и разрешает конфликты Tailwind-утилит (последний выигрывает). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
