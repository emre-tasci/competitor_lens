import type { Prisma } from "@prisma/client";
import {
  TAXONOMY_VERSION,
  AXIS_A_LABELS,
  AXIS_B_LABELS,
  displayLabel,
} from "@/lib/taxonomy";

export type MatchMode = "and" | "or";

export interface ClassificationFilters {
  axisA: string[];
  axisB: string[];
  sourceApp: string[];
  platform: string[];
  language: string[];
  overlay: boolean | null;
  needsReview: boolean | null;
  minConfidence: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  q: string | null;
  matchA: MatchMode;
  matchB: MatchMode;
  page: number;
  pageSize: number;
}

function getBool(v: string | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/** Parse the shared faceted-search query string into a typed filter object. */
export function parseFilters(sp: URLSearchParams): ClassificationFilters {
  const num = (v: string | null): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    axisA: sp.getAll("axisA").filter(Boolean),
    axisB: sp.getAll("axisB").filter(Boolean),
    sourceApp: sp.getAll("sourceApp").filter(Boolean),
    platform: sp.getAll("platform").filter(Boolean),
    language: sp.getAll("language").filter(Boolean),
    overlay: getBool(sp.get("overlay")),
    needsReview: getBool(sp.get("needsReview")),
    minConfidence: num(sp.get("minConfidence")),
    dateFrom: sp.get("dateFrom") || null,
    dateTo: sp.get("dateTo") || null,
    q: (sp.get("q") || "").trim() || null,
    matchA: sp.get("matchA") === "and" ? "and" : "or",
    matchB: sp.get("matchB") === "and" ? "and" : "or",
    page: Math.max(1, num(sp.get("page")) ?? 1),
    pageSize: Math.min(120, Math.max(1, num(sp.get("pageSize")) ?? 48)),
  };
}

/** Resolve a free-text query to matching label slugs (by slug or display name). */
export function matchLabelSlugs(q: string): string[] {
  const needle = q.toLowerCase();
  return [...AXIS_A_LABELS, ...AXIS_B_LABELS].filter(
    (slug) =>
      slug.toLowerCase().includes(needle) ||
      displayLabel(slug).toLowerCase().includes(needle)
  );
}

/**
 * Build the Prisma `where` for `ScreenshotClassification`, scoped to the current
 * taxonomy version. Label filters match against `ClassificationLabel` rows so
 * SECONDARY labels are always included, per the contract. Per-axis AND requires
 * every selected label (N `some` clauses); OR requires any (`label: { in }`).
 */
export function buildWhere(
  f: ClassificationFilters
): Prisma.ScreenshotClassificationWhereInput {
  const and: Prisma.ScreenshotClassificationWhereInput[] = [];

  const axisClause = (axis: "A" | "B", labels: string[], mode: MatchMode) => {
    if (labels.length === 0) return;
    if (mode === "and") {
      for (const label of labels) {
        and.push({ labels: { some: { axis, label } } });
      }
    } else {
      and.push({ labels: { some: { axis, label: { in: labels } } } });
    }
  };

  axisClause("A", f.axisA, f.matchA);
  axisClause("B", f.axisB, f.matchB);

  if (f.sourceApp.length) and.push({ sourceApp: { in: f.sourceApp } });
  if (f.platform.length) and.push({ capturedPlatform: { in: f.platform } });
  if (f.language.length) and.push({ language: { in: f.language } });
  if (f.overlay !== null) and.push({ overlayPresent: f.overlay });
  if (f.needsReview !== null) and.push({ needsReview: f.needsReview });

  if (f.minConfidence != null) {
    and.push({
      labels: { some: { isPrimary: true, confidence: { gte: f.minConfidence } } },
    });
  }

  if (f.dateFrom || f.dateTo) {
    const classifiedAt: Prisma.DateTimeFilter = {};
    if (f.dateFrom) classifiedAt.gte = new Date(f.dateFrom);
    if (f.dateTo) {
      // inclusive end-of-day
      const to = new Date(f.dateTo);
      to.setHours(23, 59, 59, 999);
      classifiedAt.lte = to;
    }
    and.push({ classifiedAt });
  }

  if (f.q) {
    const slugs = matchLabelSlugs(f.q);
    const words = f.q.split(/\s+/).filter(Boolean);
    and.push({
      OR: [
        { sourceApp: { contains: f.q, mode: "insensitive" } },
        { rationale: { contains: f.q, mode: "insensitive" } },
        { salientText: { hasSome: words } },
        ...(slugs.length ? [{ labels: { some: { label: { in: slugs } } } }] : []),
      ],
    });
  }

  return { taxonomyVersion: TAXONOMY_VERSION, AND: and };
}
