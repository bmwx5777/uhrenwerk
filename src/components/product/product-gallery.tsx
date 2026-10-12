"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  title: string;
};

/**
 * Галерея товара.
 *
 * Мобильная и десктопная версии — разные по сути, а не по размеру:
 * на телефоне горизонтальная прокрутка с прилипанием (привычный свайп),
 * на десктопе крупное фото с миниатюрами, где работает клавиатура.
 */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="photo-surface flex aspect-square items-center justify-center rounded-lg border border-border text-sm text-subtle">
        Фотографии готовятся
      </div>
    );
  }

  return (
    <div>
      {/* Мобильная версия: свайп по фотографиям */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:hidden">
        {images.map((image) => (
          <div
            key={image.id}
            className="hairline-frame photo-surface relative aspect-square w-[85%] shrink-0 snap-center overflow-hidden rounded-lg border border-border"
          >
            <Image
              src={image.url}
              alt={image.alt ?? title}
              fill
              sizes="85vw"
              className="object-cover"
              priority={image === images[0]}
            />
          </div>
        ))}
      </div>

      {/* Десктопная версия: основное фото и миниатюры */}
      <div className="hidden md:block">
        <div className="corner-marks hairline-frame photo-surface relative aspect-square overflow-hidden rounded-lg border border-border">
          <Image
            src={active.url}
            alt={active.alt ?? title}
            fill
            sizes="(min-width: 1024px) 30rem, 90vw"
            className="object-cover"
            priority
          />
        </div>

        {images.length > 1 ? (
          <div className="mt-4 flex gap-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Фотография ${index + 1}`}
                aria-current={index === activeIndex || undefined}
                className={cn(
                  "photo-surface relative aspect-square w-16 overflow-hidden rounded-md border transition-colors",
                  index === activeIndex
                    ? "border-accent"
                    : "border-border-control hover:border-border-hover",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
