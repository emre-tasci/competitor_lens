import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildWhere, parseFilters } from "@/lib/classification-query";

// GET /api/classifications/facets — live per-label counts for the active filter
// set. Counts come from ClassificationLabel rows, so a multi-label screenshot is
// counted under EVERY label it carries (primary or secondary).
export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  const where = buildWhere(filters);

  const toMap = (rows: { label: string | null; _count: { _all: number } }[]) => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r.label != null) m[r.label] = r._count._all;
    return m;
  };

  const [axisARows, axisBRows, appRows, platRows, langRows, overlayRows, reviewRows, total] =
    await Promise.all([
      prisma.classificationLabel.groupBy({
        by: ["label"],
        where: { axis: "A", classification: where },
        _count: { _all: true },
      }),
      prisma.classificationLabel.groupBy({
        by: ["label"],
        where: { axis: "B", classification: where },
        _count: { _all: true },
      }),
      prisma.screenshotClassification.groupBy({
        by: ["sourceApp"],
        where,
        _count: { _all: true },
      }),
      prisma.screenshotClassification.groupBy({
        by: ["capturedPlatform"],
        where,
        _count: { _all: true },
      }),
      prisma.screenshotClassification.groupBy({
        by: ["language"],
        where,
        _count: { _all: true },
      }),
      prisma.screenshotClassification.groupBy({
        by: ["overlayPresent"],
        where,
        _count: { _all: true },
      }),
      prisma.screenshotClassification.groupBy({
        by: ["needsReview"],
        where,
        _count: { _all: true },
      }),
      prisma.screenshotClassification.count({ where }),
    ]);

  const dimMap = (rows: { _count: { _all: number } }[], key: string) => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const v = (r as Record<string, unknown>)[key];
      const k = v == null ? "unknown" : String(v);
      m[k] = r._count._all;
    }
    return m;
  };

  return NextResponse.json({
    total,
    axisA: toMap(axisARows),
    axisB: toMap(axisBRows),
    sourceApp: dimMap(appRows, "sourceApp"),
    platform: dimMap(platRows, "capturedPlatform"),
    language: dimMap(langRows, "language"),
    overlay: dimMap(overlayRows, "overlayPresent"),
    needsReview: dimMap(reviewRows, "needsReview"),
  });
}
