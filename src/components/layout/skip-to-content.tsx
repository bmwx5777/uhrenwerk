/**
 * Ссылка «перейти к содержимому».
 *
 * Первое, на что попадает Tab: без неё человек с клавиатуры каждый раз
 * проходит всю шапку и навигацию, чтобы добраться до товаров. Видна
 * только в фокусе.
 */
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only bg-inverse text-inverse-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-sm"
    >
      Перейти к содержимому
    </a>
  );
}
