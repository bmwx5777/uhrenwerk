import Link from "next/link";

/** Layout авторизации: без навигации — ничто не отвлекает от формы. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center md:h-20">
        <Link
          href="/"
          className="font-display text-base font-medium tracking-[0.14em] uppercase"
        >
          Uhrenwerk
        </Link>
      </header>
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
