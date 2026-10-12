"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * Кнопка переключения темы.
 *
 * Состояние темы намеренно не хранится в React: источник правды —
 * атрибут `data-theme` на <html>, который ставит скрипт в <head> ещё
 * до гидратации. Если продублировать его в useState, при первой
 * отрисовке на сервере и на клиенте окажутся разные значения, и React
 * сообщит о несовпадении.
 *
 * Поэтому текущая тема читается из DOM в момент нажатия, а нужная
 * иконка выбирается чистым CSS (вариант `dark:`).
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "dark" ? "light" : "dark";

    root.setAttribute("data-theme", next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Приватный режим: тема переключится, но не запомнится.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Переключить светлую и тёмную тему"
      title="Светлая или тёмная тема"
      className={`relative flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:text-accent-text ${className ?? ""}`}
    >
      {/* Показываем ту тему, в которую переключит нажатие. */}
      <Moon className="size-5 dark:hidden" strokeWidth={1.5} aria-hidden />
      <Sun className="hidden size-5 dark:block" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
