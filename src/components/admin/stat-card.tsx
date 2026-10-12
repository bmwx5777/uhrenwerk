import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  href?: Route;
  tone?: "neutral" | "warning" | "danger";
};

/** Плитка со числом на сводке. Кликабельна, если есть куда вести. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "neutral",
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "border p-5 transition-colors",
        tone === "warning" && "border-warning-600/40 bg-warning-600/5",
        tone === "danger" && "border-danger-600/40 bg-danger-100/40",
        tone === "neutral" && "border-border bg-surface",
        href && "hover:border-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon ? (
          <Icon className="size-4 text-subtle" strokeWidth={1.5} aria-hidden />
        ) : null}
      </div>
      <p className="mt-3 font-display text-2xl font-medium">{value}</p>
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
