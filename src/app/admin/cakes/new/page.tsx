import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CakeForm } from "@/components/admin/cake-form";

export const metadata: Metadata = { title: "New Cake" };

export default function NewCakePage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/cakes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> কেক লিস্ট
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">নতুন কেক যোগ করুন</h1>
        <p className="mt-1 text-sm text-muted">
          ছবি আপলোড করুন, ওজন অনুযায়ী দাম দিন — সেভ করলেই সাইটে দেখা যাবে
        </p>
      </div>

      <CakeForm />
    </div>
  );
}
