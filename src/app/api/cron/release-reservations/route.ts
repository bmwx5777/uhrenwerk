import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { releaseExpiredReservations } from "@/server/services/order";

/**
 * Снятие резерва с неоплаченных заказов.
 *
 * Эндпоинт меняет данные, поэтому закрыт секретом: без заголовка
 * `Authorization: Bearer $CRON_SECRET` отвечает 401. Если секрет не задан,
 * эндпоинт отключён совсем — открытый URL, отменяющий заказы, был бы
 * подарком для любого желающего.
 *
 * Расписание задаётся на стороне хостинга (vercel.json) или системным
 * cron. Запускать чаще раза в 5 минут смысла нет.
 */
export async function GET(request: Request) {
  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET не задан: задача отключена." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");

  if (header !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const result = await releaseExpiredReservations();

  return NextResponse.json({
    released: result.released,
    orders: result.orderNumbers,
    at: new Date().toISOString(),
  });
}
