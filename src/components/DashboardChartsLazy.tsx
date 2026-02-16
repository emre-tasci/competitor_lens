"use client";

import dynamic from "next/dynamic";

const DashboardChartsLoader = dynamic(
  () => import("@/components/DashboardCharts").then((mod) => mod.DashboardChartsLoader),
  { ssr: false }
);

export function DashboardChartsLazy() {
  return <DashboardChartsLoader />;
}
