export interface ScreenLabel {
  axis: string;
  label: string;
  isPrimary: boolean;
  confidence?: number;
}

export interface ScreenItem {
  screenshotId: string;
  sourceApp: string | null;
  exchangeName: string | null;
  capturedPlatform: string | null;
  language: string | null;
  overlayPresent: boolean;
  needsReview: boolean;
  reviewReason?: string | null;
  classifiedAt: string;
  thumbUrl: string | null;
  primaryA: string | null;
  primaryB: string | null;
  labels: ScreenLabel[];
}

export type MatchMode = "and" | "or";

export interface Filters {
  q: string;
  axisA: string[];
  axisB: string[];
  sourceApp: string[];
  platform: string[];
  language: string[];
  overlay: boolean | null;
  needsReview: boolean | null;
  minConfidence: number;
  dateFrom: string;
  dateTo: string;
  matchA: MatchMode;
  matchB: MatchMode;
}

export const emptyFilters: Filters = {
  q: "",
  axisA: [],
  axisB: [],
  sourceApp: [],
  platform: [],
  language: [],
  overlay: null,
  needsReview: null,
  minConfidence: 0,
  dateFrom: "",
  dateTo: "",
  matchA: "or",
  matchB: "or",
};

export interface FacetCounts {
  total: number;
  axisA: Record<string, number>;
  axisB: Record<string, number>;
  sourceApp: Record<string, number>;
  platform: Record<string, number>;
  language: Record<string, number>;
  overlay: Record<string, number>;
  needsReview: Record<string, number>;
}

/** Serialize filters into the shared API query string. */
export function filtersToQuery(f: Filters, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  f.axisA.forEach((v) => p.append("axisA", v));
  f.axisB.forEach((v) => p.append("axisB", v));
  f.sourceApp.forEach((v) => p.append("sourceApp", v));
  f.platform.forEach((v) => p.append("platform", v));
  f.language.forEach((v) => p.append("language", v));
  if (f.overlay !== null) p.set("overlay", String(f.overlay));
  if (f.needsReview !== null) p.set("needsReview", String(f.needsReview));
  if (f.minConfidence > 0) p.set("minConfidence", String(f.minConfidence));
  if (f.dateFrom) p.set("dateFrom", f.dateFrom);
  if (f.dateTo) p.set("dateTo", f.dateTo);
  if (f.axisA.length) p.set("matchA", f.matchA);
  if (f.axisB.length) p.set("matchB", f.matchB);
  if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.q ? 1 : 0) +
    f.axisA.length +
    f.axisB.length +
    f.sourceApp.length +
    f.platform.length +
    f.language.length +
    (f.overlay !== null ? 1 : 0) +
    (f.needsReview !== null ? 1 : 0) +
    (f.minConfidence > 0 ? 1 : 0) +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0)
  );
}
