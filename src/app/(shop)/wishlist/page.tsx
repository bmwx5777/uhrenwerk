import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { WishlistLineCard } from "@/components/wishlist/wishlist-line-card";
import { getCurrentUser } from "@/server/auth/session";
import { getWishlistLines } from "@/server/services/wishlist";

export const metadata: Metadata = {
  title: "Избранное",
  robots: { index: false },
};

export default async function WishlistPage() {
  const user = await getCurrentUser();

  // Избранное привязано к аккаунту: иначе список терялся бы при смене
  // устройства. Гостя не редиректим, а объясняем и предлагаем войти.
  if (!user) {
    return (
      <div className="container-page py-10 md:py-16">
        <p className="eyebrow">Ваш список</p>
        <h1 className="mt-4 font-display text-headline font-medium">Избранное</h1>

        <EmptyState
          className="mt-12"
          icon={Heart}
          title="Войдите, чтобы сохранять модели"
          description="Избранное привязано к аккаунту — список будет доступен на любом устройстве и не потеряется."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/sign-in?next=/wishlist">Войти</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/sign-up">Создать аккаунт</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const lines = await getWishlistLines(user.id);

  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow">Ваш список</p>
      <h1 className="mt-4 font-display text-headline font-medium">Избранное</h1>

      {lines.length > 0 ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {lines.map((line) => (
            <WishlistLineCard key={line.itemId} line={line} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-12"
          icon={Heart}
          title="В избранном пока ничего нет"
          description="Нажмите на сердце в карточке товара, чтобы сохранить модель и вернуться к ней позже."
          action={
            <Button asChild>
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
