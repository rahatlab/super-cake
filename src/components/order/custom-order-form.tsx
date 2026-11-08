"use client";

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
import { CAKE_FONTS, CAKE_TEXT_COLORS, DEFAULT_CAKE_FONT } from "@/lib/cake-fonts";
import {
  CROWNS,
  FINISHES,
  SYRUPS,
  crownLabel,
  finishForColor,
  finishNameFor,
  getCrownPrice,
  getSyrupPrice,
  getTierFeeValue,
  syrupLabel,
  tierExtraFee,
  type SyrupId,
} from "@/lib/custom-design";
import dynamic from "next/dynamic";
import { OrderLoadingOverlay } from "@/components/order/order-loading-overlay";
import { CreditCardIcon, PhoneIcon, Wallet01Icon } from "@animateicons/react/huge";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

// Three.js cannot render on the server — load the canvas client-side only.
const Cake3DPreview = dynamic(
  () => import("./cake-3d-preview").then((m) => m.Cake3DPreview),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] w-full place-items-center bg-[radial-gradient(circle_at_50%_32%,#3b2a1c_0%,#1b130d_52%,#0b0806_100%)]">
        <div className="skeleton h-40 w-40 rounded-2xl" />
      </div>
    ),
  },
);

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
  paystationEnabled,
}: {
  settings: Settings;
  cake: CakeLike;
  idempotencyKey: string;
  minDeliveryDate: string;
  defaultDeliveryDate: string;
  paystationEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialState);

  const sizes = useMemo(() => {
    const list = (cake.sizes ?? []).filter((s) => s.is_available);
    if (list.length) return list;
    return [{ weight: 1, price: cake.base_price, is_available: true }];
  }, [cake]);

  const [weight, setWeight] = useState(sizes.find((s) => s.weight === 1)?.weight ?? sizes[0].weight);
  const [message, setMessage] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
  const [budget, setBudget] = useState<number | null>(null);
  const [payment, setPayment] = useState<"cod" | "bkash" | "paystation">(
    settings.cod_enabled ? "cod" : settings.bkash_enabled ? "bkash" : "paystation",
  );
  // Payment tiles play their icon while the tile itself is hovered.
  const codIcon = useAnimIcon();
  const bkashIcon = useAnimIcon();
  const paystationIcon = useAnimIcon();
  const [reminderOptIn, setReminderOptIn] = useState(false);

  // 3D Preview states
  const [cakeShape, setCakeShape] = useState<"round" | "square" | "heart" | "number">("round");
  const [frostingColor, setFrostingColor] = useState(FINISHES[0].color);
  const [messageFont, setMessageFont] = useState(DEFAULT_CAKE_FONT);
  const [messageColor, setMessageColor] = useState(CAKE_TEXT_COLORS[0].value);
  const [decoration, setDecoration] = useState<"none" | "pearls" | "macarons" | "flowers" | "sprinkles">("none");
  // Configurator extras: explicit tier count (1–4), sponge syrup infusion and
  // the cross-section reveal position (viewport-only, never submitted).
  const [tiers, setTiers] = useState(1);
  const [syrup, setSyrup] = useState<SyrupId>("none");
  const [cut, setCut] = useState(0);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{
    ok: boolean;
    discount: number;
    msg: string;
    percent?: number;
    maxDiscount?: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const selected = sizes.find((s) => Math.abs(s.weight - weight) < 0.01) ?? sizes[0];
  // Configurator add-ons on top of the size price. `placeOrderAction` re-runs
  // the exact same function server-side, so the quote always matches the charge.
  const tierFee = tierExtraFee(tiers, weight, settings);
  const crownFee = getCrownPrice(decoration, settings);
  const syrupFee = getSyrupPrice(syrup, settings);
  const extras = tierFee + crownFee + syrupFee;
  const subtotal = selected.price + extras;

  const totals = useMemo(() => {
    const discount =
      promo?.ok && promo.percent != null
        ? Math.min(
            Math.round((subtotal * promo.percent) / 100),
            promo.maxDiscount && promo.maxDiscount > 0 ? promo.maxDiscount : Infinity,
          )
        : promo?.ok
          ? promo.discount
          : 0;
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
        msg: res.ok
          ? `✅ ${res.percent ?? ""}% × ৳${subtotal} = ৳${res.discount} ছাড় পেয়েছেন!`
          : `❌ ${res.reason}`,
        percent: res.percent,
        maxDiscount: res.maxDiscount,
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
      // Best effort only
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
          cake_shape: cakeShape,
          frosting_color: frostingColor,
          message_font: messageFont,
          message_color: messageColor,
          decoration: decoration,
          tiers: tiers,
          syrup: syrup,
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

      {/* Left: design + info */}
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
            <p className="mt-1 text-sm text-muted">আপনার পছন্দ অনুযায়ী কেক কাস্টমাইজ করুন</p>
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

          {/* Tier selector — Image-1 style priced architectural height */}
          <div>
            <span className="label">টিয়ার সংখ্যা (Architectural Height)</span>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => {
                const fee = tierExtraFee(n, weight, settings);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTiers(n)}
                    data-active={tiers === n}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border-2 p-3 text-xs font-semibold transition-all ${
                      tiers === n
                        ? "border-brand bg-brand/10 text-brand-strong"
                        : "border-line bg-surface text-muted hover:border-brand/50"
                    }`}
                  >
                    <span className="text-sm font-extrabold">{n} টিয়ার</span>
                    <span className="text-[10px] font-semibold">
                      {fee > 0 ? `+${formatBDT(fee)}` : "ফ্রি"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              ওজনের বেস টিয়ার ফ্রি — বেশি টিয়ারে প্রতিটির +{formatBDT(getTierFeeValue(settings))}
            </p>
          </div>

          {/* Shape Selection */}
          <div>
            <span className="label">Cake Shape (আকৃতি)</span>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { value: "round", label: "বৃত্ত", icon: "⬤" },
                  { value: "square", label: "বর্গ", icon: "■" },
                  { value: "heart", label: "হার্ট", icon: "♥" },
                  { value: "number", label: "নম্বর", icon: "🎂" },
                ] as const
              ).map((shape) => (
                <button
                  key={shape.value}
                  type="button"
                  onClick={() => setCakeShape(shape.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold transition-all ${
                    cakeShape === shape.value
                      ? "border-brand bg-brand/10 text-brand-strong"
                      : "border-line bg-surface text-muted hover:border-brand/50"
                  }`}
                >
                  <span className="text-lg">{shape.icon}</span>
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          {/* Finish swatches — named finishes with their own interior layers */}
          <div>
            <span className="label">ফিনিশ (Outer Finish)</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {FINISHES.map((f) => {
                const active = finishForColor(frostingColor)?.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrostingColor(f.color)}
                    data-active={active}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-[11px] font-semibold transition-all ${
                      active
                        ? "border-brand bg-brand/10 text-brand-strong"
                        : "border-line bg-surface text-muted hover:border-brand/50"
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-full border border-black/10"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="text-center leading-tight">{f.label}</span>
                    {f.hint && (
                      <span className="text-center text-[9px] font-medium leading-tight text-muted opacity-70">
                        {f.hint}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Hand-picked colour outside the named finishes */}
              <label
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-[11px] font-semibold transition-all ${
                  finishForColor(frostingColor)
                    ? "border-line bg-surface text-muted hover:border-brand/50"
                    : "border-brand bg-brand/10 text-brand-strong"
                }`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-black/20 bg-gradient-to-br from-rose-300 via-amber-200 to-sky-300 text-xs font-bold text-white drop-shadow">
                  +
                </span>
                <span className="text-center leading-tight">নিজের রঙ</span>
                <span className="text-center text-[9px] font-medium leading-tight text-muted opacity-70">
                  Custom colour picker
                </span>
                <input
                  type="color"
                  value={frostingColor}
                  onChange={(e) => setFrostingColor(e.target.value)}
                  className="sr-only"
                  aria-label="নিজের ফিনিশ রঙ"
                />
              </label>
            </div>
          </div>

          {/* Crown / topping selector — priced cards like the reference */}
          <div>
            <span className="label">ক্রাউন / টপিং (Top Crown)</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CROWNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDecoration(c.id)}
                  data-active={decoration === c.id}
                  className={`flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all ${
                    decoration === c.id
                      ? "border-brand bg-brand/10 text-brand-strong"
                      : "border-line bg-surface text-muted hover:border-brand/50"
                  }`}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] font-extrabold text-brand-strong">
                      {c.price > 0 ? `+${formatBDT(c.price)}` : "ফ্রি"}
                    </span>
                  </span>
                  <span className="mt-1 text-xs font-extrabold text-fg">{c.label}</span>
                  <span className="text-[10px] text-muted">{c.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sponge syrup infusion */}
          <div>
            <span className="label">সিরাপ ইনফিউশন (Sponge Infusion)</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SYRUPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSyrup(s.id)}
                  data-active={syrup === s.id}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition-all ${
                    syrup === s.id
                      ? "border-brand bg-brand/10 text-brand-strong"
                      : "border-line bg-surface text-muted hover:border-brand/50"
                  }`}
                >
                  <span className="font-extrabold">{s.label}</span>
                  <span className="text-[10px]">
                    {s.price > 0 ? `+${formatBDT(s.price)}` : "ফ্রি"}
                  </span>
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
              placeholder="যেমন: Happy Birthday"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Font picker — each chip previews its own face */}
            <div className="mt-4">
              <span className="label">লেখার ফন্ট</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CAKE_FONTS.map((f) => {
                  const active = messageFont === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setMessageFont(f.value)}
                      aria-pressed={active}
                      className={`rounded-xl border-2 px-3 py-2.5 text-base leading-tight transition-all ${
                        active
                          ? "border-brand bg-brand/10 text-brand-strong"
                          : "border-line bg-surface text-fg hover:border-brand/50"
                      }`}
                      style={{ fontFamily: f.family, fontWeight: 700 }}
                      title={f.label}
                    >
                      {message || "Happy Birthday"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text colour picker */}
            <div className="mt-4">
              <span className="label">লেখার রঙ</span>
              <div className="flex flex-wrap items-center gap-2">
                {CAKE_TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setMessageColor(c.value)}
                    aria-pressed={messageColor === c.value}
                    aria-label={c.label}
                    title={c.label}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-transform hover:scale-110 ${
                      messageColor === c.value
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-line"
                    }`}
                  >
                    <span
                      className="block h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: c.value }}
                    />
                  </button>
                ))}
                <label
                  className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-line bg-gradient-to-br from-rose-300 via-amber-200 to-sky-300 transition-transform hover:scale-110"
                  title="নিজের রঙ"
                >
                  <span className="text-[10px] font-bold text-white drop-shadow">+</span>
                  <input
                    type="color"
                    value={messageColor}
                    onChange={(e) => setMessageColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="নিজের রঙ বেছে নিন"
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="design_notes">ডিজাইন / theme বর্ণনা *</label>
            <textarea
              id="design_notes"
              className="field min-h-28"
              maxLength={500}
              required
              placeholder="রঙ, theme, character, কত জনের জন্য — যেমন: নীল dinosaur theme, ২০ জনের জন্য"
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ref_url">Reference Image URL (ঐচ্ছিক)</label>
              <input
                id="ref_url"
                name="ref_url"
                type="url"
                className="field"
                placeholder="https://…"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
              />
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
            <p>নিজের ছবি/ডিজাইন পাঠাতে চাইলে অর্ডারের পর WhatsApp এ পাঠান</p>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl font-extrabold">২. আপনার তথ্য ও ডেলিভারি 🚚</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customer_name">নাম *</label>
              <input id="customer_name" name="customer_name" required minLength={2} className="field" onBlur={() => void saveLead()} />
            </div>
            <div>
              <label className="label" htmlFor="phone">ফোন *</label>
              <input id="phone" name="phone" required inputMode="tel" className="field" placeholder="01XXXXXXXXX" onBlur={() => void saveLead()} />
            </div>
            <div>
              <label className="label" htmlFor="email">ইমেইল (ঐচ্ছিক)</label>
              <input id="email" name="email" type="email" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="delivery_date">ডেলিভারি তারিখ *</label>
              <input id="delivery_date" name="delivery_date" type="date" required min={minDeliveryDate} className="field" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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
              <span className="font-semibold text-fg">WhatsApp এ অর্ডার রিমাইন্ডার পেতে চাই</span>
            </span>
          </label>

          <div>
            <span className="label">সময়</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DELIVERY_SLOTS.map((s, i) => (
                <label key={s.value} className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-xs font-semibold transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/10">
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
                onMouseEnter={() => codIcon.current?.startAnimation()}
                onMouseLeave={() => codIcon.current?.stopAnimation()}
                className="cursor-pointer rounded-2xl border-2 bg-surface p-4"
                style={{
                  borderColor: payment === "cod" ? "hsl(var(--brand))" : "hsl(var(--border))",
                  background: payment === "cod" ? "hsl(var(--brand) / 0.08)" : undefined,
                }}
              >
                <input type="radio" name="payment_ui" checked={payment === "cod"} onChange={() => setPayment("cod")} className="sr-only" />
                <Wallet01Icon ref={codIcon} size={22} />
                <p className="mt-1.5 text-sm font-extrabold">Cash on Delivery</p>
              </label>
            )}

            {settings.bkash_enabled && (
              <label
                onMouseEnter={() => bkashIcon.current?.startAnimation()}
                onMouseLeave={() => bkashIcon.current?.stopAnimation()}
                className="cursor-pointer rounded-2xl border-2 bg-surface p-4"
                style={{
                  borderColor: payment === "bkash" ? "hsl(var(--brand))" : "hsl(var(--border))",
                  background: payment === "bkash" ? "hsl(var(--brand) / 0.08)" : undefined,
                }}
              >
                <input type="radio" name="payment_ui" checked={payment === "bkash"} onChange={() => setPayment("bkash")} className="sr-only" />
                <PhoneIcon ref={bkashIcon} size={22} />
                <p className="mt-1.5 text-sm font-extrabold">bKash (Send Money)</p>
              </label>
            )}

            {paystationEnabled && (
              <label
                onMouseEnter={() => paystationIcon.current?.startAnimation()}
                onMouseLeave={() => paystationIcon.current?.stopAnimation()}
                className="cursor-pointer rounded-2xl border-2 bg-surface p-4"
                style={{
                  borderColor: payment === "paystation" ? "hsl(var(--brand))" : "hsl(var(--border))",
                  background: payment === "paystation" ? "hsl(var(--brand) / 0.08)" : undefined,
                }}
              >
                <input type="radio" name="payment_ui" checked={payment === "paystation"} onChange={() => setPayment("paystation")} className="sr-only" />
                <CreditCardIcon ref={paystationIcon} size={22} />
                <p className="mt-1.5 text-sm font-extrabold">কার্ড / মোবাইল ওয়ালেট</p>
              </label>
            )}
          </div>

          <AnimatePresence>
            {payment === "bkash" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-3 rounded-xl border border-brand/35 bg-brand/6 p-4 text-sm">
                  <ol className="list-decimal space-y-1 pl-5 text-[13px]">
                    <li><strong>Send Money</strong> করুন: <span className="font-extrabold text-brand-strong">{settings.bkash_number}</span></li>
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
              <input id="promo" className="field min-w-0 flex-1 uppercase" placeholder="WELCOME10" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
              <button type="button" onClick={applyPromo} disabled={promoLoading} className="btn btn-soft shrink-0">
                {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
                Apply
              </button>
            </div>
            <AnimatePresence>
              {promo && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-2 text-xs font-semibold ${promo.ok ? "text-success" : "text-danger"}`}>
                  {promo.msg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button type="submit" disabled={pending || (!settings.cod_enabled && !settings.bkash_enabled)} className="btn btn-primary btn-lg btn-block min-w-0 whitespace-normal text-center leading-snug">
            {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> অর্ডার পাঠানো হচ্ছে…</> : <><Send className="h-4 w-4 shrink-0" /> Custom Cake অর্ডার করুন</>}
          </button>
        </section>
      </div>
      <OrderLoadingOverlay
        show={pending}
        message={
          payment === "paystation"
            ? "PayStation পেমেন্ট পেজে পাঠানো হচ্ছে…"
            : "অর্ডার প্রসেস হচ্ছে…"
        }
      />

      {/* Right: 3D Live Preview */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden !p-0">
          <Cake3DPreview
            shape={cakeShape}
            color={frostingColor}
            tiers={tiers}
            message={message}
            font={messageFont}
            textColor={messageColor}
            decoration={decoration}
            cut={cut}
          />
        </div>

        {/* Cross-section reveal — pull the slice out to inspect the layers */}
        {cakeShape === "round" || cakeShape === "number" ? (
          <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Cross-Section রিভিল
              </span>
              <span className="text-[11px] font-semibold text-brand-strong">
                {cut === 0 ? "বন্ধ" : `${Math.round(cut * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(cut * 100)}
              onChange={(e) => setCut(Number(e.target.value) / 100)}
              className="mt-2 w-full accent-[hsl(var(--brand))]"
              aria-label="কাট-রিভিল স্লাইডার"
            />
            <p className="mt-1 text-[10px] text-muted">
              স্লাইস টেনে কেকের ভেতরের স্পঞ্জ/ক্রিম লেয়ার দেখুন
            </p>
          </div>
        ) : (
          <p className="mt-4 text-center text-[11px] text-muted">
            {cakeShape === "heart" ? "হার্ট" : "স্কয়ার"} শেপে কাট-রিভিল সুবিধা নেই
          </p>
        )}

        {/* Live quote breakdown */}
        <div className="mt-4 space-y-3 rounded-xl border border-line bg-surface px-5 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted">কেক ({weightLabel(weight)})</span>
            <span className="font-semibold">{formatBDT(selected.price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">ডিজাইন</span>
            <span className="font-semibold capitalize">
              {cakeShape} · {finishNameFor(frostingColor)} · {tiers} টিয়ার
            </span>
          </div>
          {tierFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">এক্সট্রা টিয়ার ({tiers}টিয়ার)</span>
              <span className="font-semibold text-brand-strong">+ {formatBDT(tierFee)}</span>
            </div>
          )}
          {crownFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">ক্রাউন: {crownLabel(decoration)}</span>
              <span className="font-semibold text-brand-strong">+ {formatBDT(crownFee)}</span>
            </div>
          )}
          {syrupFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">সিরাপ: {syrupLabel(syrup)}</span>
              <span className="font-semibold text-brand-strong">+ {formatBDT(syrupFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-dashed border-line pt-2 text-sm">
            <span className="font-semibold">সাবটোটাল</span>
            <span className="font-semibold">{formatBDT(subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Promo</span>
              <span className="font-semibold text-success">− {formatBDT(totals.discount)}</span>
            </div>
          )}
          {totals.discount > 0 && promo?.percent != null && (
            <p className="text-right text-[11px] font-semibold text-success">
              {promo.percent}% × {formatBDT(subtotal)} = {formatBDT(totals.discount)}
            </p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted">Delivery</span>
            <span className="font-semibold">{totals.delivery === 0 ? "ফ্রি 🎉" : formatBDT(totals.delivery)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="font-extrabold">Grand Total</span>
            <AnimatePresence mode="popLayout">
              <motion.span key={totals.total} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="font-display text-2xl font-extrabold text-brand-strong">
                {formatBDT(totals.total)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>Custom cake এ ২ দিন আগে অর্ডার করলে ডিজাইন confirm করতে সুবিধা হয়।</p>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          Referral কোড থাকলে checkout এ বসান — {REFERRAL_PERCENT}% পর্যন্ত {formatBDT(REFERRAL_MAX_DISCOUNT)} ছাড়
        </p>
      </aside>
    </form>
  );
}