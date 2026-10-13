import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка для Docker: .next/standalone содержит сервер и только нужные
  // зависимости. Vercel эту настройку игнорирует.
  output: "standalone",
  // Включаем позже, на этапе 12 (performance), осознанно и по маршрутам:
  // cacheComponents: true,
  // partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  typedRoutes: true,
  images: {
    // Домены CDN добавим на этапе загрузки изображений товаров.
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Браузер запоминает, что сюда нужно ходить только по HTTPS.
            // Действует только на HTTPS-ответах, локальной разработке
            // не мешает. preload не ставим: включение в список браузеров
            // необратимо на месяцы, это решение владельца домена.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            /*
             * CSP пока в режиме отчёта: он ничего не блокирует, но
             * нарушения видны в консоли браузера. Включать принудительно
             * имеет смысл после того, как станут известны домены
             * платёжного провайдера (этап 8) — у всех свои скрипты
             * и фреймы. Для перехода на enforced:
             *   1) заменить ключ на Content-Security-Policy;
             *   2) добавить nonce к инлайновому скрипту Next (в proxy.ts);
             *   3) убрать unsafe-inline из script-src.
             */
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
