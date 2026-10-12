import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false },
};

/** 404. Не тупик: даём путь в каталог и к поиску. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center py-16">
        <div className="w-full">
          <p className="eyebrow">Ошибка 404</p>
          <EmptyState
            className="mt-6 border-solid"
            icon={Compass}
            title="Такой страницы нет"
            description="Возможно, модель уже продана или адрес введён с опечаткой. Посмотрите каталог — скорее всего, нужное найдётся там."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/catalog">В каталог</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/search">Поиск по каталогу</Link>
                </Button>
              </div>
            }
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
