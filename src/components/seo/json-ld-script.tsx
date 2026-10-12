/**
 * Вставка структурированных данных на страницу.
 *
 * `JSON.stringify` безопасен для содержимого скрипта, но закрывающий
 * тег внутри строки прервал бы его — поэтому экранируем «<».
 */
export function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Содержимое генерируем сами, из своих данных — чужой разметки здесь нет.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
