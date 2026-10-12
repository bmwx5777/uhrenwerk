"use client";

import { Clock, Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { formatDisplayPrice, type VatScheme } from "@/lib/pricing";
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistory,
} from "@/lib/search-history";
import { cn } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  reference: string | null;
  brandName: string;
  imageUrl: string | null;
  priceCents: number | null;
  vatScheme: VatScheme;
};

export type QuickBrand = {
  slug: string;
  name: string;
  productCount: number;
};

/** Пауза перед запросом: без неё на каждую букву уходит свой запрос. */
const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

/**
 * Поиск в шапке с живыми подсказками.
 *
 * Разметка следует паттерну combobox из WAI-ARIA: поле помечено
 * `role="combobox"`, список — `role="listbox"`, а активная строка
 * передаётся через `aria-activedescendant`. Без этого клавиатурная
 * навигация работает визуально, но скринридер о ней не сообщает.
 *
 * Фокус всегда остаётся в поле: стрелки двигают подсветку, а не фокус —
 * иначе пользователь терял бы возможность продолжить набор.
 */
export function HeaderSearch({
  brands = [],
  className,
}: {
  /** Бренды для быстрых переходов, когда поле пустое. */
  brands?: QuickBrand[];
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  /*
   * История читается не в эффекте, а при фокусе на поле.
   *
   * На сервере localStorage нет, поэтому чтение при первой отрисовке
   * разошлось бы с разметкой сервера. А показывать историю всё равно
   * нужно только после того, как пользователь встал в поле.
   */
  const [history, setHistory] = useState<string[]>([]);

  /**
   * Ответ хранится вместе с запросом, которому он принадлежит.
   *
   * Это позволяет не сбрасывать состояние при каждом изменении строки:
   * «загружаем» и «показывать нечего» вычисляются сравнением запросов.
   * Сброс через setState прямо в эффекте вызывал бы каскад перерисовок
   * на каждую нажатую клавишу.
   */
  const [result, setResult] = useState<{
    query: string;
    items: Suggestion[];
    total: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_QUERY_LENGTH;

  const isFresh = result?.query === trimmed;
  const items = canSearch && isFresh ? result.items : [];
  const total = canSearch && isFresh ? result.total : 0;
  const isLoading = canSearch && !isFresh;

  // В выпадающем списке лежат либо подсказки, либо история — стрелки
  // должны ходить по тому, что сейчас на экране.
  const showHistory = !canSearch && history.length > 0;
  const quickBrands = brands.filter((item) => item.productCount > 0).slice(0, 6);
  // Стрелки ходят только по истории: быстрые бренды — это ссылки-ярлыки,
  // а не результаты, и смешивать их в один список было бы странно.
  const optionCount = canSearch ? items.length : showHistory ? history.length : 0;

  // Подсветка не может указывать за пределы текущего списка: список
  // меняется асинхронно, а индекс остался бы от прошлой выдачи.
  const activeIndex = highlighted < optionCount ? highlighted : -1;

  // Загрузка подсказок: с задержкой и с отменой предыдущего запроса,
  // иначе ответы могут прийти не в том порядке, в котором отправлены.
  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { items: Suggestion[]; total: number } | null) => {
          setResult({
            query: trimmed,
            items: data?.items ?? [],
            total: data?.total ?? 0,
          });
        })
        .catch((error: unknown) => {
          // Отмена — штатная ситуация, а не сбой.
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Помечаем запрос обработанным, иначе спиннер останется навсегда.
          setResult({ query: trimmed, items: [], total: 0 });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, canSearch]);

  // Закрытие по клику вне поля.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Быстрый вызов с клавиатуры — привычное сочетание для поиска.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function runSearch(value: string) {
    const target = value.trim();
    if (!target) return;

    setHistory(pushSearchHistory(target));
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(target)}`);
  }

  function openProduct(item: Suggestion) {
    // Запрос привёл к товару — значит он был удачным и его стоит помнить.
    if (canSearch) setHistory(pushSearchHistory(trimmed));
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(`/product/${item.slug}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (optionCount === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setHighlighted((current) => {
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = current + step;
        if (next < 0) return optionCount - 1;
        if (next >= optionCount) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (canSearch) {
        const active = activeIndex >= 0 ? items[activeIndex] : undefined;
        if (active) openProduct(active);
        else runSearch(trimmed);
        return;
      }

      // Пустое поле: Enter запускает выбранный запрос из истории.
      const fromHistory = activeIndex >= 0 ? history[activeIndex] : undefined;
      if (fromHistory) runSearch(fromHistory);
    }
  }

  // Пустое поле тоже показывает панель: по клику должно что-то
  // открыться, иначе поле выглядит неживым.
  const hasIdlePanel = showHistory || quickBrands.length > 0;
  const showPanel = isOpen && (canSearch || hasIdlePanel);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="group relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-accent-text"
          strokeWidth={1.5}
          aria-hidden
        />

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(-1);
            setIsOpen(true);
          }}
          onFocus={() => {
            setHistory(readSearchHistory());
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Модель, референс или бренд"
          aria-label="Поиск по каталогу"
          maxLength={100}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          className={cn(
            "h-10 w-full rounded-sm border border-border-control bg-transparent pl-10 text-sm",
            "transition-colors duration-300 ease-[var(--ease-lux)] placeholder:text-subtle",
            "hover:border-border-hover focus:border-accent focus:outline-none",
            // Место справа под подсказку сочетания клавиш или крестик.
            "pr-10",
            // Нативный крестик очистки дублировал бы наш собственный.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        {/* Справа: индикатор загрузки, очистка или подсказка сочетания. */}
        <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-subtle" aria-hidden />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setHighlighted(-1);
                inputRef.current?.focus();
              }}
              aria-label="Очистить поиск"
              className="flex size-6 items-center justify-center rounded-sm text-subtle transition-colors hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : (
            <kbd className="hidden rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-subtle lg:block">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {showPanel ? (
        <div className="card-surface absolute top-[calc(100%+0.5rem)] right-0 left-0 z-50 overflow-hidden shadow-[var(--shadow-float)]">
          {!canSearch ? (
            <>
              {showHistory ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-border px-3 py-2.5">
                    <p className="eyebrow">Вы искали</p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistory(clearSearchHistory());
                        inputRef.current?.focus();
                      }}
                      className="text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      Очистить
                    </button>
                  </div>

                  <ul id={listId} role="listbox" aria-label="Недавние запросы">
                    {history.map((entry, index) => (
                      <li
                        key={entry}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={cn(
                          "flex items-center transition-colors",
                          index === activeIndex && "bg-surface-muted",
                        )}
                        onMouseEnter={() => setHighlighted(index)}
                      >
                        <button
                          type="button"
                          onClick={() => runSearch(entry)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                        >
                          <Clock
                            className="size-3.5 shrink-0 text-subtle"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          <span className="truncate text-sm">{entry}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHistory(removeSearchHistory(entry));
                            inputRef.current?.focus();
                          }}
                          aria-label={`Убрать из истории: ${entry}`}
                          className="flex size-9 shrink-0 items-center justify-center text-subtle transition-colors hover:text-foreground"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {quickBrands.length > 0 ? (
                <div className={showHistory ? "border-t border-border p-3" : "p-3"}>
                  <p className="eyebrow px-1">Мануфактуры</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {quickBrands.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/brands/${item.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent-text"
                        >
                          {item.name}
                          <span className="font-mono text-[0.625rem] text-subtle tabular-nums">
                            {item.productCount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : items.length > 0 ? (
            <>
              <ul id={listId} role="listbox" aria-label="Найденные модели">
                {items.map((item, index) => (
                  <li
                    key={item.slug}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setIsOpen(false)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        "flex items-center gap-3.5 px-3 py-2.5 transition-colors",
                        index === activeIndex && "bg-surface-muted",
                      )}
                    >
                      <span className="photo-surface relative size-12 shrink-0 overflow-hidden rounded-sm border border-border">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="eyebrow block">{item.brandName}</span>
                        <span className="mt-0.5 block truncate font-display text-sm font-medium">
                          {item.name}
                        </span>
                        {item.reference ? (
                          <span className="mt-0.5 block truncate font-mono text-[0.625rem] text-subtle">
                            {item.reference}
                          </span>
                        ) : null}
                      </span>

                      {item.priceCents !== null ? (
                        <span className="shrink-0 text-sm whitespace-nowrap">
                          {formatDisplayPrice(item.priceCents, item.vatScheme)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => runSearch(trimmed)}
                className="flex w-full items-center justify-between gap-3 border-t border-border px-3 py-3 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <span>Показать все результаты</span>
                <span className="font-mono tabular-nums">{total}</span>
              </button>
            </>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted">
              {isLoading ? "Ищем…" : "Ничего не нашлось"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
