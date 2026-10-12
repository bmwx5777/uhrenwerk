import { Gauge, Microscope, ShieldCheck, Waves } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "О магазине",
  description:
    "Как UHRENWERK отбирает и проверяет часы: сверка компонентов с референсом, замер точности на таймграфере, тест водозащиты и оценка состояния корпуса.",
};

/**
 * Четыре проверки, которые проходит каждый pre-owned экземпляр.
 * Раньше они были перечислены одной фразой внутри абзаца — так их
 * никто не читал, хотя это главный аргумент магазина.
 */
const INSPECTION = [
  {
    icon: Microscope,
    title: "Компоненты",
    text: "Сверяем корпус, циферблат, стрелки и механизм с заводским референсом модели.",
  },
  {
    icon: Gauge,
    title: "Точность хода",
    text: "Замеряем на таймграфере в нескольких положениях — результат пишем в карточку.",
  },
  {
    icon: Waves,
    title: "Водозащита",
    text: "Проверяем герметичность корпуса и состояние прокладок перед продажей.",
  },
  {
    icon: ShieldCheck,
    title: "Состояние",
    text: "Оцениваем корпус и браслет, фиксируем следы носки и комплектность.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border pb-12">
          <div className="flex items-baseline gap-4">
            <span className="section-index">01</span>
            <p className="eyebrow">О магазине</p>
          </div>

          <h1 className="mt-6 max-w-3xl font-display text-headline font-medium">
            Часы, за которые мы отвечаем именем
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted">
            UHRENWERK — магазин механических часов: новые модели от мануфактур и
            отобранные pre-owned экземпляры с проверкой подлинности.
          </p>
        </header>

        <div className="rule-indices mt-14" aria-hidden />

        <section className="mt-12">
          <div className="flex items-baseline gap-4">
            <span className="section-index">02</span>
            <h2 className="eyebrow">Проверка подлинности</h2>
          </div>

          <div className="mt-6 grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
            <div>
              <p className="font-display text-2xl leading-snug font-medium md:text-3xl">
                Ни один экземпляр не попадает в каталог без часовщика
              </p>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Результат проверки мы не прячем: год выпуска, комплектность и оценка
                состояния указаны в карточке конкретного экземпляра — вместе с серийным
                номером.
              </p>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2">
              {INSPECTION.map((step, index) => (
                <li key={step.title} className="card-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <step.icon
                      className="size-5 text-accent-text"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="section-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-medium">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="rule-indices mt-14" aria-hidden />

        <section className="mt-12">
          <div className="flex items-baseline gap-4">
            <span className="section-index">03</span>
            <h2 className="eyebrow">Гарантия и возврат</h2>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="card-surface p-7">
              <p className="font-display text-xl font-medium">Гарантия 24 месяца</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                На новые часы действует гарантия производителя, на pre-owned — наша
                собственная. Срок указан в карточке каждого экземпляра.
              </p>
            </div>

            <div className="card-surface p-7">
              <p className="font-display text-xl font-medium">Возврат 14 дней</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Для покупателей из ЕС — без объяснения причин. Условия и порядок описаны
                на странице возврата.
              </p>
              <Button asChild variant="link" className="mt-4">
                <Link href="/returns">Условия возврата</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="rule-indices mt-14" aria-hidden />

        <section className="mt-12 pb-4">
          <div className="flex items-baseline gap-4">
            <span className="section-index">04</span>
            <h2 className="eyebrow">Реквизиты</h2>
          </div>

          <div className="card-surface mt-6 p-7">
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Юридическое лицо зарегистрировано на Кипре. Полные реквизиты, номер VAT и
              адрес будут указаны здесь перед запуском.
            </p>
            <div className="rule-fade mt-6 max-w-sm" aria-hidden />
            <p className="mt-6 text-sm">
              Вопрос по конкретной модели?{" "}
              <Link
                href="/order-lookup"
                className="text-accent-text underline-offset-4 hover:underline"
              >
                Проверить статус заказа
              </Link>{" "}
              или{" "}
              <Link
                href="/catalog"
                className="text-accent-text underline-offset-4 hover:underline"
              >
                открыть каталог
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
