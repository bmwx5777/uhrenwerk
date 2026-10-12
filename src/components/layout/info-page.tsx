import type { ReactNode } from "react";

type InfoPageProps = {
  title: string;
  lead?: string;
  children: ReactNode;
};

/**
 * Каркас текстовой страницы (доставка, возврат, правовые документы).
 * Типографика задана руками, без плагина typography: правил немного,
 * а контроль над межстрочными интервалами нужен точный.
 */
export function InfoPage({ title, lead, children }: InfoPageProps) {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-headline font-medium">{title}</h1>
        {lead ? (
          <p className="mt-5 text-base leading-relaxed text-muted">{lead}</p>
        ) : null}
        <div className="mt-10 flex flex-col gap-6 text-sm leading-relaxed [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_p]:text-muted [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:text-muted">
          {children}
        </div>
      </div>
    </div>
  );
}
