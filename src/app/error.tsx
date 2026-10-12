"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";

/**
 * Error boundary маршрута. Получает `reset` — повторную попытку рендера,
 * поэтому обязательно клиентский компонент.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // На этапе 12 здесь будет отправка в систему мониторинга.
    console.error("route error:", error);
  }, [error]);

  return (
    <div className="container-page py-16 md:py-24">
      <ErrorState
        detail={error.digest ? "Код ошибки: " + error.digest : undefined}
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset}>Попробовать снова</Button>
            <Button asChild variant="secondary">
              <Link href="/">На главную</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
