import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyScreenshot } from "@/lib/xai";
import { getScreenshotUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { screenshotId } = body;

  if (!screenshotId) {
    return NextResponse.json(
      { error: "screenshotId is required" },
      { status: 400 }
    );
  }

  const screenshot = await prisma.screenshot.findUnique({
    where: { id: screenshotId },
    include: { exchange: true },
  });

  if (!screenshot) {
    return NextResponse.json(
      { error: "Screenshot not found" },
      { status: 404 }
    );
  }

  // Get categories and features for context
  const categories = await prisma.featureCategory.findMany({
    select: { name: true },
  });
  const features = await prisma.feature.findMany({
    select: { name: true },
  });

  const imageUrl = getScreenshotUrl(screenshot.s3Url);

  const classification = await classifyScreenshot(
    imageUrl,
    categories.map((c) => c.name),
    features.map((f) => f.name)
  );

  // Find matching feature and category
  const matchedFeature = await prisma.feature.findFirst({
    where: {
      name: { equals: classification.feature, mode: "insensitive" },
    },
    include: { category: true },
  });

  // Update screenshot with classification
  const updated = await prisma.screenshot.update({
    where: { id: screenshotId },
    data: {
      aiClassification: JSON.parse(JSON.stringify(classification)),
      aiConfidence: classification.confidence,
      featureId: matchedFeature?.id || null,
      categoryId: matchedFeature?.categoryId || null,
      classifiedAt: new Date(),
    },
    include: { exchange: true, feature: true, category: true },
  });

  return NextResponse.json({
    screenshot: updated,
    classification,
    matchedFeature: matchedFeature
      ? { id: matchedFeature.id, name: matchedFeature.name }
      : null,
  });
}
