/**
 * Shared configurator model for /custom-order: finish swatches, crown
 * toppings, syrup infusions and per-tier pricing.
 *
 * The form renders these as the live quote, and `placeOrderAction` re-runs
 * `customExtras()` server-side so the charged total always matches the quote
 * the customer saw on screen. Keep this module dependency-free — it is
 * imported by validators, the server action and client components alike.
 */

/** Price charged for every tier above the weight-implied baseline. */
export const EXTRA_TIER_FEE = 300;

export interface FinishLayers {
  /** Interior bands revealed by the cross-section cut. */
  sponge: string;
  cream: string;
  crunch: string;
}

export interface Finish {
  id: string;
  label: string;
  /** One-line English descriptor shown under the label on the swatch card. */
  hint?: string;
  /** Exterior frosting colour shown on the tiers. */
  color: string;
  layers: FinishLayers;
}

/**
 * Named finishes — the four-card palette from the reference configurator
 * (Midnight Noir / Pure White / Pistachio Sage / Golden Honeycomb) plus the
 * form's own "নিজের রঙ" custom picker. Each finish carries its internal
 * sponge/cream/crunch colours so the cross-section reveal shows a different
 * recipe per finish, not just a different exterior.
 *
 * Order matters: `FINISHES[0]` is the default selection in the form, which
 * matches the reference where Midnight Noir starts selected.
 */
export const FINISHES: Finish[] = [
  {
    id: "dark",
    label: "মিডনাইট নোয়ার",
    hint: "Deep cocoa sheen",
    color: "#1c1917",
    layers: { sponge: "#3a2f29", cream: "#211c19", crunch: "#14110f" },
  },
  {
    id: "white",
    label: "পিওর হোয়াইট",
    hint: "Silk fondant white",
    color: "#ffffff",
    layers: { sponge: "#f5efe2", cream: "#fffef9", crunch: "#e5ddcc" },
  },
  {
    id: "pistachio",
    label: "পিস্তাশিয়া সেজ",
    hint: "Muted botanical",
    color: "#b4c49b",
    layers: { sponge: "#dfe8cd", cream: "#f3f7ea", crunch: "#9cae83" },
  },
  {
    id: "honeycomb",
    label: "গোল্ডেন হানিকম্ব",
    hint: "Amber glass glaze",
    color: "#d9a441",
    layers: { sponge: "#f3e2c8", cream: "#fdf0d5", crunch: "#d9a441" },
  },
];

/**
 * Fallback interior for custom (hand-picked) colours. Written out explicitly
 * rather than `FINISHES[0].layers` so reordering the palette can never hand
 * dark sponge bands to a hand-picked pastel.
 */
export const VANILLA_LAYERS: FinishLayers = {
  sponge: "#f3e2c8",
  cream: "#fdf6e9",
  crunch: "#e6cf9f",
};

export type CrownId = "none" | "pearls" | "macarons" | "flowers" | "sprinkles";

export interface Crown {
  id: CrownId;
  label: string;
  hint: string;
  icon: string;
  price: number;
}

/** Top crowns — same ids as the legacy `decoration` field in custom_spec. */
export const CROWNS: Crown[] = [
  { id: "none", label: "কোনো না", hint: "সাধারণ টপ", icon: "🚫", price: 0 },
  { id: "sprinkles", label: "স্প্রিংকেল", hint: "রঙা কনফেটি", icon: "🎊", price: 150 },
  { id: "pearls", label: "মোতি বর্ডার", hint: "সোনালি মোতি", icon: "✨", price: 250 },
  { id: "macarons", label: "ম্যাকারন টাওয়ার", hint: "উপরে ম্যাকারন", icon: "🧁", price: 450 },
  { id: "flowers", label: "ফুলের সাজ", hint: "তাজা ফুল", icon: "🌸", price: 550 },
];

export const SYRUP_VALUES = [
  "none",
  "vanilla",
  "chocolate",
  "strawberry",
  "coffee",
  "honey",
  "rose",
] as const;

export type SyrupId = (typeof SYRUP_VALUES)[number];

export interface Syrup {
  id: SyrupId;
  label: string;
  price: number;
}

/** Sponge syrup infusions — soaked into the sponge before assembly. */
export const DEFAULT_SYRUP_PRICES: Record<string, number> = {
  none: 0,
  vanilla: 100,
  chocolate: 120,
  strawberry: 120,
  coffee: 130,
  honey: 150,
  rose: 140,
};

export const DEFAULT_CROWN_PRICES: Record<string, number> = {
  none: 0,
  sprinkles: 150,
  pearls: 250,
  macarons: 450,
  flowers: 550,
};

export const SYRUPS: Syrup[] = [
  { id: "none", label: "কোনো না", price: 0 },
  { id: "vanilla", label: "ভ্যানিলা", price: 100 },
  { id: "chocolate", label: "চকোলেট", price: 120 },
  { id: "strawberry", label: "স্ট্রবেরি", price: 120 },
  { id: "coffee", label: "কফি", price: 130 },
  { id: "honey", label: "মধু", price: 150 },
  { id: "rose", label: "গোলাপ", price: 140 },
];

/** Get syrup price from settings or fallback to defaults */
export function getSyrupPrice(syrupId: string, settings?: { syrup_prices?: Record<string, number> }): number {
  if (settings?.syrup_prices && syrupId in settings.syrup_prices) {
    return settings.syrup_prices[syrupId];
  }
  return DEFAULT_SYRUP_PRICES[syrupId] ?? 0;
}

/** Get crown price from settings or fallback to defaults */
export function getCrownPrice(crownId: string, settings?: { crown_prices?: Record<string, number> }): number {
  if (settings?.crown_prices && crownId in settings.crown_prices) {
    return settings.crown_prices[crownId];
  }
  return DEFAULT_CROWN_PRICES[crownId] ?? 0;
}

/** Get extra tier fee from settings or fallback to default */
export function getTierFeeValue(settings?: { extra_tier_fee?: number }): number {
  return settings?.extra_tier_fee ?? EXTRA_TIER_FEE;
}

/** Tier count implied by an order weight — mirrors the 3D preview. */
export function tiersForWeight(weight: number): number {
  return weight <= 1 ? 1 : weight <= 2 ? 2 : 3;
}

export function crownById(id: string | null | undefined): Crown | undefined {
  return CROWNS.find((c) => c.id === id);
}

export function syrupById(id: string | null | undefined): Syrup | undefined {
  return SYRUPS.find((s) => s.id === id);
}

export function finishForColor(color: string | null | undefined): Finish | undefined {
  if (!color) return undefined;
  const needle = color.toLowerCase();
  return FINISHES.find((f) => f.color.toLowerCase() === needle);
}

export function finishNameFor(color: string | null | undefined): string {
  return finishForColor(color)?.label ?? "কাস্টম";
}

export function crownLabel(id: string | null | undefined): string {
  return crownById(id)?.label ?? "কোনো না";
}

export function syrupLabel(id: string | null | undefined): string {
  return syrupById(id)?.label ?? "কোনো না";
}

/**
 * Up-charge for tiers above the weight-implied baseline (never negative).
 *
 * A 3 lb cake already includes 3 tiers, so choosing 3 tiers costs nothing —
 * only the tiers ABOVE the weight baseline are charged. `weight` is therefore
 * part of the price, not decorative: ignoring it made the server charge more
 * than the live quote the customer saw.
 */
export function tierExtraFee(
  tiers: number | undefined,
  weight: number | undefined,
  settings?: { extra_tier_fee?: number },
): number {
  if (tiers == null) return 0;
  const baseline = weight == null ? 1 : tiersForWeight(weight);
  return Math.max(0, tiers - baseline) * getTierFeeValue(settings);
}

/** Loose view of custom_spec — structurally compatible with the zod output. */
export interface CustomExtrasSpec {
  tiers?: number;
  decoration?: string | null;
  syrup?: string | null;
}

/**
 * Add-ons on top of the size price: extra tiers + crown + syrup.
 *
 * Used by the client for the live quote and by `placeOrderAction` for the
 * authoritative charge — both must always return the same number.
 */
export function customExtras(
  spec: CustomExtrasSpec | null | undefined,
  weight: number | undefined,
  settings?: { extra_tier_fee?: number; crown_prices?: Record<string, number>; syrup_prices?: Record<string, number> },
): number {
  if (!spec) return 0;
  return (
    tierExtraFee(spec.tiers, weight, settings) +
    getCrownPrice(spec.decoration ?? "none", settings) +
    getSyrupPrice(spec.syrup ?? "none", settings)
  );
}
