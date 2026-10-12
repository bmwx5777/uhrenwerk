/**
 * История поисковых запросов.
 *
 * Хранится в localStorage, а не на сервере: это удобство одного
 * браузера, а не данные аккаунта. На сервере она потребовала бы таблицы,
 * привязки к сессии и согласия на обработку — несоразмерно задаче.
 *
 * Все обращения обёрнуты в try/catch: в приватном режиме и при запрете
 * хранилища доступ к localStorage бросает исключение, и поиск не должен
 * из-за этого падать.
 */

const STORAGE_KEY = "uhrenwerk-search-history";

/** Больше десятка строк в выпадающем списке читать уже невозможно. */
const MAX_ENTRIES = 6;

/** Отсекает мусор: слишком длинная строка в историю не попадает. */
const MAX_QUERY_LENGTH = 100;

export function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Содержимое localStorage может быть испорчено чем угодно, поэтому
    // проверяем каждый элемент, а не доверяем типу целиком.
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= MAX_QUERY_LENGTH)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function write(entries: string[]): string[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Приватный режим: история не сохранится, но поиск продолжит работать.
  }
  return entries;
}

/**
 * Добавляет запрос в начало списка.
 *
 * Повтор поднимается наверх, а не дублируется: сравнение без учёта
 * регистра, иначе «Rolex» и «rolex» заняли бы две строки из шести.
 */
export function pushSearchHistory(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return readSearchHistory();

  const rest = readSearchHistory().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );

  return write([trimmed, ...rest].slice(0, MAX_ENTRIES));
}

export function removeSearchHistory(query: string): string[] {
  return write(readSearchHistory().filter((item) => item !== query));
}

export function clearSearchHistory(): string[] {
  return write([]);
}
