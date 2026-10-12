import { createAuthClient } from "better-auth/react";

import { appUrl } from "./env/client";

/**
 * Клиент Better Auth для браузера.
 *
 * Формы входа и регистрации работают через серверные действия (валидация
 * на сервере), а клиент нужен там, где действие должно пройти без
 * перезагрузки страницы: выход из аккаунта и повторная отправка письма.
 */
export const authClient = createAuthClient({ baseURL: appUrl });

export const { signOut, useSession } = authClient;
