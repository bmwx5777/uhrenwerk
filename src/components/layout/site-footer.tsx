import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { PaymentMethodsInline } from "@/components/payment/payment-methods";
import { FOOTER_NAV, LEGAL_NAV } from "@/lib/constants/nav";
import { NewsletterForm } from "./newsletter-form";

/**
 * Подвал.
 *
 * Колонки свёрнуты в аккордеоны только на мобильном. Раньше они были
 * обёрнуты в один `<details>` на все размеры — и на десктопе ссылки
 * оказывались скрыты: браузер прячет содержимое закрытого `<details>`
 * сам, никакой CSS этого не отменяет. Поэтому разметки две, а список
 * ссылок вынесен в общий компонент и не дублируется.
 */
function FooterLinks({ group }: { group: (typeof FOOTER_NAV)[number] }) {
  return (
    <ul className="flex flex-col gap-3">
      {group.links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-sm text-muted transition-colors hover:text-accent-text"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface md:mt-28">
      <div className="container-page py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.4fr] lg:gap-20">
          <div>
            <p className="font-display text-2xl leading-none font-medium tracking-[0.22em] uppercase">
              Uhrenwerk
            </p>
            <div className="rule-fade mt-5 max-w-xs" aria-hidden />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Отобранные механические часы с проверкой подлинности, гарантией и
              страховой доставкой по миру.
            </p>

            <div className="mt-9">
              <p className="eyebrow">Новые поступления раз в месяц</p>
              <div className="mt-4 max-w-md">
                <NewsletterForm />
              </div>
            </div>
          </div>

          {/* Десктоп: три открытые колонки. */}
          <div className="hidden gap-8 sm:grid sm:grid-cols-3">
            {FOOTER_NAV.map((group) => (
              <div key={group.title}>
                <p className="eyebrow">{group.title}</p>
                <div className="rule-fade mt-3" aria-hidden />
                <div className="mt-5">
                  <FooterLinks group={group} />
                </div>
              </div>
            ))}
          </div>

          {/* Мобильный: те же разделы аккордеонами, без JavaScript. */}
          <div className="sm:hidden">
            {FOOTER_NAV.map((group) => (
              <details key={group.title} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4">
                  <span className="eyebrow">{group.title}</span>
                  <ChevronDown
                    className="size-4 text-subtle transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="pb-5">
                  <FooterLinks group={group} />
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Оплата</p>
              <PaymentMethodsInline className="mt-3" />
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-subtle lg:text-right">
              Цены указаны в евро. Для покупателей из ЕС НДС включён, за пределами ЕС
              налог пересчитывается при оформлении.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 text-xs text-subtle md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} UHRENWERK. Все права защищены.</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
