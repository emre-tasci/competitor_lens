import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPresignedScreenshotUrl } from "@/lib/s3";
import {
  TAXONOMY_VERSION,
  isValidAxisA,
  isValidAxisB,
} from "@/lib/taxonomy";

// GET /api/classifications/pattern?axisB=ui:bottom_sheet  (or ?axisA=deposit:address_qr)
// Cross-app pivot: every screenshot carrying that single label, grouped by
// source_app — the design-research view. Secondary labels are included.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const axisA = sp.get("axisA");
  const axisB = sp.get("axisB");

  if (!axisA && !axisB) {
    return NextResponse.json(
      { error: "Provide axisA or axisB (a single label slug)" },
      { status: 400 }
    );
  }
  const axis: "A" | "B" = axisA ? "A" : "B";
  const label = (axisA || axisB) as string;
  if (axis === "A" ? !isValidAxisA(label) : !isValidAxisB(label)) {
    return NextResponse.json({ error: `Invalid ${axis} label: ${label}` }, { status: 400 });
  }

  const records = await prisma.screenshotClassification.findMany({
    where: {
      taxonomyVersion: TAXONOMY_VERSION,
      labels: { some: { axis, label } },
    },
    include: {
      labels: { select: { axis: true, label: true, isPrimary: true } },
      screenshot: { include: { exchange: { select: { name: true } } } },
    },
    orderBy: { classifiedAt: "desc" },
  });

  const byApp: Record<
    string,
    {
      sourceApp: string;
      count: number;
      items: {
        screenshotId: string;
        thumbUrl: string | null;
        exchangeName: string | null;
        isPrimaryHere: boolean;
        primaryA: string | null;
        primaryB: string | null;
      }[];
    }
  > = {};

  await Promise.all(
    records.map(async (r) => {
      const app = r.sourceApp || "unknown";
      let thumbUrl: string | null = null;
      try {
        thumbUrl = await getPresignedScreenshotUrl(r.screenshot.s3Url);
      } catch {
        thumbUrl = null;
      }
      const group = (byApp[app] ??= { sourceApp: app, count: 0, items: [] });
      group.count += 1;
      group.items.push({
        screenshotId: r.screenshotId,
        thumbUrl,
        exchangeName: r.screenshot.exchange?.name ?? null,
        isPrimaryHere: r.labels.some(
          (l) => l.axis === axis && l.label === label && l.isPrimary
        ),
        primaryA: r.labels.find((l) => l.axis === "A" && l.isPrimary)?.label ?? null,
        primaryB: r.labels.find((l) => l.axis === "B" && l.isPrimary)?.label ?? null,
      });
    })
  );

  const groups = Object.values(byApp).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    axis,
    label,
    total: records.length,
    appCount: groups.length,
    groups,
  });
}
