"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Ссылка навигации, которая знает, что она активна.
 *
 * `aria-current="page"` сообщает об этом скринридеру — визуальное
 * выделение цветом само по себе такую информацию не передаёт.
 */
export function NavLink({
  href,
  children,
  className,
}: {
  href: Route;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative transition-colors",
        isActive ? "text-foreground" : "text-muted hover:text-foreground",
        className,
      )}
    >
      {children}
      {/*
       * Латунная черта под пунктом. Выделение цветом дублируется формой:
       * одного цвета недостаточно, чтобы показать текущий раздел.
       */}
      <span
        className={cn(
          "absolute -bottom-1.5 left-0 h-px w-full origin-center bg-accent transition-transform duration-500 ease-[var(--ease-lux)]",
          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
        aria-hidden
      />
    </Link>
  );
}
