import { getStore } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartReminder } from "@/components/cart/cart-reminder";
import { organizationLd, ldJson, websiteLd } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const store = getStore();
  const [settings, user] = await Promise.all([store.getSettings(), getCurrentUser()]);

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

      <Header user={user ? { name: user.name, role: user.role } : null} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <CartDrawer />
      <CartReminder whatsappPhone={settings.whatsapp_phone} />
    </>
  );
}
