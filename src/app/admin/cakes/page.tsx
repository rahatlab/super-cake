import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus, Star } from "lucide-react";
import { getStore } from "@/lib/store";
import { formatBDT, weightLabel } from "@/lib/utils";
import { CakeRowActions } from "@/components/admin/cake-row-actions";

export const metadata: Metadata = { title: "Cakes" };

export default async function AdminCakesPage() {
  const cakes = await getStore().listCakes({ includeInactive: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">কেক ম্যানেজার</h1>
          <p className="mt-1 text-sm text-muted">
            {cakes.length} টি কেক · ছবি, ওজন-ভিত্তিক দাম ও স্টক সব এখান থেকে
          </p>
        </div>
        <Link href="/admin/cakes/new" className="btn btn-primary btn-sm">
          <Plus className="h-4 w-4" aria-hidden /> নতুন কেক
        </Link>
      </div>

      {cakes.length === 0 ? (
        <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            🎂
          </span>
          <p className="font-bold">কোনো কেক নেই</p>
          <p className="max-w-sm text-sm text-muted">
            প্রথম কেক যোগ করুন — নাম, ছবি আর ওজন অনুযায়ী দাম দিলেই সাইটে চলে যাবে।
          </p>
          <Link href="/admin/cakes/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden /> নতুন কেক
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">
                  কেক
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  দাম (½ / 1 / 2 / 3 lb)
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cakes.map((cake) => {
                const sizes = cake.sizes ?? [];
                return (
                  <tr key={cake.id} className="align-top transition-colors hover:bg-fg/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand/10">
                          {cake.image_urls[0] && (
                            <Image
                              src={cake.image_urls[0]}
                              alt={cake.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold">
                            <Link href={`/cakes/${cake.slug}`} target="_blank" className="hover:text-brand-strong hover:underline">
                              {cake.name}
                            </Link>
                            {cake.is_featured && (
                              <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-label="Featured" />
                            )}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                            <span
                              className={`badge ${
                                cake.is_active
                                  ? "bg-success/15 text-success"
                                  : "bg-line/60 text-muted"
                              }`}
                            >
                              {cake.is_active ? "চালু" : "বন্ধ"}
                            </span>
                            {cake.is_custom_available && (
                              <span className="badge bg-brand/10 text-brand-strong">Custom</span>
                            )}
                            <span className="truncate">{cake.flavor}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="badge bg-fg/6 text-muted">{cake.category}</span>
                    </td>

                    <td className="px-4 py-3">
                      {sizes.length === 0 ? (
                        <span className="font-bold">{formatBDT(cake.base_price)}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {sizes.map((s) => (
                            <span
                              key={s.id}
                              className={`badge ${
                                s.is_available
                                  ? "bg-brand/10 text-brand-strong"
                                  : "bg-line/60 text-muted line-through"
                              }`}
                              title={weightLabel(s.weight)}
                            >
                              {weightLabel(s.weight).replace(" ", "")} · {formatBDT(s.price)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {cake.stock <= 0 ? (
                        <span className="badge bg-danger/15 text-danger">Sold out</span>
                      ) : cake.stock <= 3 ? (
                        <span className="badge bg-warning/15 text-warning">{cake.stock} বাকি</span>
                      ) : (
                        <span className="font-semibold">{cake.stock}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <Link href={`/admin/cakes/${cake.id}/edit`} className="btn btn-soft btn-sm">
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Link>
                        <CakeRowActions
                          cakeId={cake.id}
                          cakeName={cake.name}
                          isActive={cake.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
