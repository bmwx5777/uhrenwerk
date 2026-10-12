"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type BrandMenuItem = {
  slug: string;
  name: string;
  countryCode: string | null;
  productCount: number;
};

/**
 * Выпадающий список брендов в шапке.
 *
 * Это кнопка с `aria-expanded`, а не ссылка: панель раскрывается, а не
 * ведёт на другой адрес, и скринридер должен сообщать её состояние.
 * Сам раздел остаётся доступен — ссылка «Все бренды» лежит внутри.
 *
 * Наведение мышью тоже открывает панель, но это только удобство:
 * клавиатура и касание работают через нажатие, без зависимости от hover.
 */
export function BrandsMenu({ brands }: { brands: BrandMenuItem[] }) {
  const panelId = useId();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = pathname === "/brands" || pathname.startsWith("/brands/");

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const available = brands.filter((item) => item.productCount > 0);
  const shown = available.length > 0 ? available : brands;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "group relative flex items-center gap-1.5 text-sm transition-colors",
          isActive ? "text-foreground" : "text-muted hover:text-foreground",
        )}
      >
        Бренды
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-300",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "absolute -bottom-1.5 left-0 h-px w-full origin-center bg-accent transition-transform duration-500 ease-[var(--ease-lux)]",
            isActive || isOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
          )}
          aria-hidden
        />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="card-surface absolute top-[calc(100%+1.25rem)] left-1/2 z-50 w-[34rem] -translate-x-1/2 p-5 shadow-[var(--shadow-float)]"
        >
          <ul className="grid grid-cols-2 gap-x-6">
            {shown.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/brands/${item.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-baseline justify-between gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-medium transition-colors group-hover:text-accent-text">
                      {item.name}
                    </span>
                    {item.countryCode ? (
                      <span className="mt-0.5 block font-mono text-[0.625rem] tracking-wide text-subtle">
                        {item.countryCode}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-subtle tabular-nums">
                    {item.productCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="rule-fade mt-3" aria-hidden />

          <Link
            href="/brands"
            onClick={() => setIsOpen(false)}
            className="mt-3 block px-2 text-xs tracking-[0.12em] text-accent-text uppercase transition-colors hover:text-foreground"
          >
            Все мануфактуры
          </Link>
        </div>
      ) : null}
    </div>
  );
}
