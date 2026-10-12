import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Проверка на границе: есть ли cookie сессии.
 *
 * В Next 16 этот файл называется `proxy.ts` (раньше — `middleware.ts`)
 * и всегда исполняется в Node-рантайме.
 *
 * Проверка намеренно оптимистичная: смотрим только наличие cookie, не
 * обращаясь к базе, чтобы не добавлять запрос к каждому переходу.
 * Авторитетная проверка — `requireUser()` в layout кабинета: он читает
 * сессию из базы и редиректит, если она недействительна. Задача этого
 * файла — не гонять человека без cookie через рендер страницы,
 * а сразу отправить на вход с адресом возврата.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
