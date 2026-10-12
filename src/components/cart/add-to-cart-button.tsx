"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { emitCartCount } from "@/lib/client-events";
import { addToCartAction } from "@/server/actions/cart";

type AddToCartButtonProps = {
  productId: string;
  /** Для pre-owned: конкретный экземпляр. Без него такой товар не добавить. */
  productUnitId?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Кнопка «в корзину».
 *
 * Клиент отправляет только идентификаторы — цену сервер читает из базы.
 * После успеха кнопка на пару секунд показывает подтверждение: это
 * понятнее, чем один исчезающий toast.
 */
export function AddToCartButton({
  productId,
  productUnitId,
  disabled = false,
  className,
  size = "lg",
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await addToCartAction({
        productId,
        ...(productUnitId ? { productUnitId } : {}),
      });

      emitCartCount(result.cartCount);

      if (result.status === "ok") {
        toast.success(result.message);
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 2500);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button
      size={size}
      className={className}
      disabled={disabled}
      isPending={isPending}
      onClick={handleClick}
    >
      {justAdded ? (
        <>
          <Check className="size-4" aria-hidden />
          Добавлено
        </>
      ) : (
        <>
          <ShoppingBag className="size-4" aria-hidden />В корзину
        </>
      )}
    </Button>
  );
}
