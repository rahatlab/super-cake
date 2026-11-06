/**
 * Fonts offered for the "message on cake" text, plus the swatches offered for
 * its colour. Shared by the order form (pickers) and the 3D preview (render),
 * so the two can never drift apart.
 */

export interface CakeFont {
  value: string;
  label: string;
  /** CSS font-family used in the preview. */
  family: string;
  /** Bonus multiplier — chunky faces need a little less size to fit. */
  scale: number;
}

export const CAKE_FONTS: CakeFont[] = [
  {
    value: "display",
    label: "Hind Siliguri",
    family: "var(--font-display), sans-serif",
    scale: 1,
  },
  {
    value: "serif",
    label: "Playfair",
    family: "var(--font-serif-display), serif",
    scale: 0.95,
  },
  {
    value: "script",
    label: "Pacifico",
    family: "var(--font-script), cursive",
    scale: 0.9,
  },
  {
    value: "lobster",
    label: "Lobster",
    family: "var(--font-lobster), cursive",
    scale: 0.9,
  },
  {
    value: "hand",
    label: "Caveat",
    family: "var(--font-handwritten), cursive",
    scale: 1.05,
  },
  {
    value: "block",
    label: "Bebas",
    family: "var(--font-block), sans-serif",
    scale: 1.15,
  },
];

export const DEFAULT_CAKE_FONT = CAKE_FONTS[0].value;

export function getCakeFont(value: string): CakeFont {
  return CAKE_FONTS.find((f) => f.value === value) ?? CAKE_FONTS[0];
}

/** Ink colours that actually read on a frosted cake. */
export const CAKE_TEXT_COLORS: { value: string; label: string }[] = [
  { value: "#2b2b2b", label: "Chocolate" },
  { value: "#ffffff", label: "Vanilla" },
  { value: "#c0182b", label: "Cherry" },
  { value: "#e0669b", label: "Rose" },
  { value: "#1f6fb2", label: "Blueberry" },
  { value: "#2f8f4e", label: "Pistachio" },
  { value: "#e0a800", label: "Lemon" },
  { value: "#8e44ad", label: "Berry" },
];
