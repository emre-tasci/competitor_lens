import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const exchangeId = searchParams.get("exchangeId");
  const featureId = searchParams.get("featureId");
  const categoryId = searchParams.get("categoryId");
  const classified = searchParams.get("classified");

  const where: Record<string, unknown> = {};
  if (exchangeId) where.exchangeId = exchangeId;
  if (featureId) where.featureId = featureId;
  if (categoryId) where.categoryId = categoryId;
  if (classified === "true") where.featureId = { not: null };
  if (classified === "false") where.featureId = null;

  const screenshots = await prisma.screenshot.findMany({
    where,
    include: {
      exchange: true,
      feature: true,
      category: true,
    },
    orderBy: { uploadedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(screenshots);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { exchangeId, s3Url, featureId, categoryId, notes } = body;

  if (!exchangeId || !s3Url) {
    return NextResponse.json(
      { error: "exchangeId and s3Url are required" },
      { status: 400 }
    );
  }

  const screenshot = await prisma.screenshot.create({
    data: { exchangeId, s3Url, featureId, categoryId, notes },
    include: { exchange: true, feature: true, category: true },
  });

  return NextResponse.json(screenshot, { status: 201 });
}
