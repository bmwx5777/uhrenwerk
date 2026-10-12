"use client";

/**
 * Обновление счётчиков в шапке без глобального состояния.
 *
 * Шапка статическая: читать сессию в ней нельзя, иначе все страницы
 * сайта стали бы динамическими. Поэтому счётчики подгружаются один раз
 * запросом, а дальше обновляются событием — серверные действия возвращают
 * новое число, кнопка его рассылает, шапка слушает.
 */

export const CART_COUNT_EVENT = "uw:cart-count";
export const WISHLIST_COUNT_EVENT = "uw:wishlist-count";

function emit(eventName: string, count: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<number>(eventName, { detail: count }));
}

export function emitCartCount(count: number): void {
  emit(CART_COUNT_EVENT, count);
}

export function emitWishlistCount(count: number): void {
  emit(WISHLIST_COUNT_EVENT, count);
}

export function subscribeToCount(
  eventName: string,
  listener: (count: number) => void,
): () => void {
  const handler = (event: Event) => {
    listener((event as CustomEvent<number>).detail);
  };

  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
