import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";

// POST /api/classifications/[screenshotId]/resolve — mark a flagged screen as
// human-reviewed WITHOUT changing its labels ("looks fine, dismiss"). Clears
// needsReview so it leaves the İncelemeler queue.
//
// Durability: we anchor a marker LabelOverride (action "reviewed") on the current
// primary Axis-A label. That row is a no-op for the classifier's label logic, but
// its mere existence makes classify-runner persist needsReview=false on future
// runs (same mechanism as a real correction) — so a dismissed screen never
// re-flags on re-classification / taxonomy bumps.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenshotId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 401 });

  const { screenshotId } = await params;

  let body: { reviewedBy?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }
  const reviewedBy = body.reviewedBy ?? null;
  const note = body.note ?? null;

  const classification = await prisma.screenshotClassification.findUnique({
    where: {
      screenshotId_taxonomyVersion: { screenshotId, taxonomyVersion: TAXONOMY_VERSION },
    },
    include: { labels: true },
  });
  if (!classification) {
    return NextResponse.json({ error: "Classification not found" }, { status: 404 });
  }

  const primaryA =
    classification.labels.find((l) => l.axis === "A" && l.isPrimary) ??
    classification.labels.find((l) => l.axis === "A");

  await prisma.$transaction(async (tx) => {
    if (primaryA) {
      await tx.labelOverride.upsert({
        where: {
          screenshotId_axis_label_action: {
            screenshotId,
            axis: "A",
            label: primaryA.label,
            action: "reviewed",
          },
        },
        create: { screenshotId, axis: "A", label: primaryA.label, action: "reviewed", reviewedBy, note },
        update: { reviewedBy, note },
      });
    }
    await tx.screenshotClassification.update({
      where: { id: classification.id },
      data: { needsReview: false, reviewReason: "İnceleme tamamlandı — onaylandı" },
    });
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
