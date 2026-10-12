import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Страница сама знает свой базовый путь и собирает ссылку с фильтрами. */
  hrefForPage: (page: number) => Route;
};

/** Номера страниц с многоточиями: 1 … 4 5 6 … 12 */
function pageNumbers(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;

  for (const value of visible) {
    if (previous && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }

  return result;
}

const ITEM_CLASSES =
  "flex size-10 items-center justify-center border text-sm transition-colors";

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Страницы каталога"
      className="mt-12 flex items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={hrefForPage(page - 1)}
          aria-label="Предыдущая страница"
          className={cn(ITEM_CLASSES, "border-border hover:border-foreground")}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(ITEM_CLASSES, "border-border text-subtle")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageNumbers(page, totalPages).map((value, index) =>
        value === "gap" ? (
          <span
            key={`gap-${index}`}
            className="flex size-10 items-center justify-center text-sm text-subtle"
          >
            …
          </span>
        ) : (
          <Link
            key={value}
            href={hrefForPage(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              ITEM_CLASSES,
              value === page
                ? "border-foreground bg-inverse text-inverse-foreground"
                : "border-border hover:border-foreground",
            )}
          >
            {value}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={hrefForPage(page + 1)}
          aria-label="Следующая страница"
          className={cn(ITEM_CLASSES, "border-border hover:border-foreground")}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(ITEM_CLASSES, "border-border text-subtle")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
