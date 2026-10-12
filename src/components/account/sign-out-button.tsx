"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

/**
 * Выход из аккаунта.
 *
 * Через клиент Better Auth, а не серверным действием: клиент сам
 * сбрасывает кэш сессии в браузере, после чего обновляем маршрут,
 * чтобы серверные компоненты перерисовались уже без пользователя.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Не удалось выйти. Попробуйте ещё раз.");
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      isPending={isPending}
      className="justify-start gap-2 px-0"
    >
      <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
      Выйти
    </Button>
  );
}
