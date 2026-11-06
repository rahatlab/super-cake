"use client";

import dynamic from "next/dynamic";

/**
 * `recharts` is ~380 kB of JS and is only needed on the admin overview, behind
 * a login. Keeping the import static meant every route that touched the admin
 * bundle shipped it eagerly. The real chart lives in `charts-inner.tsx` and is
 * fetched on demand, client-side only.
 */

export interface PieDatum {
  name: string;
  value: number;
}

export interface BarDatum {
  day: string;
  revenue: number;
}

function ChartSkeleton() {
  return (
    <section className="card p-5" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="skeleton mb-3 h-4 w-40" />
      <div className="skeleton h-64 w-full" />
    </section>
  );
}

const PieStatImpl = dynamic(() => import("./charts-inner").then((m) => m.PieStat), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const BarStatImpl = dynamic(() => import("./charts-inner").then((m) => m.BarStat), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export function PieStat(props: { title: string; data: PieDatum[]; emptyText?: string }) {
  return <PieStatImpl {...props} />;
}

export function BarStat(props: { title: string; data: BarDatum[]; emptyText?: string }) {
  return <BarStatImpl {...props} />;
}
