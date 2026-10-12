"use client";

import { useEffect, useRef, useState } from "react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatDisplayPrice, type VatScheme } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type StickyBuyBarProps = {
  productId: string;
  productUnitId?: string | undefined;
  netPriceCents: number | null;
  vatScheme: VatScheme;
  name: string;
  disabled?: boolean;
};

/**
 * Панель покупки, прилипающая к низу экрана на мобильном.
 *
 * Карточка часов — это длинная страница: описание, характеристики,
 * экземпляры. Без такой панели покупателю приходится возвращаться
 * наверх, чтобы положить товар в корзину.
 *
 * Появляется только после прокрутки за первый экран, чтобы не перекрывать
 * основную кнопку, и только на узких экранах.
 */
export function StickyBuyBar({
  productId,
  productUnitId,
  netPriceCents,
  vatScheme,
  name,
  disabled = false,
}: StickyBuyBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    function update() {
      frame.current = null;
      setIsVisible(window.scrollY > window.innerHeight * 0.8);
    }

    function onScroll() {
      // Состояние меняем не чаще одного раза на кадр: обработчик
      // прокрутки не должен нагружать поток рендера.
      if (frame.current === null) {
        frame.current = window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-sm transition-transform duration-300 ease-[var(--ease-lux)] md:hidden",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
      // Панель вне потока: скрытую не должен находить ни Tab, ни скринридер.
      // inert убирает из навигации всё содержимое целиком.
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{name}</p>
          <p className="text-sm text-muted">
            {netPriceCents !== null
              ? formatDisplayPrice(netPriceCents, vatScheme)
              : "Цена по запросу"}
          </p>
        </div>

        <AddToCartButton
          productId={productId}
          productUnitId={productUnitId}
          disabled={disabled}
          size="md"
        />
      </div>
    </div>
  );
}
