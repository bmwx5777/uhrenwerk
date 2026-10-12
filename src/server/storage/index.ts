import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Хранилище загруженных изображений.
 *
 * Сейчас один драйвер — локальный диск: файлы кладутся в `public/uploads`
 * и отдаются как обычная статика. Этого достаточно для разработки и для
 * собственного сервера.
 *
 * ОГРАНИЧЕНИЕ, о котором нужно знать до деплоя: на платформах с
 * недолговечной файловой системой (Vercel, контейнеры без тома) файлы
 * исчезнут при следующем деплое. Там нужен объектный storage — S3,
 * Cloudflare R2 или Supabase Storage. Интерфейс ниже для этого и
 * сделан: добавляется второй драйвер, вызывающий код не меняется.
 */

export type StoredFile = {
  /** Адрес, по которому картинка доступна с сайта. */
  url: string;
  /** Имя файла в хранилище. */
  key: string;
  sizeBytes: number;
};

export type ImageKind = "jpeg" | "png" | "webp" | "avif";

const EXTENSIONS: Record<ImageKind, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Определение типа по первым байтам файла.
 *
 * Заголовок Content-Type и расширение приходят от клиента, поэтому им
 * нельзя верить: исполняемый файл легко переименовать в .jpg. Проверяем
 * подпись самого файла.
 */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;

  const [b0, b1, b2, b3] = bytes;

  // JPEG: FF D8 FF
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "jpeg";

  // PNG: 89 50 4E 47
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "png";

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  // WebP: "RIFF" .... "WEBP"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";

  // AVIF: ".... ftyp avif" (или avis для последовательностей)
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
  }

  return null;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PREFIX = "/uploads/products";

/**
 * Сохранить изображение.
 *
 * Имя файла генерируем сами: имя из браузера может содержать пути
 * («../../»), чужую кодировку или просто повторяться. Расширение берём
 * из распознанного типа, а не из присланного имени.
 */
export async function storeImage(
  bytes: Uint8Array,
  kind: ImageKind,
): Promise<StoredFile> {
  const key = `${crypto.randomUUID()}.${EXTENSIONS[kind]}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, key), bytes);

  return {
    url: `${PUBLIC_PREFIX}/${key}`,
    key,
    sizeBytes: bytes.byteLength,
  };
}
