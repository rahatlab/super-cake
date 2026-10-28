"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Save, Trash2 } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteBannerAction, saveBannerAction, type ActionState } from "@/lib/actions/admin";

const initial: ActionState = {};

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const current = banners[0] ?? null;
  const [state, formAction, pending] = useActionState(saveBannerAction, initial);
  const [rowMsg, setRowMsg] = useState<string | null>(null);
  const [rowPending, startRow] = useTransition();

  function remove(b: Banner) {
    if (!window.confirm(`"${b.title}" ব্যানারটি মুছে ফেলতে চান?`)) return;
    startRow(async () => {
      const res = await deleteBannerAction(b.id);
      setRowMsg(res.error ? `⚠️ ${res.error}` : (res.success ?? null));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* ------------- editor ------------- */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand-strong">
            <Megaphone className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-extrabold">হোমপেজ অফার ব্যানার</h2>
            <p className="text-[11px] text-muted">একটাই ব্যানার সাইটের উপরে দেখাবে</p>
          </div>
        </div>

        {state.error && (
          <p role="alert" className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
            ⚠️ {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="mb-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            ✅ {state.success}
          </p>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="banner-title" className="label">
              টাইটেল *
            </label>
            <input
              id="banner-title"
              name="title"
              required
              maxLength={120}
              defaultValue={current?.title ?? "🎉 ঈদ স্পেশাল — সব কেকে ২০% ছাড়!"}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="banner-subtitle" className="label">
              সাবটাইটেল
            </label>
            <input
              id="banner-subtitle"
              name="subtitle"
              maxLength={200}
              defaultValue={current?.subtitle ?? "সীমিত সময়ের অফার — অর্ডার করুন আজই"}
              className="field"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="banner-cta-text" className="label">
                বাটন টেক্সট
              </label>
              <input
                id="banner-cta-text"
                name="cta_text"
                maxLength={40}
                defaultValue={current?.cta_text ?? "কেক দেখুন"}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="banner-cta-link" className="label">
                বাটন লিংক
              </label>
              <input
                id="banner-cta-link"
                name="cta_link"
                maxLength={200}
                defaultValue={current?.cta_link ?? "/cakes"}
                className="field"
                placeholder="/cakes অথবা https://…"
              />
            </div>
          </div>

          <div>
            <label htmlFor="banner-ends" className="label">
              কাউন্টডাউন শেষ (ঐচ্ছিক)
            </label>
            <input
              id="banner-ends"
              name="ends_at"
              type="datetime-local"
              defaultValue={toLocalInput(current?.ends_at)}
              className="field"
            />
            <p className="mt-1 text-[11px] text-muted">খালি রাখলে কাউন্টডাউন দেখাবে না</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={current ? current.is_active : true}
              className="h-4 w-4 accent-[hsl(var(--brand))]"
            />
            <span className="text-sm font-semibold">ব্যানারটি চালু রাখুন</span>
          </label>

          <button type="submit" disabled={pending} className="btn btn-primary btn-block">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {current ? "ব্যানার আপডেট করুন" : "ব্যানার তৈরি করুন"}
          </button>
        </form>
      </section>

      {/* ------------- preview + list ------------- */}
      <div className="space-y-4">
        {current && (
          <section className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">প্রিভিউ</p>
            <div className="rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/15 via-accent/12 to-brand/15 px-4 py-3">
              <p className="text-sm font-extrabold">{current.title}</p>
              {current.subtitle && <p className="mt-0.5 text-xs text-muted">{current.subtitle}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "badge",
                    current.is_active ? "bg-success/15 text-success" : "bg-line/60 text-muted",
                  )}
                >
                  {current.is_active ? "চালু" : "বন্ধ"}
                </span>
                {current.ends_at && (
                  <span className="text-[11px] text-muted">শেষ: {formatDateTime(current.ends_at)}</span>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted">
            সব ব্যানার ({banners.length})
          </h2>

          {rowMsg && (
            <p role="status" className="border-b border-line px-4 py-2 text-xs font-semibold text-muted">
              {rowMsg}
            </p>
          )}

          {banners.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">এখনো কোনো ব্যানার নেই</p>
          ) : (
            <ul className="divide-y divide-line">
              {banners.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{b.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                      <span
                        className={cn(
                          "badge",
                          b.is_active ? "bg-success/15 text-success" : "bg-line/60 text-muted",
                        )}
                      >
                        {b.is_active ? "চালু" : "বন্ধ"}
                      </span>
                      {b.ends_at ? formatDateTime(b.ends_at) : "কাউন্টডাউন নেই"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    disabled={rowPending}
                    className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
                    aria-label={`${b.title} মুছে ফেলুন`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
