"use client";

import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CART_COUNT_EVENT,
  WISHLIST_COUNT_EVENT,
  subscribeToCount,
} from "@/lib/client-events";
import { ThemeToggle } from "./theme-toggle";

const ICON_LINK_CLASSES =
  "text-foreground hover:text-accent-text relative flex size-11 items-center justify-center transition-colors";

/**
 * Иконки действий в шапке со счётчиками.
 *
 * Клиентский компонент по необходимости: числа зависят от cookie и сессии.
 * Если читать их в серверной шапке, динамическими станут все страницы
 * сайта, включая главную и каталог. Поэтому шапка остаётся статической,
 * а счётчики подгружаются одним запросом после загрузки страницы и дальше
 * обновляются событиями от кнопок «в корзину» и «в избранное».
 */
export function HeaderActions() {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/cart/count", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { cart: number; wishlist: number } | null) => {
        if (!data) return;
        setCartCount(data.cart);
        setWishlistCount(data.wishlist);
      })
      .catch(() => {
        // Счётчик не критичен: при сбое сети просто не показываем число.
      });

    const unsubscribeCart = subscribeToCount(CART_COUNT_EVENT, setCartCount);
    const unsubscribeWishlist = subscribeToCount(
      WISHLIST_COUNT_EVENT,
      setWishlistCount,
    );

    return () => {
      controller.abort();
      unsubscribeCart();
      unsubscribeWishlist();
    };
  }, []);

  return (
    <div className="flex items-center">
      {/* На широких экранах поиск — поле в шапке, иконка там лишняя. */}
      <Link
        href="/search"
        aria-label="Поиск"
        className={`${ICON_LINK_CLASSES} md:hidden`}
      >
        <Search className="size-5" strokeWidth={1.5} aria-hidden />
      </Link>

      <Link
        href="/wishlist"
        aria-label={`Избранное${wishlistCount > 0 ? `: ${wishlistCount}` : ""}`}
        className={ICON_LINK_CLASSES}
      >
        <Heart className="size-5" strokeWidth={1.5} aria-hidden />
        <CountBubble value={wishlistCount} />
      </Link>

      <Link
        href="/cart"
        aria-label={`Корзина${cartCount > 0 ? `: ${cartCount}` : ""}`}
        className={ICON_LINK_CLASSES}
      >
        <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
        <CountBubble value={cartCount} />
      </Link>

      <ThemeToggle />

      <Link
        href="/account"
        aria-label="Личный кабинет"
        className={`${ICON_LINK_CLASSES} hidden md:flex`}
      >
        <User className="size-5" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}

function CountBubble({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span
      aria-hidden
      className="absolute top-1 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-inverse px-1 text-[0.625rem] leading-4 font-semibold text-inverse-foreground"
    >
      {value > 9 ? "9+" : value}
    </span>
  );
}
