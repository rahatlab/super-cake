import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const metadata: Metadata = { title: "Category & Flavour" };

export default async function AdminCatalogPage() {
  const store = getStore();
  const [categories, flavours, cakes] = await Promise.all([
    store.listCategories(),
    store.listFlavours(),
    store.listCakes({ includeInactive: true }),
  ]);
  const usage = (key: "category" | "flavor") => {
    const map: Record<string, number> = {};
    for (const c of cakes) map[c[key]] = (map[c[key]] ?? 0) + 1;
    return map;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Category & Flavour</h1>
        <p className="mt-1 text-sm text-muted">
          কেক ফর্ম ও ক্যাটালগ ফিল্টারে এই তালিকা ব্যবহার হয় — নতুন নাম যোগ, নাম বদলানো বা মোছা সব এখান থেকে।
        </p>
      </div>
      <CatalogManager
        categories={categories}
        flavours={flavours}
        categoryUsage={usage("category")}
        flavourUsage={usage("flavor")}
      />
    </div>
  );
}
