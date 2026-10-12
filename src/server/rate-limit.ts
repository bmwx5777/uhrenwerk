import "server-only";

import { headers } from "next/headers";

/**
 * Ограничение частоты для публичных действий.
 *
 * Счётчики живут в памяти процесса. Для одного инстанса этого достаточно,
 * и это честный компромисс: добавлять Redis ради двух форм рано.
 * ОГРАНИЧЕНИЕ, о котором нужно помнить: при нескольких инстансах лимит
 * действует на каждый отдельно, а при перезапуске сбрасывается. Когда
 * появится второй инстанс — переносим в Redis (Upstash) или в таблицу.
 *
 * Защищаем то, что доступно без входа и чем можно злоупотреблять:
 * подписку на рассылку (рассылка писем на чужие адреса) и поиск заказа
 * (перебор номеров).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Чтобы карта не росла бесконечно, изредка чистим истёкшие записи. */
function pruneExpired(now: number): void {
  if (buckets.size < 1000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Ключ запроса.
 *
 * `x-forwarded-for` можно подделать, если приложение открыто напрямую;
 * за обратным прокси (Vercel, nginx) заголовок перезаписывается и
 * значению можно верить. Это не защита от распределённой атаки,
 * а защита от одного скрипта в цикле.
 */
async function requestKey(scope: string): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip") || "unknown";

  return `${scope}:${ip}`;
}

export type RateLimitResult = {
  ok: boolean;
  /** Через сколько секунд можно повторить. */
  retryAfterSeconds: number;
  remaining: number;
};

export async function checkRateLimit(
  scope: string,
  options: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = await requestKey(scope);
  pruneExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return { ok: true, retryAfterSeconds: 0, remaining: options.limit - 1 };
  }

  if (bucket.count >= options.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    retryAfterSeconds: 0,
    remaining: options.limit - bucket.count,
  };
}

/** Человеческий текст: «попробуйте через 3 минуты». */
export function retryAfterMessage(seconds: number): string {
  if (seconds < 60) return `Попробуйте через ${seconds} с.`;
  const minutes = Math.ceil(seconds / 60);
  return `Слишком много попыток. Попробуйте через ${minutes} мин.`;
}
