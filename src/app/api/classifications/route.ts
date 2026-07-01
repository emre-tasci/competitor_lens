import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPresignedScreenshotUrl } from "@/lib/s3";
import { buildWhere, parseFilters } from "@/lib/classification-query";

// GET /api/classifications — faceted search read-model.
// Matches against ClassificationLabel rows so SECONDARY labels count.
export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  const where = buildWhere(filters);

  const [total, rows] = await Promise.all([
    prisma.screenshotClassification.count({ where }),
    prisma.screenshotClassification.findMany({
      where,
      include: {
        labels: {
          select: { axis: true, label: true, isPrimary: true, confidence: true },
        },
        screenshot: { include: { exchange: { select: { name: true } } } },
      },
      orderBy: [{ needsReview: "desc" }, { classifiedAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  const items = await Promise.all(
    rows.map(async (r) => {
      let thumbUrl: string | null = null;
      try {
        thumbUrl = await getPresignedScreenshotUrl(r.screenshot.s3Url);
      } catch {
        thumbUrl = null;
      }
      const labels = r.labels;
      return {
        screenshotId: r.screenshotId,
        sourceApp: r.sourceApp,
        exchangeName: r.screenshot.exchange?.name ?? null,
        capturedPlatform: r.capturedPlatform,
        language: r.language,
        overlayPresent: r.overlayPresent,
        needsReview: r.needsReview,
        reviewReason: r.reviewReason,
        classifiedAt: r.classifiedAt,
        thumbUrl,
        primaryA: labels.find((l) => l.axis === "A" && l.isPrimary)?.label ?? null,
        primaryB: labels.find((l) => l.axis === "B" && l.isPrimary)?.label ?? null,
        labels,
      };
    })
  );

  return NextResponse.json({
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    items,
  });
}
