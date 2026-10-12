"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type BasePath = "/catalog" | "/search";

/**
 * Адрес в пределах каталога или поиска.
 *
 * Тип указан явно: TypeScript по умолчанию выводит для шаблонных строк
 * обычный `string`, а типизированные маршруты Next.js (`typedRoutes`)
 * требуют литеральный тип — без этой аннотации router.replace не примет
 * собранную ссылку.
 */
type CatalogHref = BasePath | `${BasePath}?${string}`;

/**
 * Работа с фильтрами через URL.
 *
 * Состояние фильтров живёт в адресной строке, а не в React-состоянии:
 * ссылку можно отправить, страницу — перезагрузить, кнопка «назад» работает,
 * а серверный компонент получает параметры и сам делает запрос к базе.
 */
export function useCatalogParams(basePath: BasePath) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const buildHref = useCallback(
    (updates: Record<string, string | null>): CatalogHref => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      // Любое изменение фильтра возвращает на первую страницу:
      // иначе можно остаться на пятой странице пустого результата.
      next.delete("page");

      const queryString = next.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    [basePath, searchParams],
  );

  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const href = buildHref(updates);
      startTransition(() => {
        // replace, а не push: перебор фильтров не должен забивать историю.
        router.replace(href, { scroll: false });
      });
    },
    [buildHref, router],
  );

  /** Добавляет или убирает значение в списке через запятую. */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = (searchParams.get(key) ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      apply({ [key]: next.join(",") });
    },
    [apply, searchParams],
  );

  const reset = useCallback(() => {
    const query = searchParams.get("q");
    // Поисковый запрос сбрасывать нельзя — это не фильтр.
    const href: CatalogHref = query
      ? `${basePath}?q=${encodeURIComponent(query)}`
      : basePath;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [basePath, router, searchParams]);

  return { apply, toggleInList, reset, isPending };
}
