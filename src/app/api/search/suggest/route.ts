import { NextResponse } from "next/server";
import { z } from "zod";

import { listProducts } from "@/server/services/catalog";

/**
 * Подсказки для поиска в шапке.
 *
 * Отдельный route handler, а не серверное действие: подсказки
 * запрашиваются на каждое нажатие клавиши, а действия идут через POST
 * с ревалидацией — это лишняя работа на каждый символ.
 *
 * Запрос тот же, что и на странице поиска (`listProducts` с `search`),
 * поэтому подсказки не могут разойтись с реальной выдачей.
 */

const SUGGESTION_LIMIT = 6;

const querySchema = z.object({
  // Меньше двух символов — слишком широкий запрос, выдача бессмысленна.
  q: z.string().trim().min(2).max(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });

  // Короткий или пустой запрос — не ошибка, просто нечего показывать.
  if (!parsed.success) {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const result = await listProducts({
      search: parsed.data.q,
      perPage: SUGGESTION_LIMIT,
      page: 1,
    });

    return NextResponse.json({
      total: result.total,
      items: result.items.map((item) => ({
        slug: item.slug,
        name: item.name,
        reference: item.reference,
        brandName: item.brandName,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        vatScheme: item.vatScheme,
      })),
    });
  } catch (error) {
    console.error("search.suggest", { error });
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
