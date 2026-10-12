"use client";

import { ImageUp, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addProductImageAction,
  deleteProductImageAction,
} from "@/server/actions/admin";

type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Фотографии товара: загрузка файлов и добавление по адресу.
 *
 * Загрузка идёт через route handler (`/api/admin/upload`), а не через
 * серверное действие: у действий лимит тела около мегабайта, фотографии
 * часов весят больше. Файл сохраняется, его адрес сразу уходит в
 * `addProductImageAction` — для администратора это одно действие,
 * а не «загрузить, скопировать адрес, вставить».
 *
 * Поле с адресом оставлено: оно нужно, когда фотографии уже лежат
 * в CDN или у поставщика.
 */
export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const { formAction, isPending, fieldError, formRef } = useFormAction(
    addProductImageAction,
    { resetOnSuccess: true },
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isWorking, startTransition] = useTransition();

  function handleDelete(imageId: string) {
    setDeletingId(imageId);
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId);
      if (result.status === "ok") toast.success(result.message);
      else toast.error(result.message);
      setDeletingId(null);
    });
  }

  async function uploadOne(file: File, makePrimary: boolean): Promise<boolean> {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body,
    });

    const payload = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.url) {
      toast.error(payload?.error ?? `Не удалось загрузить ${file.name}`);
      return false;
    }

    // Файл сохранён — сразу привязываем его к товару.
    const attach = new FormData();
    attach.append("productId", productId);
    attach.append("url", payload.url);
    attach.append("alt", file.name.replace(/\.[^.]+$/, ""));
    if (makePrimary) attach.append("isPrimary", "on");

    const result = await addProductImageAction(null, attach);

    if (result.status === "error") {
      toast.error(result.message);
      return false;
    }

    return true;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);

    startTransition(async () => {
      let uploaded = 0;

      for (const [index, file] of selected.entries()) {
        setUploadProgress(
          selected.length > 1
            ? `Загружаем ${index + 1} из ${selected.length}…`
            : "Загружаем…",
        );

        // Первое фото у товара без фотографий становится главным.
        const makePrimary = images.length === 0 && index === 0;
        if (await uploadOne(file, makePrimary)) uploaded += 1;
      }

      setUploadProgress(null);
      if (fileInput.current) fileInput.current.value = "";

      if (uploaded > 0) {
        toast.success(
          uploaded === 1
            ? "Фотография добавлена."
            : `Добавлено фотографий: ${uploaded}.`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="card-surface overflow-hidden">
              <div className="relative aspect-square bg-surface-muted">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {image.isPrimary ? (
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-surface px-2 py-1 text-[0.625rem] uppercase">
                    <Star className="size-3 fill-accent text-accent" aria-hidden />
                    главное
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-xs text-subtle">{image.url}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Удалить изображение"
                  disabled={deletingId === image.id}
                  onClick={() => handleDelete(image.id)}
                  className="size-8 text-muted hover:text-danger-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Фотографий пока нет. Первая загруженная станет главной — именно она
          показывается в каталоге.
        </p>
      )}

      {/* Загрузка файлов */}
      <div className="rounded-lg border border-dashed border-border-control p-6">
        <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
          <ImageUp className="size-7 text-subtle" strokeWidth={1.25} aria-hidden />
          <span className="text-sm">
            Выберите фотографии часов
            <span className="mt-1 block text-xs text-subtle">
              JPEG, PNG, WebP или AVIF, до 8 МБ каждая. Можно выбрать сразу несколько.
            </span>
          </span>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            multiple
            disabled={isWorking}
            onChange={(event) => handleFiles(event.target.files)}
            className="sr-only"
          />
          <span className="mt-1 inline-flex h-11 items-center rounded-md border border-border-control px-5 text-sm font-medium">
            {uploadProgress ?? "Выбрать файлы"}
          </span>
        </label>
      </div>

      {/* Добавление по адресу — для фотографий из CDN или от поставщика */}
      <details className="border-t border-border pt-6">
        <summary className="cursor-pointer text-sm text-muted">
          Добавить по адресу вместо загрузки
        </summary>

        <form ref={formRef} action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="productId" value={productId} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Адрес изображения"
              hint="/placeholder/watch-1.svg или https://…"
              error={fieldError("url")}
              required
            >
              {(control) => <Input name="url" required {...control} />}
            </Field>

            <Field
              label="Альтернативный текст"
              hint="Описание для скринридеров и поиска"
              error={fieldError("alt")}
            >
              {(control) => <Input name="alt" {...control} />}
            </Field>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name="isPrimary" className="size-4 accent-accent" />
            Сделать главным
          </label>

          <Button
            type="submit"
            variant="secondary"
            isPending={isPending}
            className="self-start"
          >
            Добавить изображение
          </Button>
        </form>
      </details>
    </div>
  );
}
