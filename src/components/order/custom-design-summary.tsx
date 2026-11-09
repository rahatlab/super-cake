import { getCakeFont } from "@/lib/cake-fonts";
import { finishNameFor, syrupLabel } from "@/lib/custom-design";
import type { Order } from "@/lib/types";
import { AnimIcon } from "@/components/ui/anim-icon";

type Spec = NonNullable<Order["custom_spec"]>;

const SHAPE_LABELS: Record<NonNullable<Spec["cake_shape"]>, string> = {
  round: "বৃত্ত",
  square: "বর্গ",
  heart: "হার্ট",
  number: "নম্বর",
};

const DECORATION_LABELS: Record<NonNullable<Spec["decoration"]>, string> = {
  none: "কোনো না",
  pearls: "মোতি",
  macarons: "ম্যাকারন",
  flowers: "ফুল",
  sprinkles: "স্প্রিংকেল",
};

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>
        <strong>{label}:</strong> {color}
      </span>
    </span>
  );
}

/** True when the order carries any 3D design choice from /custom-order. */
export function hasCustomDesign(spec: Spec | null | undefined): boolean {
  if (!spec) return false;
  return Boolean(
    spec.design_image_url ||
    spec.cake_shape ||
      spec.frosting_color ||
      spec.message_font ||
      spec.message_color ||
      spec.tiers != null ||
      (spec.syrup && spec.syrup !== "none") ||
      (spec.decoration && spec.decoration !== "none"),
  );
}

/**
 * Compact read-only summary of the shape / frosting / decoration choices the
 * customer made in the 3D picker. Rendered by the admin order view and by the
 * customer-facing tracking panel so both stay in sync.
 */
export function CustomDesignSummary({ spec }: { spec: Spec }) {
  if (!hasCustomDesign(spec)) return null;

  return (
    <div className="mt-1 flex flex-wrap items-start gap-x-4 gap-y-2">
    {spec.design_image_url && (
      <a href={spec.design_image_url} target="_blank" rel="noopener noreferrer" className="shrink-0 self-start overflow-hidden rounded-xl border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spec.design_image_url} alt="3D ডিজাইন" className="h-20 w-20 object-cover" />
      </a>
    )}
    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
      {spec.cake_shape && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <AnimIcon name="cake" className="h-4 w-4 shrink-0" /> <strong>আকৃতি:</strong> {SHAPE_LABELS[spec.cake_shape]}
        </span>
      )}
      {spec.tiers != null && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <AnimIcon name="box" className="h-4 w-4 shrink-0" /> <strong>টিয়ার:</strong> {spec.tiers}
        </span>
      )}
      {spec.syrup && spec.syrup !== "none" && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <AnimIcon name="cake" className="h-4 w-4 shrink-0" /> <strong>সিরাপ:</strong> {syrupLabel(spec.syrup)}
        </span>
      )}
      {spec.decoration && spec.decoration !== "none" && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <AnimIcon name="sparkles" className="h-4 w-4 shrink-0" /> <strong>সাজসজ্জা:</strong> {DECORATION_LABELS[spec.decoration]}
        </span>
      )}
      {spec.frosting_color && (
        <Swatch color={spec.frosting_color} label={finishNameFor(spec.frosting_color)} />
      )}
      {spec.message_color && <Swatch color={spec.message_color} label="লেখার রঙ" />}
      {spec.message_font && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <AnimIcon name="note" className="h-4 w-4 shrink-0" /> <strong>ফন্ট:</strong> {getCakeFont(spec.message_font).label}
        </span>
      )}
    </p>
    </div>
  );
}
