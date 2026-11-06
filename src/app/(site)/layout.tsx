import { getCachedSettings } from "@/lib/store/cache";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartReminder } from "@/components/cart/cart-reminder";
import { organizationLd, ldJson, websiteLd } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // No `cookies()` here on purpose: the session probe lives in /api/me and the
  // header fetches it client-side. Anything request-scoped in this layout would
  // opt the whole (site) group out of static rendering.
  const settings = await getCachedSettings();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(organizationLd(settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(websiteLd(settings)) }}
      />

      <Header />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <CartDrawer />
      <CartReminder whatsappPhone={settings.whatsapp_phone} />
    </>
  );
}
