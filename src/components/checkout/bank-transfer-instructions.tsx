import { AlertTriangle, Clock } from "lucide-react";

import { formatMoney } from "@/lib/money";

type BankTransferInstructionsProps = {
  reference: string;
  totalCents: number;
  dueAt: Date | null;
  details: {
    beneficiary: string | null;
    iban: string | null;
    bic: string | null;
    bankName: string | null;
  };
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Реквизиты для перевода.
 *
 * Назначение платежа выделено отдельно: по нему мы находим деньги в
 * выписке. Без него зачисление превращается в ручной поиск.
 */
export function BankTransferInstructions({
  reference,
  totalCents,
  dueAt,
  details,
}: BankTransferInstructionsProps) {
  const missingDetails = !details.iban || !details.beneficiary;

  return (
    <div className="card-surface p-6">
      <h2 className="eyebrow">Реквизиты для оплаты</h2>

      {missingDetails ? (
        <div className="mt-4 flex gap-3 border border-danger-600/40 bg-danger-100/40 p-4">
          <AlertTriangle
            className="size-5 shrink-0 text-danger-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-sm">
            Банковские реквизиты не заполнены в настройках магазина (BANK_IBAN,
            BANK_BENEFICIARY). Напишите нам — пришлём счёт письмом.
          </p>
        </div>
      ) : null}

      <dl className="mt-5 divide-y divide-border text-sm">
        <div className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="text-muted">Сумма</dt>
          <dd className="text-base">{formatMoney(totalCents)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="text-muted">Получатель</dt>
          <dd className="text-right">{details.beneficiary ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="text-muted">IBAN</dt>
          <dd className="text-right font-mono text-xs">{details.iban ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="text-muted">BIC / SWIFT</dt>
          <dd className="text-right font-mono text-xs">{details.bic ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-3">
          <dt className="text-muted">Банк</dt>
          <dd className="text-right">{details.bankName ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-5 border border-accent bg-accent-soft p-4">
        <p className="eyebrow">Назначение платежа</p>
        <p className="mt-2 font-mono text-base">{reference}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Укажите это значение точно как здесь — по нему мы находим ваш платёж в
          выписке.
        </p>
      </div>

      {dueAt ? (
        <p className="mt-5 flex items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Резерв товара действует до {DATE_FORMATTER.format(dueAt)}. Как только деньги
          поступят, пришлём подтверждение и начнём сборку.
        </p>
      ) : null}
    </div>
  );
}
