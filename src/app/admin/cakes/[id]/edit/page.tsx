import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStore } from "@/lib/store";
import { CakeForm } from "@/components/admin/cake-form";

export const metadata: Metadata = { title: "Edit Cake" };

export default async function EditCakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cake = await getStore().getCakeById(id);
  if (!cake) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/cakes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> কেক লিস্ট
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">এডিট — {cake.name}</h1>
        <p className="mt-1 text-sm text-muted">তথ্য বদলে সেভ করুন — সাইটে সাথে সাথে আপডেট হবে</p>
      </div>

      <CakeForm cake={cake} />
    </div>
  );
}
