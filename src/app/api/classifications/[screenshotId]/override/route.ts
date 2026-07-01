import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { isValidAxisA, isValidAxisB, TAXONOMY_VERSION } from "@/lib/taxonomy";

const ACTIONS = new Set(["add", "remove", "set_primary"]);

// POST /api/classifications/[screenshotId]/override — the §8 human-in-the-loop
// write. Persists an authoritative LabelOverride (keyed by screenshot, so it
// survives re-classification and taxonomy bumps) and re-applies the correction
// to the CURRENT ClassificationLabel rows so the UI reflects it immediately.
// LabelOverride rows are only ever upserted here — never deleted/mutated by the
// classifier.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenshotId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 401 });

  const { screenshotId } = await params;

  let body: {
    axis?: string;
    label?: string;
    action?: string;
    confidence?: number;
    reviewedBy?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { axis, label, action, confidence, reviewedBy, note } = body;

  if (axis !== "A" && axis !== "B") {
    return NextResponse.json({ error: "axis must be 'A' or 'B'" }, { status: 400 });
  }
  if (!label || (axis === "A" ? !isValidAxisA(label) : !isValidAxisB(label))) {
    return NextResponse.json(
      { error: `Invalid label for axis ${axis}: ${label}` },
      { status: 400 }
    );
  }
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "action must be add | remove | set_primary" },
      { status: 400 }
    );
  }

  const screenshot = await prisma.screenshot.findUnique({
    where: { id: screenshotId },
    select: { id: true },
  });
  if (!screenshot) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  // 1) Persist the authoritative override (idempotent on the unique key).
  const override = await prisma.labelOverride.upsert({
    where: {
      screenshotId_axis_label_action: { screenshotId, axis, label, action },
    },
    create: {
      screenshotId,
      axis,
      label,
      action,
      confidence: confidence ?? null,
      reviewedBy: reviewedBy ?? null,
      note: note ?? null,
    },
    update: {
      confidence: confidence ?? null,
      reviewedBy: reviewedBy ?? null,
      note: note ?? null,
    },
  });

  // 2) Re-apply the correction to the CURRENT classification's label rows.
  const classification = await prisma.screenshotClassification.findUnique({
    where: {
      screenshotId_taxonomyVersion: { screenshotId, taxonomyVersion: TAXONOMY_VERSION },
    },
    include: { labels: true },
  });

  if (classification) {
    const axisLabels = classification.labels.filter((l) => l.axis === axis);
    const existing = axisLabels.find((l) => l.label === label);

    await prisma.$transaction(async (tx) => {
      if (action === "add") {
        if (!existing) {
          await tx.classificationLabel.create({
            data: {
              classificationId: classification.id,
              axis,
              label,
              isPrimary: false,
              confidence: confidence ?? 1,
            },
          });
        }
      } else if (action === "remove") {
        if (existing) {
          await tx.classificationLabel.delete({ where: { id: existing.id } });
          // If we removed the primary, promote the next-highest-confidence label.
          if (existing.isPrimary) {
            const next = axisLabels
              .filter((l) => l.id !== existing.id)
              .sort((a, b) => b.confidence - a.confidence)[0];
            if (next) {
              await tx.classificationLabel.update({
                where: { id: next.id },
                data: { isPrimary: true },
              });
            }
          }
        }
      } else if (action === "set_primary") {
        // Demote all same-axis labels, then promote (creating if needed).
        await tx.classificationLabel.updateMany({
          where: { classificationId: classification.id, axis },
          data: { isPrimary: false },
        });
        if (existing) {
          await tx.classificationLabel.update({
            where: { id: existing.id },
            data: { isPrimary: true },
          });
        } else {
          await tx.classificationLabel.create({
            data: {
              classificationId: classification.id,
              axis,
              label,
              isPrimary: true,
              confidence: confidence ?? 1,
            },
          });
        }
      }
    });
  }

  return NextResponse.json({ ok: true, override }, { status: 201 });
}
