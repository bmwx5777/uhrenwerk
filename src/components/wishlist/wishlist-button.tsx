"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { emitWishlistCount } from "@/lib/client-events";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/server/actions/wishlist";

type WishlistButtonProps = {
  productId: string;
  productUnitId?: string;
  /**
   * Исходное состояние. Передаётся там, где страница и так читает сессию
   * (карточка товара). В сетке каталога не передаётся: иначе пришлось бы
   * читать сессию и на статической главной, сделав её динамической.
   */
  initialInWishlist?: boolean;
  /** Компактный вариант — поверх изображения в сетке. */
  variant?: "overlay" | "inline";
  className?: string;
};

export function WishlistButton({
  productId,
  productUnitId,
  initialInWishlist = false,
  variant = "overlay",
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleWishlistAction({
        productId,
        ...(productUnitId ? { productUnitId } : {}),
      });

      if (result.requiresAuth) {
        toast.error(result.message);
        router.push("/sign-in?next=/wishlist");
        return;
      }

      emitWishlistCount(result.wishlistCount);

      if (result.status === "ok") {
        setInWishlist(result.inWishlist ?? false);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? "Убрать из избранного" : "В избранное"}
      className={cn(
        "flex items-center justify-center transition-colors disabled:opacity-50",
        variant === "overlay"
          ? "size-10 rounded-full border border-border-control bg-background/80 backdrop-blur-sm"
          : "size-11 text-muted hover:text-foreground",
        className,
      )}
    >
      <Heart
        className={cn("size-4.5", inWishlist && "fill-accent text-accent-text")}
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  );
}
