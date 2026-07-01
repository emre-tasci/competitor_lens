import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";

// GET /api/classifications/gaps — taxonomy gap log (out-of-scope proposals),
// unresolved first, for PM review of vocabulary expansions.
export async function GET(request: NextRequest) {
  const includeResolved = request.nextUrl.searchParams.get("resolved") === "true";

  const gaps = await prisma.taxonomyGapLog.findMany({
    where: {
      taxonomyVersion: TAXONOMY_VERSION,
      ...(includeResolved ? {} : { resolved: false }),
    },
    include: { screenshot: { include: { exchange: { select: { name: true } } } } },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({
    total: gaps.length,
    gaps: gaps.map((g) => ({
      id: g.id,
      screenshotId: g.screenshotId,
      exchangeName: g.screenshot?.exchange?.name ?? null,
      proposedArea: g.proposedArea,
      proposedScreen: g.proposedScreen,
      reason: g.reason,
      resolved: g.resolved,
      createdAt: g.createdAt,
    })),
  });
}
