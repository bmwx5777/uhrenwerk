import { ClipboardList, LayoutDashboard, Package } from "lucide-react";
import Link from "next/link";

const ADMIN_NAV = [
  { href: "/admin", label: "Сводка", icon: LayoutDashboard },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/orders", label: "Заказы", icon: ClipboardList },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Разделы админки">
      <ul className="-mx-5 flex gap-6 overflow-x-auto border-b border-border px-5 pb-3 lg:mx-0 lg:flex-col lg:gap-1 lg:border-none lg:px-0 lg:pb-0">
        {ADMIN_NAV.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className="flex items-center gap-2 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:bg-surface-muted hover:text-foreground lg:px-3"
            >
              <item.icon className="size-4" strokeWidth={1.5} aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
