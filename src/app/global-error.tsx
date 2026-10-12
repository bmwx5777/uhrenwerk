"use client";

/**
 * Последний рубеж: ошибка в корневом layout. Здесь нет ни наших стилей,
 * ни шапки — поэтому разметка автономна и содержит свои базовые стили.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#f7f4ef",
          color: "#171410",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            Сайт временно недоступен
          </h1>
          <p style={{ color: "#56514a", lineHeight: 1.6 }}>
            Произошла ошибка в основе приложения. Мы уже знаем о проблеме — попробуйте
            обновить страницу через минуту.
          </p>
          {error.digest ? (
            <p style={{ color: "#67615a", fontSize: "0.75rem" }}>
              Код ошибки: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.75rem",
              background: "#171410",
              color: "#fffdfa",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
