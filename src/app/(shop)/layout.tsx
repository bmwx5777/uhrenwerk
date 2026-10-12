import { SiteFooter } from "@/components/layout/site-footer";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Layout витрины: общая шапка и подвал для всех публичных страниц.
 * Checkout получит отдельный layout без отвлекающей навигации (этап 7).
 */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipToContent />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
