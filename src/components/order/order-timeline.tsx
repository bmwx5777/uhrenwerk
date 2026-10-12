import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type OrderTimelineProps = {
  placedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
};

const FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Путь заказа по отметкам времени.
 *
 * Отдельной таблицы истории статусов нет: в заказе хранятся даты
 * ключевых событий, и этого достаточно, чтобы показать путь без
 * догадок о том, чего не было.
 */
export function OrderTimeline({
  placedAt,
  paidAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
}: OrderTimelineProps) {
  const steps = cancelledAt
    ? [
        { label: "Заказ создан", at: placedAt },
        { label: "Отменён", at: cancelledAt },
      ]
    : [
        { label: "Заказ создан", at: placedAt },
        { label: "Оплачен", at: paidAt },
        { label: "Отправлен", at: shippedAt },
        { label: "Доставлен", at: deliveredAt },
      ];

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step) => {
        const done = step.at !== null;

        return (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                done ? "border-success-600 bg-success-600/10" : "border-border",
              )}
              aria-hidden
            >
              {done ? (
                <Check className="size-3 text-success-600" strokeWidth={2.5} />
              ) : null}
            </span>

            <div>
              <p className={cn("text-sm", !done && "text-subtle")}>{step.label}</p>
              {step.at ? (
                <p className="text-xs text-subtle">{FORMATTER.format(step.at)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
