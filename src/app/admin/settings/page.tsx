import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Database, KeyRound, MessageCircle } from "lucide-react";
import { getStore, isSupabaseConfigured } from "@/lib/store";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getStore().getSettings();
  const production = isSupabaseConfigured();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">সেটিংস</h1>
        <p className="mt-1 text-sm text-muted">
          দোকানের তথ্য, ডেলিভারি চার্জ, পেমেন্ট ও সোশ্যাল লিংক — সব এক জায়গায়
        </p>
      </div>

      <SettingsForm settings={settings} />

      {/* ---------------- system status ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                production
                  ? "bg-success/15 text-success"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              <Database className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">
                ডেটাবেজ: {production ? "Supabase (Production)" : "Local JSON (Demo)"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {production
                  ? "Supabase-এ ডেটা সেভ হচ্ছে — সব ডিভাইস থেকে একই ডেটা দেখা যাবে।"
                  : "এখন ডেমো মোডে চলছে — ডেটা .data/db.json ফাইলে সেভ হচ্ছে। প্রোডাকশনে যেতে Supabase URL ও Service Role Key সেট করুন।"}
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">WhatsApp Cloud API</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                অটো-মেসেজের টোকেন <code className="rounded bg-fg/10 px-1">.env.local</code> এ থাকে
                (ডেটাবেজে নয়)। টোকেন মেয়াদোত্তীর্ণ হলে কাস্টমারকে পাঠানো বন্ধ হবে, কিন্তু wa.me
                বাটন সবসময় কাজ করবে।
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-extrabold">প্রোডাকশনে যাওয়ার আগে</h2>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              {!production && (
                <li className="flex items-start gap-1.5">
                  <KeyRound className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  ডিফল্ট অ্যাডমিন পাসওয়ার্ড (<code className="rounded bg-fg/10 px-1">admin1234</code>)
                  অবশ্যই বদলান —{" "}
                  <Link href="/account" className="font-semibold text-brand-strong underline">
                    /account
                  </Link>{" "}
                  পেজ থেকে।
                </li>
              )}
              <li className="flex items-start gap-1.5">
                <KeyRound className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                WhatsApp access token rotate করুন — পুরোনো টোকেন চ্যাটে শেয়ার হয়েছে।
              </li>
              <li className="flex items-start gap-1.5">
                <KeyRound className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                bKash নম্বর ও ডেলিভারি চার্জ আসল তথ্য দিয়ে আপডেট করুন।
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
