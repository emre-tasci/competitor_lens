"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AXIS_A_AREAS, AXIS_B_GROUPS, displayLabel } from "@/lib/taxonomy";
import type { Filters, FacetCounts, MatchMode } from "./types";
import { activeFilterCount } from "./types";

function titleCase(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function AndOr({
  mode,
  onChange,
}: {
  mode: MatchMode;
  onChange: (m: MatchMode) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border text-[10px] font-medium">
      {(["or", "and"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "px-1.5 py-0.5 uppercase tracking-wide transition-colors",
            mode === m
              ? "bg-foreground text-background"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "or" ? "veya" : "ve"}
        </button>
      ))}
    </div>
  );
}

function TriState({
  value,
  onChange,
  labels,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  labels: [string, string, string]; // [any, yes, no]
}) {
  const opts: { v: boolean | null; t: string }[] = [
    { v: null, t: labels[0] },
    { v: true, t: labels[1] },
    { v: false, t: labels[2] },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border text-xs">
      {opts.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "px-2 py-1 transition-colors",
            value === o.v
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  action,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {title}
          </span>
          {count ? (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary tabular-nums">
              {count}
            </span>
          ) : null}
        </button>
        {action}
      </div>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count?: number;
}) {
  const disabled = !checked && count === 0;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/50",
        disabled && "cursor-default opacity-40 hover:bg-transparent"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        className="h-3.5 w-3.5 shrink-0 accent-primary"
      />
      <span className="flex-1 truncate text-foreground/90">{label}</span>
      {count != null && (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </label>
  );
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterRail({
  filters,
  facets,
  onChange,
  onClear,
}: {
  filters: Filters;
  facets: FacetCounts | null;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const active = activeFilterCount(filters);

  // Axis-A areas that have any matching data under the current facet set.
  const axisAByArea = Object.entries(AXIS_A_AREAS)
    .map(([area, screens]) => {
      const slugs = screens.map((s) => `${area}:${s}`);
      const present = slugs.filter(
        (slug) => (facets?.axisA[slug] ?? 0) > 0 || filters.axisA.includes(slug)
      );
      const total = present.reduce((n, slug) => n + (facets?.axisA[slug] ?? 0), 0);
      return { area, present, total };
    })
    .filter((a) => a.present.length > 0);

  const sortedKeys = (rec: Record<string, number> | undefined, selected: string[]) => {
    const keys = new Set<string>([...(rec ? Object.keys(rec) : []), ...selected]);
    return [...keys]
      .filter((k) => k !== "unknown" || (rec?.[k] ?? 0) > 0)
      .sort((a, b) => (rec?.[b] ?? 0) - (rec?.[a] ?? 0) || a.localeCompare(b));
  };

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Uygulama, metin, etiket ara…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {active > 0 ? `${active} filtre etkin` : "Filtre yok"}
        </span>
        {active > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            Temizle
          </button>
        )}
      </div>

      {/* Axis A — functional area */}
      <Section
        title="Fonksiyon (Eksen A)"
        count={filters.axisA.length}
        defaultOpen
        action={<AndOr mode={filters.matchA} onChange={(m) => onChange({ matchA: m })} />}
      >
        <div className="space-y-1">
          {axisAByArea.map(({ area, present, total }) => (
            <AreaGroup
              key={area}
              title={titleCase(area)}
              total={total}
              slugs={present}
              facets={facets?.axisA}
              selected={filters.axisA}
              defaultOpen={present.some((s) => filters.axisA.includes(s))}
              onToggle={(slug) => onChange({ axisA: toggle(filters.axisA, slug) })}
            />
          ))}
          {axisAByArea.length === 0 && (
            <p className="px-1.5 text-xs text-muted-foreground">Veri yok.</p>
          )}
        </div>
      </Section>

      {/* Axis B — UI screen type */}
      <Section
        title="UI Tipi (Eksen B)"
        count={filters.axisB.length}
        defaultOpen
        action={<AndOr mode={filters.matchB} onChange={(m) => onChange({ matchB: m })} />}
      >
        <div className="space-y-2.5">
          {(["base", "overlay", "state"] as const).map((group) => {
            const slugs = AXIS_B_GROUPS[group].filter(
              (s) => (facets?.axisB[s] ?? 0) > 0 || filters.axisB.includes(s)
            );
            if (slugs.length === 0) return null;
            const gLabel = { base: "Temel", overlay: "Katman", state: "Durum" }[group];
            return (
              <div key={group}>
                <p className="px-1.5 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {gLabel}
                </p>
                {slugs.map((slug) => (
                  <CheckRow
                    key={slug}
                    checked={filters.axisB.includes(slug)}
                    onToggle={() => onChange({ axisB: toggle(filters.axisB, slug) })}
                    label={displayLabel(slug).replace(/^UI: /, "")}
                    count={facets?.axisB[slug]}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Source app */}
      <Section title="Uygulama" count={filters.sourceApp.length} defaultOpen>
        {sortedKeys(facets?.sourceApp, filters.sourceApp).map((app) => (
          <CheckRow
            key={app}
            checked={filters.sourceApp.includes(app)}
            onToggle={() => onChange({ sourceApp: toggle(filters.sourceApp, app) })}
            label={app}
            count={facets?.sourceApp[app]}
          />
        ))}
      </Section>

      {/* Platform */}
      <Section title="Platform" count={filters.platform.length}>
        {sortedKeys(facets?.platform, filters.platform).map((p) => (
          <CheckRow
            key={p}
            checked={filters.platform.includes(p)}
            onToggle={() => onChange({ platform: toggle(filters.platform, p) })}
            label={p}
            count={facets?.platform[p]}
          />
        ))}
      </Section>

      {/* Language */}
      <Section title="Dil" count={filters.language.length}>
        {sortedKeys(facets?.language, filters.language).map((l) => (
          <CheckRow
            key={l}
            checked={filters.language.includes(l)}
            onToggle={() => onChange({ language: toggle(filters.language, l) })}
            label={l}
            count={facets?.language[l]}
          />
        ))}
      </Section>

      {/* Confidence */}
      <Section
        title="Min. Güven"
        count={filters.minConfidence > 0 ? 1 : 0}
        defaultOpen={filters.minConfidence > 0}
      >
        <div className="px-1.5">
          <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
            <span>Birincil etiket ≥</span>
            <span className="font-mono tabular-nums text-foreground">
              {Math.round(filters.minConfidence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={filters.minConfidence}
            onChange={(e) => onChange({ minConfidence: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </Section>

      {/* Overlay */}
      <Section title="Overlay" count={filters.overlay !== null ? 1 : 0}>
        <div className="px-1.5">
          <TriState
            value={filters.overlay}
            onChange={(v) => onChange({ overlay: v })}
            labels={["Hepsi", "Var", "Yok"]}
          />
        </div>
      </Section>

      {/* Needs review */}
      <Section title="İnceleme" count={filters.needsReview !== null ? 1 : 0}>
        <div className="px-1.5">
          <TriState
            value={filters.needsReview}
            onChange={(v) => onChange({ needsReview: v })}
            labels={["Hepsi", "Gerekli", "Değil"]}
          />
        </div>
      </Section>

      {/* Date range */}
      <Section
        title="Tarih"
        count={(filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
      >
        <div className="flex flex-col gap-2 px-1.5">
          <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Başlangıç</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ dateFrom: e.target.value })}
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Bitiş</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ dateTo: e.target.value })}
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
        </div>
      </Section>
    </div>
  );
}

function AreaGroup({
  title,
  total,
  slugs,
  facets,
  selected,
  defaultOpen,
  onToggle,
}: {
  title: string;
  total: number;
  slugs: string[];
  facets?: Record<string, number>;
  selected: string[];
  defaultOpen: boolean;
  onToggle: (slug: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeHere = slugs.filter((s) => selected.includes(s)).length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs font-medium text-foreground hover:bg-accent/50"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <span className="flex-1 truncate">{title}</span>
        {activeHere > 0 && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        )}
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {total}
        </span>
      </button>
      {open && (
        <div className="ml-3 border-l border-border pl-1.5">
          {slugs.map((slug) => (
            <CheckRow
              key={slug}
              checked={selected.includes(slug)}
              onToggle={() => onToggle(slug)}
              label={displayLabel(slug).split(" / ")[1] ?? displayLabel(slug)}
              count={facets?.[slug]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
