"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AXIS_A_AREAS, AXIS_B_GROUPS, displayLabel } from "@/lib/taxonomy";
import { ScreensSubnav } from "./ScreensSubnav";
import { ScreenGrid } from "./ScreenGrid";
import type { ScreenItem } from "./types";

function titleCase(s: string) {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface PatternGroup {
  sourceApp: string;
  count: number;
  items: {
    screenshotId: string;
    thumbUrl: string | null;
    exchangeName: string | null;
    isPrimaryHere: boolean;
    primaryA: string | null;
    primaryB: string | null;
  }[];
}

export function PatternExplorer() {
  const [axis, setAxis] = useState<"A" | "B">("B");
  const [label, setLabel] = useState<string>("ui:bottom_sheet");
  const [groups, setGroups] = useState<PatternGroup[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const options = useMemo(() => {
    if (axis === "A") {
      return Object.entries(AXIS_A_AREAS).map(([area, screens]) => ({
        group: titleCase(area),
        slugs: screens.map((s) => `${area}:${s}`),
      }));
    }
    return (["base", "overlay", "state"] as const).map((g) => ({
      group: { base: "Temel", overlay: "Katman", state: "Durum" }[g],
      slugs: AXIS_B_GROUPS[g],
    }));
  }, [axis]);

  useEffect(() => {
    if (!label) return;
    setLoading(true);
    const param = axis === "A" ? `axisA=${encodeURIComponent(label)}` : `axisB=${encodeURIComponent(label)}`;
    fetch(`/api/classifications/pattern?${param}`)
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [axis, label]);

  function switchAxis(next: "A" | "B") {
    setAxis(next);
    setLabel(next === "A" ? "deposit:address_qr" : "ui:bottom_sheet");
    setGroups(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ekran Konsolu"
        title="Çapraz Uygulama Desenleri"
        description="Tek bir ekran tipini veya fonksiyonu tüm uygulamalar arasında yan yana karşılaştırın."
      />
      <ScreensSubnav />

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="inline-flex overflow-hidden rounded-lg border text-sm">
          {(["B", "A"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => switchAxis(a)}
              className={
                axis === a
                  ? "bg-foreground px-3 py-1.5 font-medium text-background"
                  : "px-3 py-1.5 text-muted-foreground hover:text-foreground"
              }
            >
              {a === "B" ? "UI Tipi" : "Fonksiyon"}
            </button>
          ))}
        </div>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          {options.map((o) => (
            <optgroup key={o.group} label={o.group}>
              {o.slugs.map((s) => (
                <option key={s} value={s}>
                  {displayLabel(s)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {loading ? "…" : `${total} ekran · ${groups?.length ?? 0} uygulama`}
        </span>
      </div>

      {loading && !groups && <div className="h-64 animate-pulse rounded-xl border bg-muted" />}

      {groups && groups.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Bu etiketi taşıyan ekran bulunamadı.
        </div>
      )}

      <div className="space-y-8">
        {groups?.map((g) => {
          const items: ScreenItem[] = g.items.map((it) => ({
            screenshotId: it.screenshotId,
            sourceApp: g.sourceApp,
            exchangeName: it.exchangeName,
            capturedPlatform: null,
            language: null,
            overlayPresent: false,
            needsReview: false,
            classifiedAt: "",
            thumbUrl: it.thumbUrl,
            primaryA: it.primaryA,
            primaryB: it.primaryB,
            labels: [],
          }));
          return (
            <section key={g.sourceApp}>
              <div className="section-head mb-3">
                <span className="text-base font-semibold text-foreground">{g.sourceApp}</span>
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  {g.count}
                </span>
              </div>
              <ScreenGrid items={items} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
