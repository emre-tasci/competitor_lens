import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPresignedScreenshotUrl } from "@/lib/s3";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";

// GET /api/classifications/[screenshotId] — full detail record for one screenshot.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ screenshotId: string }> }
) {
  const { screenshotId } = await params;

  const record = await prisma.screenshotClassification.findUnique({
    where: {
      screenshotId_taxonomyVersion: {
        screenshotId,
        taxonomyVersion: TAXONOMY_VERSION,
      },
    },
    include: {
      labels: {
        orderBy: [{ axis: "asc" }, { isPrimary: "desc" }, { confidence: "desc" }],
      },
      screenshot: { include: { exchange: { select: { name: true } } } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const overrides = await prisma.labelOverride.findMany({
    where: { screenshotId },
    orderBy: { createdAt: "desc" },
  });

  let imageUrl: string | null = null;
  try {
    imageUrl = await getPresignedScreenshotUrl(record.screenshot.s3Url);
  } catch {
    imageUrl = null;
  }

  return NextResponse.json({
    screenshotId: record.screenshotId,
    exchangeName: record.screenshot.exchange?.name ?? null,
    contentHash: record.contentHash,
    taxonomyVersion: record.taxonomyVersion,
    sourceApp: record.sourceApp,
    sourceAppConfidence: record.sourceAppConfidence,
    capturedPlatform: record.capturedPlatform,
    language: record.language,
    modelTier: record.modelTier,
    modelName: record.modelName,
    modelMode: record.modelMode,
    overlayPresent: record.overlayPresent,
    salientText: record.salientText,
    rationale: record.rationale,
    needsReview: record.needsReview,
    reviewReason: record.reviewReason,
    classifiedAt: record.classifiedAt,
    imageUrl,
    labels: record.labels.map((l) => ({
      id: l.id,
      axis: l.axis,
      label: l.label,
      isPrimary: l.isPrimary,
      confidence: l.confidence,
    })),
    overrides: overrides.map((o) => ({
      id: o.id,
      axis: o.axis,
      label: o.label,
      action: o.action,
      confidence: o.confidence,
      reviewedBy: o.reviewedBy,
      note: o.note,
      createdAt: o.createdAt,
    })),
  });
}
