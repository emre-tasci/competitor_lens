"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/PageHeader";
import { ScreensSubnav } from "./ScreensSubnav";
import { FilterRail } from "./FilterRail";
import { ScreenGrid } from "./ScreenGrid";
import {
  emptyFilters,
  filtersToQuery,
  activeFilterCount,
  type Filters,
  type FacetCounts,
  type ScreenItem,
} from "./types";

function parseFiltersFromUrl(): Filters {
  if (typeof window === "undefined") return emptyFilters;
  const p = new URLSearchParams(window.location.search);
  const bool = (k: string): boolean | null =>
    p.get(k) === "true" ? true : p.get(k) === "false" ? false : null;
  return {
    ...emptyFilters,
    q: p.get("q") ?? "",
    axisA: p.getAll("axisA"),
    axisB: p.getAll("axisB"),
    sourceApp: p.getAll("sourceApp"),
    platform: p.getAll("platform"),
    language: p.getAll("language"),
    overlay: bool("overlay"),
    needsReview: bool("needsReview"),
    minConfidence: Number(p.get("minConfidence") ?? 0) || 0,
    dateFrom: p.get("dateFrom") ?? "",
    dateTo: p.get("dateTo") ?? "",
    matchA: p.get("matchA") === "and" ? "and" : "or",
    matchB: p.get("matchB") === "and" ? "and" : "or",
  };
}

export function ScreensExplorer({ initialNeedsReview }: { initialNeedsReview?: boolean }) {
  // Start from empty on both server + first client render (avoids hydration
  // mismatch), then hydrate from the shareable URL in an effect below.
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [hydrated, setHydrated] = useState(false);
  const [facets, setFacets] = useState<FacetCounts | null>(null);
  const [items, setItems] = useState<ScreenItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);

  const queryKey = useMemo(() => filtersToQuery(filters), [filters]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate filters from the URL once, on mount.
  useEffect(() => {
    const base = parseFiltersFromUrl();
    if (initialNeedsReview && base.needsReview === null) base.needsReview = true;
    setFilters(base);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL shareable.
  useEffect(() => {
    if (!hydrated) return;
    const qs = queryKey;
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [queryKey, hydrated]);

  // Fetch page 1 + facets whenever the filter set changes (debounced for typing).
  useEffect(() => {
    if (!hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [res, facetRes] = await Promise.all([
          fetch(`/api/classifications?${queryKey}&page=1&pageSize=48`),
          fetch(`/api/classifications/facets?${queryKey}`),
        ]);
        const data = await res.json();
        const facetData = await facetRes.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(1);
        setFacets(facetData);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, filters.q ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, hydrated]);

  const loadMore = useCallback(async () => {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/classifications?${queryKey}&page=${next}&pageSize=48`);
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }, [page, totalPages, loadingMore, queryKey]);

  const onChange = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);
  const onClear = useCallback(() => setFilters(emptyFilters), []);

  const rail = (
    <FilterRail filters={filters} facets={facets} onChange={onChange} onClear={onClear} />
  );

  const active = activeFilterCount(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ekran Konsolu"
        title="Ekran Arşivi"
        description="İki eksende sınıflandırılmış uygulama ekranlarını filtreleyin, inceleyin ve düzeltin."
        meta={
          <span className="text-sm text-muted-foreground tabular-nums">
            {loading ? "Yükleniyor…" : `${total.toLocaleString("tr-TR")} ekran`}
            {facets ? ` · ${Object.keys(facets.sourceApp).length} uygulama` : ""}
          </span>
        }
        action={
          <a
            href={`/api/classifications/export?${queryKey}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </a>
        }
      />

      <ScreensSubnav />

      {/* Mobile filter trigger */}
      <div className="lg:hidden">
        <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtreler
              {active > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground tabular-nums">
                  {active}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-4">
            <SheetTitle className="mb-2">Filtreler</SheetTitle>
            {rail}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        {/* Desktop rail */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
            {rail}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <ScreenGrid items={items} loading={loading} />

          {items.length > 0 && page < totalPages && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore
                  ? "Yükleniyor…"
                  : `Daha fazla (${items.length.toLocaleString("tr-TR")} / ${total.toLocaleString("tr-TR")})`}
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
