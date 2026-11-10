"use client";

import { useActionState, useState } from "react";
import {
  Banknote,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Percent,
  Phone,
  Save,
  Store,
  Truck,
} from "lucide-react";
import type { Settings } from "@/lib/types";
import { saveSettingsAction, type ActionState } from "@/lib/actions/admin";
import { playNotificationSound, setNotificationVolume, setSoundSettings } from "@/lib/notification-sound";
import { AnimIcon } from "@/components/ui/anim-icon";

const initial: ActionState = {};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          <AnimIcon name="alert" className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          <AnimIcon name="check" className="h-4 w-4 shrink-0" /> {state.success}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------ store info ------------------ */}
        <section className="card p-5">
          <SectionTitle icon={Store} title="দোকানের তথ্য" hint="সাইটের সব জায়গায় এই তথ্য দেখাবে" />

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="set-name" className="label">
                দোকানের নাম *
              </label>
              <input
                id="set-name"
                name="store_name"
                required
                minLength={2}
                defaultValue={settings.store_name}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="set-tagline" className="label">
                ট্যাগলাইন
              </label>
              <input
                id="set-tagline"
                name="tagline"
                maxLength={120}
                defaultValue={settings.tagline}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="set-address" className="label">
                ঠিকানা
              </label>
              <input
                id="set-address"
                name="address"
                maxLength={200}
                defaultValue={settings.address}
                className="field"
              />
            </div>
          </div>
        </section>

        {/* ------------------ contact ------------------ */}
        <section className="card p-5">
          <SectionTitle icon={Phone} title="যোগাযোগ" hint="ফোন, WhatsApp ও ইমেইল" />

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="set-phone" className="label">
                <Phone className="mr-1 inline h-3.5 w-3.5" aria-hidden /> ফোন *
              </label>
              <input
                id="set-phone"
                name="phone"
                required
                defaultValue={settings.phone}
                className="field"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div>
              <label htmlFor="set-wa" className="label">
                <MessageCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden /> WhatsApp নম্বর *
              </label>
              <input
                id="set-wa"
                name="whatsapp_phone"
                required
                defaultValue={settings.whatsapp_phone}
                className="field"
                placeholder="8801XXXXXXXXX"
              />
              <p className="mt-1 text-[11px] text-muted">
                wa.me লিংকে এই নম্বর ব্যবহার হয়। Cloud API অটো-মেসেজের জন্য .env.local আলাদা।
              </p>
            </div>

            <div>
              <label htmlFor="set-email" className="label">
                <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden /> ইমেইল *
              </label>
              <input
                id="set-email"
                name="email"
                type="email"
                required
                defaultValue={settings.email}
                className="field"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="set-instagram" className="label">
                  Instagram
                </label>
                <input
                  id="set-instagram"
                  name="instagram"
                  defaultValue={settings.instagram ?? ""}
                  className="field"
                  placeholder="https://instagram.com/…"
                />
              </div>
              <div>
                <label htmlFor="set-facebook" className="label">
                  Facebook
                </label>
                <input
                  id="set-facebook"
                  name="facebook"
                  defaultValue={settings.facebook ?? ""}
                  className="field"
                  placeholder="https://facebook.com/…"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------ delivery ------------------ */}
        <section className="card p-5">
          <SectionTitle
            icon={Truck}
            title="ডেলিভারি চার্জ"
            hint="ফ্ল্যাট চার্জ — জোন ভিত্তিক নয়"
          />

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="set-delivery" className="label">
                <Truck className="mr-1 inline h-3.5 w-3.5" aria-hidden /> ডেলিভারি চার্জ (৳) *
              </label>
              <input
                id="set-delivery"
                name="delivery_charge"
                type="number"
                min={0}
                required
                defaultValue={settings.delivery_charge}
                className="field"
              />
              <p className="mt-1 text-[11px] text-muted">সব অর্ডারে একই চার্জ প্রযোজ্য হবে</p>
            </div>

            <div>
              <label htmlFor="set-free-min" className="label">
                ফ্রি ডেলিভারি — সর্বনিম্ন অর্ডার (৳)
              </label>
              <input
                id="set-free-min"
                name="free_delivery_min"
                type="number"
                min={0}
                defaultValue={settings.free_delivery_min}
                className="field"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
              <input
                type="checkbox"
                name="free_delivery_enabled"
                defaultChecked={settings.free_delivery_enabled}
                className="h-4 w-4 accent-[hsl(var(--brand))]"
              />
              <span className="text-sm font-semibold">নির্দিষ্ট অর্ডারের উপরে ফ্রি ডেলিভারি চালু</span>
            </label>
          </div>
        </section>

        {/* ------------------ payment ------------------ */}
        <section className="card p-5">
          <SectionTitle
            icon={Banknote}
            title="পেমেন্ট"
            hint="COD ও ম্যানুয়াল bKash নিয়ন্ত্রণ"
          />

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="set-bkash" className="label">
                <Banknote className="mr-1 inline h-3.5 w-3.5" aria-hidden /> bKash নম্বর *
              </label>
              <input
                id="set-bkash"
                name="bkash_number"
                required
                defaultValue={settings.bkash_number}
                className="field"
                placeholder="01XXXXXXXXX"
              />
              <p className="mt-1 text-[11px] text-muted">
                কাস্টমার এই নম্বরে Send Money করে TrxID দিবে — আপনি Approve করবেন
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
              <input
                type="checkbox"
                name="cod_enabled"
                defaultChecked={settings.cod_enabled}
                className="h-4 w-4 accent-[hsl(var(--brand))]"
              />
              <span className="text-sm font-semibold">Cash on Delivery চালু</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
              <input
                type="checkbox"
                name="bkash_enabled"
                defaultChecked={settings.bkash_enabled}
                className="h-4 w-4 accent-[hsl(var(--brand))]"
              />
              <span className="text-sm font-semibold">bKash পেমেন্ট চালু</span>
            </label>

            <div className="space-y-2 rounded-xl border border-line bg-bg px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="notification_sound_enabled"
                    defaultChecked={settings.notification_sound_enabled}
                    className="h-4 w-4 accent-[hsl(var(--brand))]"
                  />
                  <span className="text-sm font-semibold">ড্যাশবোর্ডে নতুন অর্ডার/পেমেন্ট/রিভিউ এলে সাউন্ড</span>
                </label>
                <VolumeSlider initial={settings.notification_sound_volume ?? 50} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["order", "নতুন অর্ডার"],
                    ["payment", "পেমেন্ট"],
                    ["review", "রিভিউ"],
                  ] as const
                ).map(([kind, label]) => (
                  <SoundRow
                    key={kind}
                    kind={kind}
                    label={label}
                    initial={settings.notification_sounds?.[kind]}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted">Custom sound: WAV/MP3 (≤1MB) আপলোড করুন — না দিলে default sound বাজবে।</p>
            </div>

            <p className="rounded-xl bg-accent/10 px-3 py-2 text-[11px] text-muted">
              <Percent className="mr-1 inline h-3 w-3" aria-hidden /> ছাড়ের হার Promo পেজ থেকে নিয়ন্ত্রণ করুন।
              এখানে শুধু চার্জ ও মেথড।
            </p>
          </div>
        </section>

        {/* ------------------ custom cake pricing ------------------ */}
        <section className="card p-5 lg:col-span-2">
          <SectionTitle
            icon={Store}
            title="Custom Cake প্রাইজিং"
            hint="Custom cake অর্ডারের জন্য টিয়ার, সিরাপ ও ক্রাউন এর দাম"
          />

          <div className="mt-4">
            <span className="label">Custom order option — off করলে কাস্টমার সেই অপশন দেখবে না</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["tiers", "টিয়ার সংখ্যা"],
                  ["shape", "Cake Shape"],
                  ["finish", "ফিনিশ (রঙ)"],
                  ["crown", "ক্রাউন / টপিং"],
                  ["syrup", "সিরাপ ইনফিউশন"],
                  ["message", "কেকের লেখা"],
                  ["font", "লেখার ফন্ট"],
                  ["message_color", "লেখার রঙ"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
                  <input
                    type="checkbox"
                    name={`custom_opt_${key}`}
                    defaultChecked={settings.custom_options?.[key] ?? true}
                    className="h-4 w-4 accent-[hsl(var(--brand))]"
                  />
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {/* Extra Tier Fee */}
            <div>
              <label htmlFor="set-extra-tier-fee" className="label">
                প্রতিটি অতিরিক্ত টিয়ার (৳)
              </label>
              <input
                id="set-extra-tier-fee"
                name="extra_tier_fee"
                type="number"
                min={0}
                defaultValue={settings.extra_tier_fee ?? 300}
                className="field"
              />
              <p className="mt-1 text-[11px] text-muted">
                ওজনের বেস টিয়ার ফ্রি — প্রতি অতিরিক্ত টিয়ারে এই চার্জ
              </p>
            </div>

            {/* Syrup Prices */}
            <div>
              <span className="label">সিরাপ ইনফিউশন দাম</span>
              <div className="space-y-2 mt-2">
                {["vanilla", "chocolate", "strawberry", "coffee", "honey", "rose"].map((syrup) => (
                  <div key={syrup} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{syrup}</span>
                    <input
                      type="number"
                      name={`syrup_${syrup}`}
                      min={0}
                      defaultValue={settings.syrup_prices?.[syrup] ?? 0}
                      className="field w-24"
                      placeholder="৳"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Crown Prices */}
            <div>
              <span className="label">ক্রাউন / টপিং দাম</span>
              <div className="space-y-2 mt-2">
                {["sprinkles", "pearls", "macarons", "flowers"].map((crown) => (
                  <div key={crown} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{crown}</span>
                    <input
                      type="number"
                      name={`crown_${crown}`}
                      min={0}
                      defaultValue={settings.crown_prices?.[crown] ?? 0}
                      className="field w-24"
                      placeholder="৳"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-4 z-10">
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-surface/95 p-3 backdrop-blur">
          <p className="flex items-center gap-2 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            সেভ করলে সাইটে সাথে সাথে আপডেট হবে
          </p>
          <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            সেটিংস সেভ করুন
          </button>
        </div>
      </div>
    </form>
  );
}

function SoundRow({
  kind,
  label,
  initial,
}: {
  kind: "order" | "payment" | "review";
  label: string;
  initial?: { enabled: boolean; volume: number; url?: string | null };
}) {
  const [volume, setVolume] = useState(initial?.volume ?? 50);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/sound-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, kind }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (json.url) {
        setUrl(json.url);
        // Push into the module map so Test + the next notification use the new
        // file immediately, before a page refresh re-renders the sidebar props.
        setSoundSettings(kind, { enabled: initial?.enabled ?? true, volume, url: json.url });
      } else alert(json.error ?? "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2">
          <input type="checkbox" name={`sound_${kind}_enabled`} defaultChecked={initial?.enabled ?? true} className="h-4 w-4 accent-[hsl(var(--brand))]" />
          <span className="text-xs font-bold">{label}</span>
        </label>
        <button type="button" onClick={() => playNotificationSound(kind, url || undefined)} className="btn btn-ghost btn-sm">Test</button>
      </div>
      <input
        type="range"
        name={`sound_${kind}_volume`}
        min={0}
        max={100}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="mt-2 w-full accent-[hsl(var(--brand))]"
        aria-label={`${label} ভলিউম`}
      />
      <p className="text-[11px] text-muted">{volume}%</p>
      <div className="mt-2 flex items-center gap-1.5">
        <input type="hidden" name={`sound_${kind}_url`} value={url} />
        <label className="btn btn-ghost btn-sm cursor-pointer">
          {uploading ? "…" : url ? "বদলান" : "Sound upload"}
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {url && <span className="truncate text-[10px] text-success">custom sound ✓</span>}
      </div>
    </div>
  );
}

function VolumeSlider({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <input
        type="range"
        name="notification_sound_volume"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          setNotificationVolume(v / 100);
        }}
        className="w-20 accent-[hsl(var(--brand))]"
        aria-label="নোটিফিকেশন সাউন্ড ভলিউম"
      />
      <span className="w-8 text-xs font-bold tabular-nums">{value}%</span>
      <button type="button" onClick={() => playNotificationSound("test")} className="btn btn-ghost btn-sm shrink-0">Test</button>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line pb-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-strong">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-extrabold">{title}</h2>
        <p className="text-[11px] text-muted">{hint}</p>
      </div>
    </div>
  );
}
