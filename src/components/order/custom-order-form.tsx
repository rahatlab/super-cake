"use client";

import Image from "next/image";
import { useMemo, useState, useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Percent, Send, Upload } from "lucide-react";
import type { Settings } from "@/lib/types";
import { DELIVERY_SLOTS } from "@/lib/constants";
import { REFERRAL_MAX_DISCOUNT, REFERRAL_PERCENT } from "@/lib/pricing";
import { formatBDT, weightLabel } from "@/lib/utils";
import {
  getCartLeadTokenAction,
  placeOrderAction,
  validatePromoAction,
  type PlaceOrderState,
} from "@/lib/actions/order";

interface CakeLike {
  id: string;
  name: string;
  base_price: number;
  image: string;
  sizes: { weight: number; price: number; is_available: boolean }[];
}

const initialState: PlaceOrderState = {};

export function CustomOrderForm({
  settings,
  cake,
  idempotencyKey,
  minDeliveryDate,
  defaultDeliveryDate,
}: {
  settings: Settings;
  cake: CakeLike;
  idempotencyKey: string;
  minDeliveryDate: string;
  defaultDeliveryDate: string;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialState);

  const sizes = useMemo(() => {
    const list = (cake.sizes ?? []).filter((s) => s.is_available);
    if (list.length) return list;
    // No size rows: the server charges base_price for any weight, so show one
    // option with the real price instead of inventing a price ladder.
    return [{ weight: 1, price: cake.base_price, is_available: true }];
  }, [cake]);

  const [weight, setWeight] = useState(sizes.find((s) => s.weight === 1)?.weight ?? sizes[0].weight);
  const [message, setMessage] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
  const [budget, setBudget] = useState<number | null>(null);
  const [payment, setPayment] = useState<"cod" | "bkash">(
    settings.cod_enabled ? "cod" : "bkash",
  );
  const [reminderOptIn, setReminderOptIn] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ ok: boolean; discount: number; msg: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const selected = sizes.find((s) => Math.abs(s.weight - weight) < 0.01) ?? sizes[0];
  const subtotal = selected.price;

  const totals = useMemo(() => {
    const discount = promo?.ok ? promo.discount : 0;
    const afterPromo = Math.max(0, subtotal - discount);
    const delivery = !settings.free_delivery_enabled
      ? settings.delivery_charge
      : settings.free_delivery_min <= 0
        ? 0
        : afterPromo >= settings.free_delivery_min
          ? 0
          : settings.delivery_charge;
    return { discount, delivery, total: afterPromo + delivery };
  }, [subtotal, promo, settings]);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const res = await validatePromoAction(promoInput.trim(), subtotal);
      setPromo({
        ok: res.ok,
        discount: res.discount,
        msg: res.ok ? `✅ ৳${res.discount} ছাড় পেয়েছেন!` : `❌ ${res.reason}`,
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const item = {
    cake_id: cake.id,
    name: `${cake.name} — Custom Design`,
    slug: cake.id,
    image: cake.image,
    weight,
    unit_price: subtotal,
    quantity: 1,
  };

  const saveLead = async (optedIn = reminderOptIn) => {
    if (!optedIn) return;
    const phone = (document.getElementById("phone") as HTMLInputElement | null)?.value ?? "";
    const name = (document.getElementById("customer_name") as HTMLInputElement | null)?.value ?? "";
    if (phone.replace(/\D/g, "").length < 10) return;

    try {
      const issued = await getCartLeadTokenAction(phone);
      if (!issued.token) return;
      await fetch("/api/whatsapp/cart-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: issued.token,
          customer_name: name,
          items: [item],
          subtotal,
          opted_in: true,
        }),
      });
    } catch {
      // Best effort only — never block checkout.
    }
  };

  return (
    <form action={formAction} className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
      <input type="hidden" name="occasion" value="others" />
      <input type="hidden" name="items" value={JSON.stringify([item])} />
      <input
        type="hidden"
        name="custom_spec"
        value={JSON.stringify({
          message_on_cake: message || undefined,
          design_notes: designNotes || undefined,
          reference_image: refUrl || undefined,
          budget: budget ?? undefined,
        })}
      />
      <input type="hidden" name="promo_code" value={promo?.ok ? promoInput.trim().toUpperCase() : ""} />
      <input type="hidden" name="referral_code" value="" />
      <input type="hidden" name="payment_method" value={payment} />
      <input type="hidden" name="subtotal" value={subtotal} />
      <input type="hidden" name="discount_amount" value={totals.discount} />
      <input type="hidden" name="referral_discount" value={0} />
      <input type="hidden" name="delivery_charge" value={totals.delivery} />
      <input type="hidden" name="total" value={totals.total} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />

      {/* ---------------- left: design + info ---------------- */}
      <div className="space-y-5">
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </motion.div>
        )}

        <section className="card space-y-5 p-6">
          <div>
            <h2 className="text-xl font-extrabold">১. ডিজাইন নির্বাচন 🎨</h2>
            <p className="mt-1 text-sm text-muted">যতটুকু জানেন সত্যি করে লিখুন — বাকিটা আমরা করব</p>
          </div>

          <div>
            <span className="label">ওজন</span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s.weight}
                  type="button"
                  onClick={() => setWeight(s.weight)}
                  data-active={Math.abs(s.weight - weight) < 0.01}
                  className="chip"
                >
                  {weightLabel(s.weight)}
                  <span className="text-[11px] font-semibold text-muted">{formatBDT(s.price)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="msg">কেকের উপরের লেখা</label>
            <input
              id="msg"
              name="msg"
              maxLength={40}
              className="field"
              placeholder="যেমন: Happy Engagement Nusrat & Tanvir"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="mt-3 rounded-xl border border-dashed border-brand/40 bg-brand/6 p-4 text-center">
              <Image
                src={cake?.image ?? "/cakes/custom-placeholder.svg"}
                alt="Live preview"
                width={80}
                height={80}
                className="mx-auto rounded-lg"
              />
              <AnimatePresence mode="wait">
                <motion.p
                  key={message || "empty"}
                  initial={{ opacity: 0, y: 6, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(5px)" }}
                  transition={{ duration: 0.25 }}
                  className="mt-2 font-display text-lg font-extrabold text-brand-strong"
                >
                  {message || "✎ লেখাটি এখানে live দেখতে পাবেন"}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="design_notes">ডিজাইন / theme বর্ণনা *</label>
            <textarea
              id="design_notes"
              className="field min-h-28"
              maxLength={500}
              required
              placeholder="রঙ, theme, character, কত জনের জন্য, কোন ধরনের decoration — যেমন: নীল dinosaur theme, ট্রেইন shape, ২০ জনের জন্য"
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ref_url">Reference image URL (ঐচ্ছিক)</label>
              <input
                id="ref_url"
                name="ref_url"
                type="url"
                className="field"
                placeholder="https://…"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted">
                ছবি থাকলে URL দিন, না থাকলে পরে WhatsApp এ পাঠাতে পারেন
              </p>
            </div>
            <div>
              <label className="label" htmlFor="budget">Budget (ঐচ্ছিক)</label>
              <input
                id="budget"
                type="number"
                min={0}
                step={100}
                className="field"
                placeholder="যেমন: 2500"
                value={budget ?? ""}
                onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-accent/10 px-4 py-3 text-xs text-muted">
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              নিজের ছবি/ডিজাইন পাঠাতে চাইলে অর্ডারের পর WhatsApp এ পাঠান — আমরা সেটা মেনেই বানাবো।
            </p>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl font-extrabold">২. আপনার তথ্য ও ডেলিভারি 🚚</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customer_name">নাম *</label>
              <input
                id="customer_name"
                name="customer_name"
                required
                minLength={2}
                className="field"
                onBlur={() => void saveLead()}
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">ফোন *</label>
              <input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                className="field"
                placeholder="01XXXXXXXXX"
                onBlur={() => void saveLead()}
              />
            </div>
            <div>
              <label className="label" htmlFor="email">ইমেইল (ঐচ্ছিক)</label>
              <input id="email" name="email" type="email" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="delivery_date">ডেলিভারি তারিখ *</label>
              <input
                id="delivery_date"
                name="delivery_date"
                type="date"
                required
                min={minDeliveryDate}
                className="field"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={reminderOptIn}
              onChange={(e) => {
                setReminderOptIn(e.target.checked);
                void saveLead(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
            />
            <span className="text-xs text-muted">
              <span className="font-semibold text-fg">
                WhatsApp এ অর্ডার রিমাইন্ডার ও অফার পেতে চাই
              </span>
              <br />
              চেক না করলেও অর্ডার সম্পন্ন হবে। যেকোনো সময় STOP লিখে বন্ধ করতে পারবেন।
            </span>
          </label>

          <div>
            <span className="label">সময়</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DELIVERY_SLOTS.map((s, i) => (
                <label
                  key={s.value}
                  className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-xs font-semibold transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                >
                  <input type="radio" name="delivery_slot" value={s.value} defaultChecked={i === 2} className="sr-only" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">সম্পূর্ণ ঠিকানা *</label>
            <textarea id="address" name="address" required minLength={5} className="field min-h-20" />
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl font-extrabold">৩. পেমেন্ট 💳</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {settings.cod_enabled && (
              <label
                className="cursor-pointer rounded-2xl border-2 bg-surface p-4"
                style={{
                  borderColor: payment === "cod" ? "hsl(var(--brand))" : "hsl(var(--border))",
                  background: payment === "cod" ? "hsl(var(--brand) / 0.08)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="payment_ui"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                  className="sr-only"
                />
                <span className="text-xl">💵</span>
                <p className="mt-1.5 text-sm font-extrabold">Cash on Delivery</p>
              </label>
            )}

            {settings.bkash_enabled && (
              <label
                className="cursor-pointer rounded-2xl border-2 bg-surface p-4"
                style={{
                  borderColor: payment === "bkash" ? "hsl(var(--brand))" : "hsl(var(--border))",
                  background: payment === "bkash" ? "hsl(var(--brand) / 0.08)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="payment_ui"
                  checked={payment === "bkash"}
                  onChange={() => setPayment("bkash")}
                  className="sr-only"
                />
                <span className="text-xl">📱</span>
                <p className="mt-1.5 text-sm font-extrabold">bKash (Send Money)</p>
              </label>
            )}
          </div>

          {!settings.cod_enabled && !settings.bkash_enabled && (
            <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              পেমেন্ট অপশন এখন বন্ধ আছে। অনুগ্রহ করে WhatsApp এ যোগাযোগ করুন।
            </p>
          )}

          <AnimatePresence>
            {payment === "bkash" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-xl border border-brand/35 bg-brand/6 p-4 text-sm">
                  <ol className="list-decimal space-y-1 pl-5 text-[13px]">
                    <li>
                      <strong>Send Money</strong> করুন:{" "}
                      <span className="font-extrabold text-brand-strong">{settings.bkash_number}</span>
                    </li>
                    <li>TrxID কপি করে নিচে বসান</li>
                  </ol>
                  <div>
                    <label className="label" htmlFor="bkash_trx_id">TrxID *</label>
                    <input id="bkash_trx_id" name="bkash_trx_id" required maxLength={40} className="field" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="label" htmlFor="promo">Promo Code (ঐচ্ছিক)</label>
            <div className="flex gap-2">
              <input
                id="promo"
                className="field uppercase"
                placeholder="WELCOME10"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
              />
              <button type="button" onClick={applyPromo} disabled={promoLoading} className="btn btn-soft">
                {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
                Apply
              </button>
            </div>
            <AnimatePresence>
              {promo && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-2 text-xs font-semibold ${promo.ok ? "text-success" : "text-danger"}`}
                >
                  {promo.msg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={pending || (!settings.cod_enabled && !settings.bkash_enabled)}
            className="btn btn-primary btn-lg btn-block"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> অর্ডার পাঠানো হচ্ছে…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Custom Cake অর্ডার করুন
              </>
            )}
          </button>
        </section>
      </div>

      {/* ---------------- right: live summary ---------------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="relative aspect-square bg-brand/8">
            <Image
              src={cake?.image ?? "/cakes/custom-placeholder.svg"}
              alt="Custom cake preview"
              fill
              sizes="(max-width:1024px) 100vw, 400px"
              className="object-cover"
            />
            <div className="absolute inset-x-4 bottom-6 rounded-xl bg-black/45 px-3 py-2 text-center backdrop-blur-sm">
              <p className="font-display text-base font-extrabold text-white">
                {message || "আপনার লেখা এখানে আসবে"}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Design</span>
              <span className="font-semibold">Custom · {weightLabel(weight)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold">{formatBDT(subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Promo</span>
                <span className="font-semibold text-success">− {formatBDT(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Delivery</span>
              <span className="font-semibold">
                {totals.delivery === 0 ? "ফ্রি 🎉" : formatBDT(totals.delivery)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-extrabold">Grand Total</span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={totals.total}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  className="font-display text-2xl font-extrabold text-brand-strong"
                >
                  {formatBDT(totals.total)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Custom cake এ ২ দিন আগে অর্ডার করলে ডিজাইন confirm করতে সুবিধা হয়। বাজেট অনুযায়ী আমরা
            দাম ঠিক করে WhatsApp এ জানাবো।
          </p>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          Referral কোড থাকলে checkout এ বসান — {REFERRAL_PERCENT}% পর্যন্ত{" "}
          {formatBDT(REFERRAL_MAX_DISCOUNT)} ছাড়
        </p>
      </aside>
    </form>
  );
}
