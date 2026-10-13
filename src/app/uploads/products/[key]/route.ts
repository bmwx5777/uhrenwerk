import { readStoredImage } from "@/server/storage";

/**
 * Фото товаров, загруженные из админки.
 *
 * Файлы лежат в `public/uploads`, но появляются после сборки, а такие
 * Next в production не отдаёт. На своём сервере их обычно раздаёт Caddy
 * напрямую; этот обработчик нужен `next/image` (он берёт исходник через
 * Next, минуя прокси) и запуску без прокси.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/uploads/products/[key]">,
) {
  const { key } = await params;
  const image = await readStoredImage(key);

  if (!image) {
    return new Response("Не найдено", { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      // Имя файла уникально и не переиспользуется — можно кэшировать навсегда.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
