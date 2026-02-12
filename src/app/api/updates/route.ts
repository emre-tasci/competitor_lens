import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "pending";
  const exchangeId = searchParams.get("exchangeId");
  const minConfidence = searchParams.get("minConfidence");

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (exchangeId) where.exchangeId = exchangeId;
  if (minConfidence) where.aiConfidence = { gte: parseFloat(minConfidence) };

  const suggestions = await prisma.featureUpdateSuggestion.findMany({
    where,
    include: {
      exchange: { select: { id: true, name: true, marketType: true } },
      feature: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: [{ aiConfidence: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(suggestions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    exchangeId,
    featureId,
    oldStatus,
    suggestedStatus,
    aiConfidence,
    evidence,
    sourceUrl,
  } = body;

  const suggestion = await prisma.featureUpdateSuggestion.create({
    data: {
      exchangeId,
      featureId,
      oldStatus,
      suggestedStatus,
      aiConfidence,
      evidence,
      sourceUrl,
    },
    include: {
      exchange: { select: { name: true } },
      feature: { select: { name: true } },
    },
  });

  return NextResponse.json(suggestion, { status: 201 });
}
