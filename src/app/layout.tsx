import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";
import { appUrl } from "@/lib/env/client";
import { DEFAULT_THEME, THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

/*
 * Классическая люксовая пара: засечки в заголовках, гротеск в интерфейсе.
 * Playfair Display — высококонтрастная антиква, она и создаёт ощущение
 * витрины; Geist отвечает за всё функциональное, Geist Mono — за
 * референсы, серийные номера и номера заказов, где важна одинаковая
 * ширина цифр.
 *
 * У всех трёх есть кириллица: интерфейс русский, поэтому гарнитуры без
 * неё (Bodoni Moda, Marcellus, Instrument Serif) не подходят.
 */
const geist = Geist({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-geist",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "UHRENWERK — швейцарские и люксовые часы",
    template: "%s · UHRENWERK",
  },
  description:
    "Отобранная коллекция механических часов: новые и pre-owned модели с гарантией подлинности и доставкой по миру.",
  openGraph: {
    type: "website",
    siteName: "UHRENWERK",
    locale: "ru_RU",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Один цвет: сайт больше не следует системной теме, основная — светлая.
  themeColor: "#f7f4ef",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-theme={DEFAULT_THEME}
      // Атрибут data-theme меняет скрипт ниже — до гидратации, поэтому
      // значение на сервере и на клиенте может не совпасть намеренно.
      suppressHydrationWarning
      className={`${geist.variable} ${display.variable} ${geistMono.variable}`}
    >
      <head>
        {/*
         * Синхронный инлайновый скрипт: ставит тему до первой отрисовки.
         * Любая отложенная загрузка здесь — это моргание чужой темой.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
