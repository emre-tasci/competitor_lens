"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ScreensSubnav } from "./ScreensSubnav";

interface Row {
  label: string;
  area: string | null;
  display: string;
  total: number;
  cells: Record<string, number>;
}
interface MatrixData {
  apps: string[];
  totalsByApp: Record<string, number>;
  rows: Row[];
  coverage: { screensCovered: number; screensTotal: number };
}

function titleCase(s: string) {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Discrete red-wash heatmap. Static class literals so Tailwind's scanner emits
// them (dynamic string concatenation would be dropped at build time).
function heat(count: number, max: number): string {
  if (!count) return "";
  const ratio = Math.min(1, count / Math.max(1, max));
  if (ratio < 0.15) return "bg-primary/5";
  if (ratio < 0.35) return "bg-primary/10";
  if (ratio < 0.6) return "bg-primary/20";
  return "bg-primary/30";
}

export function CoverageMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/classifications/coverage-matrix")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const max = data
    ? Math.max(1, ...data.rows.flatMap((r) => Object.values(r.cells)))
    : 1;

  // group rows by area, preserving row order
  const groups: { area: string; rows: Row[] }[] = [];
  if (data) {
    for (const row of data.rows) {
      const area = row.area ?? "unclassified";
      const last = groups[groups.length - 1];
      if (last && last.area === area) last.rows.push(row);
      else groups.push({ area, rows: [row] });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ekran Konsolu"
        title="Kapsam Matrisi"
        description="Hangi fonksiyonel ekran hangi uygulamada yakalandı? Boşluklar kapsama açıklarını gösterir."
        meta={
          data && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.coverage.screensCovered} / {data.coverage.screensTotal} ekran tipi kapsandı
              · {data.apps.length} uygulama
            </span>
          )
        }
      />
      <ScreensSubnav />

      {loading && <div className="h-96 animate-pulse rounded-xl border bg-muted" />}

      {data && (
        <>
          <p className="text-xs text-muted-foreground md:hidden">Yatay kaydırın →</p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="sticky left-0 z-10 min-w-[180px] border-b bg-muted/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ekran
                  </th>
                  {data.apps.map((app) => (
                    <th
                      key={app}
                      className="border-b px-2 py-2 text-center text-xs font-medium text-foreground"
                      title={app}
                    >
                      <span className="block max-w-[90px] truncate">{app}</span>
                    </th>
                  ))}
                  <th className="border-b border-l px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                    Σ
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.area}>
                    <tr>
                      <td
                        colSpan={data.apps.length + 2}
                        className="sticky left-0 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80"
                      >
                        {titleCase(g.area)}
                      </td>
                    </tr>
                    {g.rows.map((row) => (
                      <tr key={row.label} className="group hover:bg-accent/40">
                        <th className="sticky left-0 z-10 border-b bg-background px-3 py-1.5 text-left text-xs font-normal text-foreground group-hover:bg-accent/40">
                          {row.display.split(" / ")[1] ?? row.display}
                        </th>
                        {data.apps.map((app) => {
                          const c = row.cells[app] ?? 0;
                          return (
                            <td
                              key={app}
                              className={`border-b border-border/60 p-0 text-center ${heat(c, max)}`}
                            >
                              {c > 0 ? (
                                <Link
                                  href={`/screens?axisA=${encodeURIComponent(
                                    row.label
                                  )}&sourceApp=${encodeURIComponent(app)}`}
                                  className="block px-2 py-1.5 font-mono text-xs tabular-nums text-foreground hover:underline"
                                >
                                  {c}
                                </Link>
                              ) : (
                                <span className="block px-2 py-1.5 text-xs text-muted-foreground/30">
                                  ·
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-l px-2 py-1.5 text-center font-mono text-xs font-medium tabular-nums text-foreground">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-medium">
                  <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    Toplam
                  </th>
                  {data.apps.map((app) => (
                    <td
                      key={app}
                      className="px-2 py-2 text-center font-mono text-xs tabular-nums text-foreground"
                    >
                      {data.totalsByApp[app] ?? 0}
                    </td>
                  ))}
                  <td className="border-l px-2 py-2 text-center font-mono text-xs tabular-nums text-foreground">
                    {Object.values(data.totalsByApp).reduce((a, b) => a + b, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
