"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Percent,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import type { Occasion, Settings } from "@/lib/types";
import { DELIVERY_SLOTS, OCCASIONS } from "@/lib/constants";
import { REFERRAL_MAX_DISCOUNT, REFERRAL_PERCENT } from "@/lib/pricing";
import { formatBDT, weightLabel } from "@/lib/utils";
import {
  getCartLeadTokenAction,
  placeOrderAction,
  validatePromoAction,
  validateReferralAction,
  type PlaceOrderState,
} from "@/lib/actions/order";
import { useCart } from "@/components/cart/cart-context";
import { AnimatedNumber } from "@/components/reveal";

const STEPS = ["Occasion", "Cake Details", "Delivery", "Payment"];

const initialState: PlaceOrderState = {};

interface PromoState {
  code: string;
  discount: number;
  message: string;
  ok: boolean;
}

interface ReferralState {
  code: string;
  message: string;
  ok: boolean;
}

/** Map server field errors to the step that owns the field. */
function stepForField(field?: string): number | null {
  if (!field) return null;
  if (field === "occasion") return 0;
  if (field === "items") return 1;
  if (
    ["customer_name", "phone", "email", "address", "delivery_date", "delivery_slot", "note"].includes(
      field,
    )
  ) {
    return 2;
  }
  if (["promo_code", "referral_code", "payment_method", "bkash_trx_id"].includes(field)) {
    return 3;
  }
  return null;
}

export function OrderWizard({
  settings,
  idempotencyKey,
  minDeliveryDate,
  defaultDeliveryDate,
}: {
  settings: Settings;
  idempotencyKey: string;
  minDeliveryDate: string;
  defaultDeliveryDate: string;
}) {
  const { items, subtotal, setQty, remove } = useCart();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [messageOnCake, setMessageOnCake] = useState("");
  const [designNotes, setDesignNotes] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
  const [deliverySlot, setDeliverySlot] = useState("evening");
  const [note, setNote] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referral, setReferral] = useState<ReferralState | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [payment, setPayment] = useState<"cod" | "bkash">(
    settings.cod_enabled ? "cod" : "bkash",
  );
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(placeOrderAction, initialState);

  /* ---------- live totals (mirrors server logic) ---------- */
  const totals = useMemo(() => {
    const discount = promo?.ok ? promo.discount : 0;
    const afterPromo = Math.max(0, subtotal - discount);
    const referralValid = Boolean(referral?.ok);
    const referralDiscount = referralValid
      ? Math.min(Math.round((afterPromo * REFERRAL_PERCENT) / 100), REFERRAL_MAX_DISCOUNT)
      : 0;
    const payable = afterPromo - referralDiscount;

    let delivery = settings.delivery_charge;
    if (!settings.free_delivery_enabled) {
      delivery = settings.delivery_charge;
    } else if (settings.free_delivery_min <= 0) {
      delivery = 0;
    } else {
      delivery = payable >= settings.free_delivery_min ? 0 : settings.delivery_charge;
    }
    if (items.length === 0) delivery = 0;

    const freeDeliveryUnlocked = delivery === 0 && items.length > 0 && settings.free_delivery_enabled;

    return {
      discount,
      referralDiscount,
      delivery,
      total: payable + delivery,
      freeDeliveryUnlocked,
      toFreeDelivery:
        settings.free_delivery_enabled &&
        settings.free_delivery_min > 0 &&
        payable < settings.free_delivery_min
          ? settings.free_delivery_min - payable
          : 0,
    };
  }, [subtotal, promo, referral, settings, items.length]);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const res = await validatePromoAction(promoInput.trim(), subtotal);
      setPromo({
        code: promoInput.trim().toUpperCase(),
        discount: res.discount,
        message: res.ok ? `✅ ৳${res.discount} ছাড় পেয়েছেন!` : `❌ ${res.reason}`,
        ok: res.ok,
      });
      if (res.ok) setPromoInput(promoInput.trim().toUpperCase());
    } finally {
      setPromoLoading(false);
    }
  };

  const applyReferral = async () => {
    if (!referralInput.trim()) return;
    setReferralLoading(true);
    try {
      const res = await validateReferralAction(referralInput.trim(), subtotal);
      setReferral({
        code: referralInput.trim().toUpperCase(),
        message: res.ok ? "✅ রেফারেল কোড প্রযোজ্য" : `❌ ${res.reason}`,
        ok: res.ok,
      });
    } finally {
      setReferralLoading(false);
    }
  };

  const saveLead = async (optedIn: boolean) => {
    if (!optedIn || items.length === 0) return;
    if (phone.replace(/\D/g, "").length < 10) return;

    try {
      const issued = await getCartLeadTokenAction(phone);
      if (!issued.token) return;
      await fetch("/api/whatsapp/cart-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: issued.token,
          customer_name: customerName,
          items,
          subtotal,
          opted_in: true,
        }),
      });
    } catch {
      // Best effort only — never block checkout.
    }
  };

  const validateDeliveryStep = (): string | null => {
    if (customerName.trim().length < 2) return "আপনার নাম লিখুন।";
    if (phone.replace(/\D/g, "").length < 10) return "সঠিক ফোন নম্বর দিন।";
    if (address.trim().length < 5) return "সম্পূর্ণ ঠিকানা লিখুন।";
    if (!deliveryDate) return "ডেলিভারি তারিখ দিন।";
    if (deliveryDate < minDeliveryDate) {
      return `ডেলিভারির জন্য অন্তত ২ দিন আগে অর্ডার করতে হবে।`;
    }
    if (!DELIVERY_SLOTS.some((s) => s.value === deliverySlot)) return "ডেলিভারি সময় বাছুন।";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "সঠিক ইমেইল দিন।";
    return null;
  };

  const goNext = () => {
    if (step === 2) {
      const error = validateDeliveryStep();
      if (error) {
        setStepError(error);
        return;
      }
    }
    setStepError(null);
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const nextDisabled = step === 1 && items.length === 0;

  /* ---------- empty cart ---------- */
  if (items.length === 0) {
    return (
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="text-6xl"
        >
          🧺
        </motion.span>
        <h2 className="text-xl font-extrabold">আপনার কার্ট খালি</h2>
        <p className="max-w-sm text-sm text-muted">
          অর্ডার করার জন্য আগে একটা কেক বেছে নিন — অথবা নিজের ডিজাইনে custom cake অর্ডার করুন।
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/cakes" className="btn btn-primary">
            <ShoppingBag className="h-4 w-4" /> কেক বেছে নিন
          </Link>
          <Link href="/custom-order" className="btn btn-ghost">
            Custom Cake
          </Link>
        </div>
      </div>
    );
  }

  const errorStep = stepForField(state.field);

  return (
    <div className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
      {/* ------------- left: steps ------------- */}
      <div>
        {/* progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className="flex items-center gap-2"
                  disabled={i > step}
                >
                  <motion.span
                    animate={{
                      backgroundColor: i <= step ? "hsl(var(--brand))" : "hsl(var(--border))",
                      color: i <= step ? "hsl(var(--brand-fg))" : "hsl(var(--muted))",
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold"
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </motion.span>
                  <span
                    className={`hidden text-xs font-bold sm:block ${
                      i <= step ? "text-fg" : "text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.div
                      className="h-full bg-brand"
                      initial={{ width: 0 }}
                      animate={{ width: i < step ? "100%" : "0%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={(e) => {
            // Enter/Next on earlier steps must never place the order; only the
            // final step submits.
            if (step < 3) {
              e.preventDefault();
              goNext();
            }
          }}
        >
          {/* hidden order payload — every step stays mounted so FormData is complete */}
          <input type="hidden" name="occasion" value={occasion} />
          <input type="hidden" name="items" value={JSON.stringify(items)} />
          <input
            type="hidden"
            name="custom_spec"
            value={JSON.stringify({
              message_on_cake: messageOnCake || undefined,
              design_notes: designNotes || undefined,
            })}
          />
          <input type="hidden" name="promo_code" value={promo?.ok ? promo.code : ""} />
          <input
            type="hidden"
            name="referral_code"
            value={referral?.ok ? referral.code : ""}
          />
          <input type="hidden" name="payment_method" value={payment} />
          <input type="hidden" name="subtotal" value={subtotal} />
          <input type="hidden" name="discount_amount" value={totals.discount} />
          <input type="hidden" name="referral_discount" value={totals.referralDiscount} />
          <input type="hidden" name="delivery_charge" value={totals.delivery} />
          <input type="hidden" name="total" value={totals.total} />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />

          {(state.error || stepError) && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              <span className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {state.error ?? stepError}
              </span>
              {state.error && errorStep != null && step !== errorStep && (
                <button
                  type="button"
                  onClick={() => {
                    setStepError(null);
                    setStep(errorStep);
                  }}
                  className="btn btn-sm border border-danger/40 bg-danger/10"
                >
                  ঠিক করুন
                </button>
              )}
            </div>
          )}

          {/* ---------------- STEP 1: occasion ---------------- */}
          <section className={step === 0 ? "card p-6" : "hidden"} aria-hidden={step !== 0}>
            <h2 className="text-xl font-extrabold">কোন occasion এর জন্য? 🎯</h2>
            <p className="mt-1.5 text-sm text-muted">
              এটা আমাদের পরবর্তী step সহজ করবে — একটাই ক্লিক
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {OCCASIONS.map((o) => {
                const active = occasion === o.value;
                return (
                  <motion.button
                    key={o.value}
                    type="button"
                    onClick={() => setOccasion(o.value)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative rounded-2xl border-2 p-4 text-left transition-colors ${
                      active ? "border-brand bg-brand/8" : "border-line bg-surface hover:border-brand/40"
                    }`}
                    aria-pressed={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="occ-check"
                        className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-fg"
                        transition={{ type: "spring", stiffness: 420, damping: 26 }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                    <span className="text-3xl">{o.emoji}</span>
                    <p className="mt-2 text-sm font-extrabold">{o.label}</p>
                    <p className="text-xs text-muted">
                      {o.bn} · {o.hint}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* ---------------- STEP 2: cake details ---------------- */}
          <section className={step === 1 ? "space-y-5" : "hidden"} aria-hidden={step !== 1}>
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">আপনার কার্ট</h2>
                <Link href="/cakes" className="text-xs font-semibold text-brand-strong underline">
                  + আরও যোগ করুন
                </Link>
              </div>

              <ul className="space-y-3">
                {items.map((it) => (
                  <motion.li
                    key={`${it.cake_id}-${it.weight ?? 0}`}
                    layout
                    className="flex items-center gap-3 rounded-xl border border-line p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{it.name}</p>
                      <p className="text-xs text-muted">
                        {it.weight ? weightLabel(it.weight) : "১ lb"} · {formatBDT(it.unit_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full border border-line px-1">
                      <button
                        type="button"
                        onClick={() => setQty(it.cake_id, it.weight, it.quantity - 1)}
                        className="grid h-6 w-6 place-items-center rounded-full hover:bg-fg/5"
                        aria-label="কমান"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-xs font-bold">{it.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(it.cake_id, it.weight, it.quantity + 1)}
                        className="grid h-6 w-6 place-items-center rounded-full hover:bg-fg/5"
                        aria-label="বাড়ান"
                      >
                        +
                      </button>
                    </div>

                    <p className="w-20 text-right text-sm font-extrabold text-brand-strong">
                      {formatBDT(it.unit_price * it.quantity)}
                    </p>
                  </motion.li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => remove(items[0].cake_id, items[0].weight)}
                className="mt-3 text-xs font-semibold text-danger hover:underline"
              >
                প্রথম আইটেম সরান
              </button>
            </div>

            <div className="card space-y-4 p-6">
              <div>
                <h3 className="text-lg font-extrabold">Message / Design 🎨</h3>
                <p className="mt-1 text-sm text-muted">ঐচ্ছিক — কিন্তু কেক আরও special হবে!</p>
              </div>

              <div>
                <label className="label" htmlFor="msg">
                  কেকের উপর লেখা
                </label>
                <input
                  id="msg"
                  className="field"
                  maxLength={40}
                  placeholder="যেমন: Happy Birthday Ayaan!"
                  value={messageOnCake}
                  onChange={(e) => setMessageOnCake(e.target.value)}
                />
                <p className="mt-1 text-right text-[11px] text-muted">{messageOnCake.length}/40</p>

                <div className="mt-3 rounded-xl border border-dashed border-brand/40 bg-brand/6 p-4 text-center">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={messageOnCake || "empty"}
                      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                      transition={{ duration: 0.25 }}
                      className="font-display text-lg font-extrabold text-brand-strong"
                    >
                      {messageOnCake || "✎ এখানে লিখুন…"}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="design">
                  ডিজাইন নোট / reference
                </label>
                <textarea
                  id="design"
                  className="field min-h-24"
                  maxLength={400}
                  placeholder="রঙ, theme, ছবির reference — যেমন: নীল dinosaur theme, ২০ জনের জন্য"
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ---------------- STEP 3: delivery ---------------- */}
          <section className={step === 2 ? "card space-y-4 p-6" : "hidden"} aria-hidden={step !== 2}>
            <div>
              <h2 className="text-xl font-extrabold">ডেলিভারি তথ্য 🚚</h2>
              <p className="mt-1 text-sm text-muted">
                অন্তত ২ দিন আগে অর্ডার করলে custom cake নিশ্চিত হবে
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customer_name">
                  আপনার নাম *
                </label>
                <input
                  id="customer_name"
                  name="customer_name"
                  required
                  minLength={2}
                  className="field"
                  placeholder="যেমন: Rafiq Hasan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  ফোন নম্বর *
                </label>
                <input
                  id="phone"
                  name="phone"
                  required
                  inputMode="tel"
                  pattern="[0-9+\s\-]{10,20}"
                  className="field"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="email">
                  ইমেইল (ঐচ্ছিক)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="field"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="delivery_date">
                  ডেলিভারি তারিখ *
                </label>
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
                চেক করলে আমরা WhatsApp এ একটি নিশ্চিতকরণ পাঠাবো — আপনাকে START লিখতে হবে। চেক না করলেও
                অর্ডার সম্পন্ন হবে। যেকোনো সময় STOP লিখে বন্ধ করতে পারবেন।
              </span>
            </label>

            <div>
              <label className="label">সময় নির্বাচন</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DELIVERY_SLOTS.map((s) => (
                  <label
                    key={s.value}
                    className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-xs font-semibold transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/10"
                  >
                    <input
                      type="radio"
                      name="delivery_slot"
                      value={s.value}
                      checked={deliverySlot === s.value}
                      onChange={() => setDeliverySlot(s.value)}
                      className="sr-only"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="address">
                সম্পূর্ণ ঠিকানা *
              </label>
              <textarea
                id="address"
                name="address"
                required
                minLength={5}
                className="field min-h-20"
                placeholder="বাড়ি/রোড/এলাকা — যেমন: House 12, Road 5, Dhanmondi, Dhaka"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="note">
                বিশেষ নির্দেশনা (ঐচ্ছিক)
              </label>
              <input
                id="note"
                name="note"
                className="field"
                placeholder="যেমন: ৬টার আগে দিয়ে যান"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </section>

          {/* ---------------- STEP 4: payment ---------------- */}
          <section className={step === 3 ? "space-y-5" : "hidden"} aria-hidden={step !== 3}>
            {/* promo + referral */}
            <div className="card space-y-4 p-6">
              <h3 className="text-lg font-extrabold">
                <Ticket className="mr-1.5 inline h-4 w-4 text-brand" /> ছাড় যোগ করুন
              </h3>

              <div>
                <label className="label" htmlFor="promo">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    className="field uppercase"
                    placeholder="যেমন: WELCOME10"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promo) setPromo(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyPromo())}
                  />
                  <button type="button" onClick={applyPromo} disabled={promoLoading} className="btn btn-soft">
                    {promoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Percent className="h-4 w-4" />
                    )}
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
                      {promo.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="label" htmlFor="ref">
                  Referral Code (ঐচ্ছিক)
                </label>
                <div className="flex gap-2">
                  <input
                    id="ref"
                    className="field uppercase"
                    placeholder="বন্ধুর কোড দিলে ৫% ছাড়"
                    value={referralInput}
                    onChange={(e) => {
                      setReferralInput(e.target.value.toUpperCase());
                      if (referral) setReferral(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyReferral())}
                  />
                  <button
                    type="button"
                    onClick={applyReferral}
                    disabled={referralLoading}
                    className="btn btn-soft"
                  >
                    {referralLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Percent className="h-4 w-4" />
                    )}
                    Apply
                  </button>
                </div>
                {referral && (
                  <p className={`mt-2 text-xs font-semibold ${referral.ok ? "text-success" : "text-danger"}`}>
                    {referral.message}
                  </p>
                )}
                {totals.referralDiscount > 0 && (
                  <p className="mt-2 text-xs font-semibold text-success">
                    ✅ Referral ৳{totals.referralDiscount} ছাড় প্রযোজ্য
                  </p>
                )}
              </div>
            </div>

            {/* payment method */}
            <div className="card space-y-4 p-6">
              <h3 className="text-lg font-extrabold">
                <CreditCard className="mr-1.5 inline h-4 w-4 text-brand" /> পেমেন্ট
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {settings.cod_enabled && (
                  <label
                    className="cursor-pointer rounded-2xl border-2 bg-surface p-4 transition-colors"
                    style={{
                      borderColor: payment === "cod" ? "hsl(var(--brand))" : "hsl(var(--border))",
                      background: payment === "cod" ? "hsl(var(--brand) / 0.08)" : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method_ui"
                      value="cod"
                      checked={payment === "cod"}
                      onChange={() => setPayment("cod")}
                      className="sr-only"
                    />
                    <span className="text-xl">💵</span>
                    <p className="mt-1.5 text-sm font-extrabold">Cash on Delivery</p>
                    <p className="text-xs text-muted">হাতে পেয়ে টাকা দিন</p>
                  </label>
                )}

                {settings.bkash_enabled && (
                  <label
                    className="cursor-pointer rounded-2xl border-2 bg-surface p-4 transition-colors"
                    style={{
                      borderColor: payment === "bkash" ? "hsl(var(--brand))" : "hsl(var(--border))",
                      background: payment === "bkash" ? "hsl(var(--brand) / 0.08)" : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method_ui"
                      value="bkash"
                      checked={payment === "bkash"}
                      onChange={() => setPayment("bkash")}
                      className="sr-only"
                    />
                    <span className="text-xl">📱</span>
                    <p className="mt-1.5 text-sm font-extrabold">bKash (Send Money)</p>
                    <p className="text-xs text-muted">TrxID সাবমিট করুন</p>
                  </label>
                )}
              </div>

              {!settings.cod_enabled && !settings.bkash_enabled && (
                <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  পেমেন্ট অপশন এখন বন্ধ আছে। অনুগ্রহ করে WhatsApp এ যোগাযোগ করুন।
                </p>
              )}

              {payment === "bkash" && <BkashBox bkashNumber={settings.bkash_number} />}
            </div>
          </section>

          {/* ------------- nav buttons ------------- */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || pending}
              className="btn btn-ghost"
            >
              <ArrowLeft className="h-4 w-4" /> আগের ধাপ
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={nextDisabled || pending}
                className="btn btn-primary btn-lg"
              >
                পরের ধাপ <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={pending || (!settings.cod_enabled && !settings.bkash_enabled)}
                className="btn btn-primary btn-lg group"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> অর্ডার হচ্ছে…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> অর্ডার কনফার্ম করুন · {formatBDT(totals.total)}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ------------- right: summary ------------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-brand/6 px-5 py-4">
            <h3 className="font-extrabold">অর্ডার সারাংশ</h3>
            <p className="text-xs text-muted">{items.length} ধরনের কেক</p>
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto px-5 py-4">
            {items.map((it) => (
              <div key={`${it.cake_id}-${it.weight ?? 0}`} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{it.name}</p>
                  <p className="text-xs text-muted">
                    {it.weight ? weightLabel(it.weight) : "১ lb"} × {it.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-bold">{formatBDT(it.unit_price * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 border-t border-line px-5 py-4 text-sm">
            <Row label="Subtotal" value={formatBDT(subtotal)} />
            {totals.discount > 0 && (
              <Row label={`Promo ${promo?.code ?? ""}`} value={`− ${formatBDT(totals.discount)}`} accent />
            )}
            {totals.referralDiscount > 0 && (
              <Row label="Referral" value={`− ${formatBDT(totals.referralDiscount)}`} accent />
            )}
            <Row
              label="Delivery"
              value={totals.freeDeliveryUnlocked ? "ফ্রি 🎉" : formatBDT(totals.delivery)}
              accent={totals.freeDeliveryUnlocked}
            />

            {totals.toFreeDelivery > 0 && (
              <div className="rounded-xl bg-accent/12 px-3 py-2 text-xs font-semibold text-accent">
                ৳{totals.toFreeDelivery} আরও দিলে ফ্রি ডেলিভারি!
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-extrabold">Grand Total</span>
              <AnimatedNumber
                key={totals.total}
                value={totals.total}
                prefix="৳"
                className="font-display text-2xl font-extrabold text-brand-strong"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>আপনার তথ্য নিরাপদ থাকে। অর্ডার কনফার্ম হলে WhatsApp এ confirmation পাবেন।</p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${accent ? "text-success" : ""}`}>{value}</span>
    </div>
  );
}

/** bKash instructions + TrxID field — shown only when bKash is selected. */
function BkashBox({ bkashNumber }: { bkashNumber: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-3 space-y-3 rounded-xl border border-brand/35 bg-brand/6 p-4 text-sm">
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
          <li>
            <strong>bKash Send Money</strong> করুন এই নম্বরে:{" "}
            <span className="font-extrabold text-brand-strong">{bkashNumber}</span>
          </li>
          <li>Transaction ID (TrxID) কপি করুন</li>
          <li>নিচের ঘরে বসান</li>
        </ol>

        <div>
          <label className="label" htmlFor="bkash_trx_id">
            TrxID *
          </label>
          <input
            id="bkash_trx_id"
            name="bkash_trx_id"
            className="field uppercase"
            required={false}
            minLength={8}
            maxLength={20}
            pattern="[A-Za-z0-9]{8,20}"
            placeholder="যেমন: 9F78420KX"
          />
        </div>
        <p className="text-[11px] text-muted">
          আমরা verify করে WhatsApp এ confirm করবো। ভুল/ডুপ্লিকেট TrxID দিলে অর্ডার বাতিল হবে।
        </p>
      </div>
    </motion.div>
  );
}
