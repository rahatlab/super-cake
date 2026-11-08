"use client";

import { AnimIcon } from "@/components/ui/anim-icon";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBDT } from "@/lib/utils";
import type { BarDatum, PieDatum } from "./charts";

/** Shared color palette for every admin pie chart. */
export const CHART_PALETTE = [
  "#F43F5E",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
];

const TOOLTIP_STYLE = {
  borderRadius: "0.75rem",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--bg-elevated))",
  color: "hsl(var(--fg))",
  fontSize: "0.85rem",
  boxShadow: "var(--shadow-soft)",
} as const;

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center gap-2 py-12 text-center">
      <AnimIcon name="cake" className="h-8 w-8" aria-hidden />
      <p className="text-sm font-semibold text-muted">{text}</p>
    </div>
  );
}

export function PieStat({
  title,
  data,
  emptyText = "এখনো কোনো ডেটা নেই 🍰",
}: {
  title: string;
  data: PieDatum[];
  emptyText?: string;
}) {
  const clean = (data ?? []).filter((d) => d && d.value > 0);

  return (
    <section className="card p-5" aria-label={title}>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {clean.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={clean}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                strokeWidth={0}
              >
                {clean.map((d, i) => (
                  <Cell key={d.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "0.78rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function BarStat({
  title,
  data,
  emptyText = "রিভিউনিউ এখনো আসেনি 📈",
}: {
  title: string;
  data: BarDatum[];
  emptyText?: string;
}) {
  const clean = data ?? [];

  return (
    <section className="card p-5" aria-label={title}>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {clean.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clean} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted))" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted))" }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => `৳${v}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "hsl(var(--brand) / 0.08)" }}
                formatter={(value) => [formatBDT(Number(value)), "রিভিউনিউ"]}
              />
              <Bar dataKey="revenue" fill={CHART_PALETTE[3]} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
