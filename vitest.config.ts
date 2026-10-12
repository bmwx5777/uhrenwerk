import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Тесты покрывают чистую логику: деньги, налог, разбор параметров URL.
 *
 * Именно там ошибка стоит дороже всего и именно там её можно проверить
 * без базы и браузера. Запросы к базе проверяются прогоном по живой
 * базе (так были найдены переполнение int4 и расхождение в 2 цента);
 * выносить их в unit-тесты с моками смысла нет — моки повторили бы мои
 * же предположения о поведении Postgres.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
