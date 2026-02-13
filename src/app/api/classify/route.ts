import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyScreenshot } from "@/lib/xai";
import { getScreenshotBase64 } from "@/lib/s3";

function extractFolderHint(s3Url: string): string | undefined {
  const parts = s3Url.split("/");
  if (parts.length > 3) {
    return parts.slice(2, -1).join("/");
  }
  return undefined;
}

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
    select: { id: true, name: true, categoryId: true },
  });

  const imageBase64 = await getScreenshotBase64(screenshot.s3Url);
  const folderHint = extractFolderHint(screenshot.s3Url);

  const classification = await classifyScreenshot(
    imageBase64,
    categories.map((c) => c.name),
    features.map((f) => f.name),
    folderHint
  );

  // Find matching feature and category
  const matchedFeature = features.find(
    (f) => f.name.toLowerCase() === classification.feature.toLowerCase()
  );

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
