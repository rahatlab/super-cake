import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { BannerManager } from "@/components/admin/banner-manager";

export const metadata: Metadata = { title: "Banner" };

export default async function AdminBannersPage() {
  const banners = await getStore().listBanners();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">ব্যানার ও অফার</h1>
        <p className="mt-1 text-sm text-muted">
          হোমপেজের উপরে অফার ব্যানার — কাউন্টডাউন ও CTA বাটনসহ
        </p>
      </div>

      <BannerManager banners={banners} />
    </div>
  );
}
