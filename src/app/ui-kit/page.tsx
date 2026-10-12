import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UiKitDemo } from "@/components/dev/ui-kit-demo";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ProductCardSkeleton, SkeletonText } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "UI Kit",
  robots: { index: false, follow: false },
};

const PALETTE = [
  { token: "background", className: "bg-background" },
  { token: "surface", className: "bg-surface" },
  { token: "surface-muted", className: "bg-surface-muted" },
  { token: "foreground", className: "bg-foreground" },
  { token: "muted", className: "bg-muted" },
  { token: "border", className: "bg-border" },
  { token: "accent", className: "bg-accent" },
  { token: "accent-soft", className: "bg-accent-soft" },
  { token: "danger-600", className: "bg-danger-600" },
  { token: "success-600", className: "bg-success-600" },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-10">
      <h2 className="eyebrow">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * Страница-витрина дизайн-системы. Доступна только в разработке:
 * в production отдаёт 404, чтобы не светить внутренний инструмент.
 */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="container-page py-14">
      <p className="eyebrow">Внутренний инструмент</p>
      <h1 className="mt-4 font-display text-headline font-medium">Дизайн-система</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Все примитивы в одном месте — чтобы видеть систему целиком и ловить расхождения
        до того, как они разъедутся по страницам.
      </p>

      <Section title="Палитра">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {PALETTE.map((swatch) => (
            <div key={swatch.token}>
              <div
                className={`h-16 rounded-md border border-border ${swatch.className}`}
              />
              <p className="mt-2 font-mono text-xs text-subtle">{swatch.token}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col divide-y divide-border">
          <p className="pb-5 font-display text-display font-medium">text-display</p>
          <p className="py-5 font-display text-headline font-medium">text-headline</p>
          <p className="py-5 text-base">text-base — основной текст интерфейса</p>
          <p className="py-5 text-sm">text-sm — вторичный текст и подписи</p>
          <p className="eyebrow py-5">eyebrow — надзаголовок</p>
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button isPending>Отправляем</Button>
            <Button disabled>Недоступна</Button>
          </div>
        </div>
      </Section>

      <Section title="Бейджи">
        <div className="flex flex-wrap gap-3">
          <Badge>В наличии</Badge>
          <Badge variant="accent">Новинка</Badge>
          <Badge variant="outline">Pre-owned</Badge>
          <Badge variant="success">Оплачен</Badge>
          <Badge variant="warning">Ожидает оплаты</Badge>
          <Badge variant="danger">Отменён</Badge>
        </div>
      </Section>

      <Section title="Поля формы">
        <div className="grid max-w-xl gap-6">
          <Field label="Email" hint="Пришлём подтверждение заказа" required>
            {(control) => (
              <Input type="email" placeholder="name@example.com" {...control} />
            )}
          </Field>
          <Field label="Серийный номер" error="Номер должен содержать 8 знаков">
            {(control) => <Input defaultValue="78J4K" {...control} />}
          </Field>
          <Field label="Комментарий к заказу">
            {(control) => <Textarea placeholder="Пожелания по доставке" {...control} />}
          </Field>
        </div>
      </Section>

      <Section title="Оверлеи и уведомления">
        <UiKitDemo />
      </Section>

      <Section title="Загрузка">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <div className="sm:col-span-2">
            <SkeletonText lines={5} />
          </div>
        </div>
      </Section>

      <Section title="Пустое состояние">
        <EmptyState
          icon={Inbox}
          title="Заказов пока нет"
          description="Здесь появится история покупок — с номером заказа, статусом и документами."
          action={<Button variant="secondary">В каталог</Button>}
        />
      </Section>

      <Section title="Состояние ошибки">
        <ErrorState
          detail="Код ошибки: 8f2c1b"
          action={<Button>Попробовать снова</Button>}
        />
      </Section>
    </div>
  );
}
