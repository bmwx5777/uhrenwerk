import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth";

/**
 * Единственный HTTP-эндпоинт аутентификации: вход, регистрация, выход,
 * подтверждение адреса, сброс пароля. Всё остальное приложение общается
 * с auth через серверные действия.
 */
export const { GET, POST } = toNextJsHandler(auth);
