import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { buildWhere, parseFilters } from "@/lib/classification-query";

// GET /api/classifications/export — CSV of the current filtered set (same query
// params as /api/classifications). Guarded like the write routes.
//
// Note: the image-zip half of the §8 export is intentionally omitted here to
// avoid pulling in a new zip dependency (add-only constraint). The CSV carries
// the S3 key per row so images can be resolved via /api/screenshots/image.
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 401 });

  const filters = parseFilters(request.nextUrl.searchParams);
  const where = buildWhere(filters);

  const rows = await prisma.screenshotClassification.findMany({
    where,
    include: {
      labels: { select: { axis: true, label: true, isPrimary: true, confidence: true } },
      screenshot: {
        select: { s3Url: true, exchange: { select: { name: true } } },
      },
    },
    orderBy: { classifiedAt: "desc" },
  });

  const header = [
    "screenshotId",
    "exchange",
    "sourceApp",
    "platform",
    "language",
    "overlayPresent",
    "needsReview",
    "reviewReason",
    "modelName",
    "modelTier",
    "modelMode",
    "taxonomyVersion",
    "classifiedAt",
    "axisA_primary",
    "axisA_secondary",
    "axisB_primary",
    "axisB_secondary",
    "salientText",
    "rationale",
    "s3Key",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const a = r.labels.filter((l) => l.axis === "A");
    const b = r.labels.filter((l) => l.axis === "B");
    const primary = (arr: typeof a) => arr.find((l) => l.isPrimary)?.label ?? "";
    const secondary = (arr: typeof a) =>
      arr.filter((l) => !l.isPrimary).map((l) => l.label).join(" | ");
    lines.push(
      [
        r.screenshotId,
        r.screenshot.exchange?.name ?? "",
        r.sourceApp ?? "",
        r.capturedPlatform ?? "",
        r.language ?? "",
        r.overlayPresent,
        r.needsReview,
        r.reviewReason ?? "",
        r.modelName,
        r.modelTier,
        r.modelMode,
        r.taxonomyVersion,
        r.classifiedAt.toISOString(),
        primary(a),
        secondary(a),
        primary(b),
        secondary(b),
        r.salientText.join(" | "),
        r.rationale,
        r.screenshot.s3Url,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="classifications-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
