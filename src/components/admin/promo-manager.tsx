"use client";

import { useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Add01, Cancel01, Delete02, Loading01, Pencil } from "@animateicons/react/huge";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import type { PromoCode } from "@/lib/types";
import { cn, formatBDT, formatDate } from "@/lib/utils";
import {
  deletePromoAction,
  savePromoAction,
  type ActionState,
} from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";
import { AnimIcon } from "@/components/ui/anim-icon";

const initial: ActionState = {};

export function PromoManager({ promos, now }: { promos: PromoCode[]; now: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [rowMsg, setRowMsg] = useState<string | null>(null);
  const [rowPending, startRow] = useTransition();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await savePromoAction(prev, fd);
      if (result.success) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    initial,
  );
  // AnimateIcons refs for promo manager icons
  const cancelIcon = useAnimIcon();
  const saveIcon = useAnimIcon();
  const editIcon = useAnimIcon();
  const trashIcon = useAnimIcon();

  function startEdit(p: PromoCode) {
    setEditing(p);
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function remove(p: PromoCode) {
    const ok = await confirmDialog({
      title: `${p.code} কোডটি মুছে ফেলবেন?`,
      text: "এই কোডে আগের অর্ডারগুলো অক্ষত থাকবে।",
      confirmText: "মুছে ফেলুন",
    });
    if (!ok) return;
    startRow(async () => {
      const toastId = toast.loading("প্রোমো কোড মুছে ফেলা হচ্ছে...");
      const res = await deletePromoAction(p.id);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
        setRowMsg(`⚠️ ${res.error}`);
      } else {
        toast.update(toastId, {
          render: res.success ?? "প্রোমো কোড মুছে ফেলা হয়েছে",
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
        setRowMsg(res.success ?? null);
      }
      router.refresh();
    });
  }

  function toggle(p: PromoCode) {
    startRow(async () => {
      const toastId = toast.loading(p.is_active ? "প্রোমো কোড বন্ধ করা হচ্ছে..." : "প্রোমো কোড চালু করা হচ্ছে...");
      const fd = new FormData();
      fd.set("id", p.id);
      fd.set("code", p.code);
      fd.set("percent", String(p.percent));
      fd.set("min_order", String(p.min_order));
      fd.set("max_discount", String(p.max_discount));
      fd.set("usage_limit", String(p.usage_limit));
      fd.set("expires_at", p.expires_at ?? "");
      if (!p.is_active) fd.set("is_active", "on");
      const res = await savePromoAction({}, fd);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
        setRowMsg(`⚠️ ${res.error}`);
      } else {
        toast.update(toastId, {
          render: res.success ?? (p.is_active ? "প্রোমো কোড বন্ধ হয়েছে" : "প্রোমো কোড চালু হয়েছে"),
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
        setRowMsg(res.success ?? null);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      {/* ---------------- form ---------------- */}
      <section className="card h-fit p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-extrabold">
            {editing ? `${editing.code} এডিট` : "নতুন promo কোড"}
          </h2>
          {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormKey((k) => k + 1);
                }}
                className="btn btn-ghost btn-sm !px-2.5"
                aria-label="এডিট বাতিল করুন"
                onMouseEnter={() => cancelIcon.current?.startAnimation()}
                onMouseLeave={() => cancelIcon.current?.stopAnimation()}
              >
                <Cancel01 ref={cancelIcon} className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        {state.error && (
          <p role="alert" className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
            <AnimIcon name="alert" className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        {state.success && !editing && (
          <p role="status" className="mb-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            <AnimIcon name="check" className="h-4 w-4 shrink-0" /> {state.success}
          </p>
        )}

        <form key={formKey} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          <div>
            <label htmlFor="promo-code" className="label">
              কোড *
            </label>
            <input
              id="promo-code"
              name="code"
              required
              minLength={3}
              maxLength={24}
              defaultValue={editing?.code ?? ""}
              className="field uppercase"
              placeholder="যেমন: EID20"
            />
            <p className="mt-1 text-[11px] text-muted">কাস্টমার এই কোড checkout এ বসাবে</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="promo-percent" className="label">
                ছাড় (%) *
              </label>
              <input
                id="promo-percent"
                name="percent"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={editing?.percent ?? 10}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="promo-min" className="label">
                সর্বনিম্ন অর্ডার (৳)
              </label>
              <input
                id="promo-min"
                name="min_order"
                type="number"
                min={0}
                defaultValue={editing?.min_order ?? 0}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="promo-max" className="label">
                সর্বোচ্চ ছাড় (৳)
              </label>
              <input
                id="promo-max"
                name="max_discount"
                type="number"
                min={0}
                defaultValue={editing?.max_discount ?? 0}
                className="field"
              />
              <p className="mt-1 text-[11px] text-muted">খালি রাখুন / 0 = সীমা নেই — 10% হলে পুরো 10% ছাড় পাবে</p>
            </div>
            <div>
              <label htmlFor="promo-limit" className="label">
                ব্যবহারের সীমা *
              </label>
              <input
                id="promo-limit"
                name="usage_limit"
                type="number"
                min={1}
                required
                defaultValue={editing?.usage_limit ?? 100}
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="promo-expiry" className="label">
              মেয়াদ শেষ (ঐচ্ছিক)
            </label>
            <input
              id="promo-expiry"
              name="expires_at"
              type="date"
              defaultValue={editing?.expires_at ? editing.expires_at.slice(0, 10) : ""}
              className="field"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editing ? editing.is_active : true}
              className="h-4 w-4 accent-[hsl(var(--brand))]"
            />
            <span className="text-sm font-semibold">কোডটি চালু থাকবে</span>
          </label>

          <button type="submit" disabled={pending} className="btn btn-primary btn-block" onMouseEnter={() => saveIcon.current?.startAnimation()} onMouseLeave={() => saveIcon.current?.stopAnimation()}>
            {pending ? (
              <Loading01 ref={saveIcon} className="h-4 w-4 animate-spin" aria-hidden />
            ) : editing ? (
              <Pencil ref={saveIcon} className="h-4 w-4" aria-hidden />
            ) : (
              <Add01 ref={saveIcon} className="h-4 w-4" aria-hidden />
            )}
            {editing ? "আপডেট করুন" : "কোড তৈরি করুন"}
          </button>
        </form>
      </section>

      {/* ---------------- list ---------------- */}
      <section className="space-y-3">
        {rowMsg && (
          <p role="status" className="rounded-xl bg-fg/5 px-3 py-2 text-sm font-semibold text-muted">
            {rowMsg}
          </p>
        )}

        {promos.length === 0 ? (
          <div className="card grid place-items-center gap-2 py-16 text-center">
            <AnimIcon name="tag" className="h-10 w-10" aria-hidden />
            <p className="font-bold">কোনো promo কোড নেই</p>
            <p className="text-sm text-muted">বাঁ দিকের ফর্ম থেকে প্রথম কোড তৈরি করুন</p>
          </div>
        ) : (
          promos.map((p) => {
            const usedPct = p.usage_limit > 0 ? Math.min(100, (p.used_count / p.usage_limit) * 100) : 0;
            const expired = p.expires_at ? new Date(p.expires_at).getTime() < now : false;
            return (
              <article key={p.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2">
                      <span className="font-display text-lg font-extrabold tracking-wide">{p.code}</span>
                      <span
                        className={cn(
                          "badge",
                          p.is_active && !expired
                            ? "bg-success/15 text-success"
                            : "bg-line/60 text-muted",
                        )}
                      >
                        {expired ? "মেয়াদ শেষ" : p.is_active ? "চালু" : "বন্ধ"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      <strong className="text-fg">{p.percent}% ছাড়</strong>
                      {p.min_order > 0 ? ` · ন্যূনতম ${formatBDT(p.min_order)}` : ""}
                      {p.max_discount > 0 ? ` · সর্বোচ্চ ${formatBDT(p.max_discount)}` : ""}
                      {p.expires_at ? ` · শেষ ${formatDate(p.expires_at)}` : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      disabled={rowPending}
                      className="btn btn-ghost btn-sm"
                      aria-label={`${p.code} ${p.is_active ? "বন্ধ" : "চালু"} করুন`}
                    >
                      {p.is_active ? "বন্ধ" : "চালু"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="btn btn-soft btn-sm"
                      aria-label={`${p.code} এডিট করুন`}
                      onMouseEnter={() => editIcon.current?.startAnimation()}
                      onMouseLeave={() => editIcon.current?.stopAnimation()}
                    >
                      <Pencil ref={editIcon} className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={rowPending}
                      className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
                      aria-label={`${p.code} মুছে ফেলুন`}
                      onMouseEnter={() => trashIcon.current?.startAnimation()}
                      onMouseLeave={() => trashIcon.current?.stopAnimation()}
                    >
                      <Delete02 ref={trashIcon} className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                    <span>ব্যবহার</span>
                    <span>
                      {p.used_count} / {p.usage_limit || "∞"}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/60">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        usedPct >= 90 ? "bg-danger" : usedPct >= 60 ? "bg-warning" : "bg-brand",
                      )}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
