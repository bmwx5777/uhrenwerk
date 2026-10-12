import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Layout оформления заказа.
 *
 * Без каталога и меню: на этом шаге из страницы есть два выхода —
 * завершить заказ или вернуться в корзину. Всё остальное отвлекает.
 */
export default function CheckoutLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center justify-between md:h-20">
          <Link
            href="/"
            className="font-display text-base font-medium tracking-[0.14em] uppercase"
          >
            Uhrenwerk
          </Link>

          <span className="flex items-center gap-2 text-xs text-subtle">
            <Lock className="size-3.5" aria-hidden />
            Защищённое соединение
          </span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8">
        <div className="container-page flex flex-col gap-2 text-xs text-subtle md:flex-row md:justify-between">
          <span>© 2026 UHRENWERK</span>
          <span className="flex gap-4">
            <Link href="/shipping" className="hover:text-foreground">
              Доставка
            </Link>
            <Link href="/returns" className="hover:text-foreground">
              Возврат
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Условия
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
