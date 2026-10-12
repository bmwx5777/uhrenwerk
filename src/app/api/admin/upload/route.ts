import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { MAX_IMAGE_BYTES, detectImageKind, storeImage } from "@/server/storage";

/**
 * Загрузка изображений товара.
 *
 * Route handler, а не серверное действие: у действий лимит тела запроса
 * около мегабайта, а фотографии часов весят больше.
 *
 * Проверяем всё, что приходит от клиента: роль, размер и подпись файла.
 * Имя и Content-Type из браузера не используем вовсе.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();

  // 404, а не 403: постороннему не нужно знать, что эндпоинт существует.
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Файл пустой" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `Файл больше ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} МБ. Сожмите изображение.`,
      },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);

  if (!kind) {
    return NextResponse.json(
      { error: "Поддерживаются JPEG, PNG, WebP и AVIF." },
      { status: 415 },
    );
  }

  try {
    const stored = await storeImage(bytes, kind);
    return NextResponse.json({ url: stored.url, sizeBytes: stored.sizeBytes });
  } catch (error) {
    console.error("admin.upload", { userId: user.id, error });
    return NextResponse.json({ error: "Не удалось сохранить файл." }, { status: 500 });
  }
}
