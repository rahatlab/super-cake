import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { nowMs } from "@/lib/utils";
import { PromoManager } from "@/components/admin/promo-manager";

export const metadata: Metadata = { title: "Promos" };

export default async function AdminPromosPage() {
  const promos = await getStore().listPromos();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Promo কোড</h1>
        <p className="mt-1 text-sm text-muted">
          শতাংশ ছাড়, সর্বনিম্ন অর্ডার, মেয়াদ ও ব্যবহারের সীমা — সব এখান থেকে নিয়ন্ত্রণ করুন
        </p>
      </div>

      <PromoManager promos={promos} now={nowMs()} />
    </div>
  );
}
