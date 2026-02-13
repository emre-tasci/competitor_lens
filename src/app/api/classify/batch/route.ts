import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyScreenshot } from "@/lib/xai";
import { getScreenshotBase64 } from "@/lib/s3";

export const maxDuration = 300;

function extractFolderHint(s3Url: string): string | undefined {
  // s3Url format: screenshots/{Exchange}/{SubFolder}/filename.png
  const parts = s3Url.split("/");
  if (parts.length > 3) {
    return parts.slice(2, -1).join("/"); // e.g. "KYC", "Onboarding", "TRY Nemalandırma"
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { screenshotIds, limit = 10 } = body;

  // Get unclassified screenshots
  let screenshots;
  if (screenshotIds && screenshotIds.length > 0) {
    screenshots = await prisma.screenshot.findMany({
      where: { id: { in: screenshotIds } },
      include: { exchange: true },
    });
  } else {
    screenshots = await prisma.screenshot.findMany({
      where: { featureId: null, classifiedAt: null },
      include: { exchange: true },
      take: limit,
    });
  }

  if (screenshots.length === 0) {
    return NextResponse.json({
      message: "No unclassified screenshots found",
      results: [],
    });
  }

  const categories = await prisma.featureCategory.findMany({
    select: { name: true },
  });
  const features = await prisma.feature.findMany({
    select: { id: true, name: true, categoryId: true },
  });

  const categoryNames = categories.map((c) => c.name);
  const featureNames = features.map((f) => f.name);
  const results = [];

  for (const screenshot of screenshots) {
    try {
      const imageBase64 = await getScreenshotBase64(screenshot.s3Url);
      const folderHint = extractFolderHint(screenshot.s3Url);

      const classification = await classifyScreenshot(
        imageBase64,
        categoryNames,
        featureNames,
        folderHint
      );

      const matchedFeature = features.find(
        (f) => f.name.toLowerCase() === classification.feature.toLowerCase()
      );

      await prisma.screenshot.update({
        where: { id: screenshot.id },
        data: {
          aiClassification: JSON.parse(JSON.stringify(classification)),
          aiConfidence: classification.confidence,
          featureId: matchedFeature?.id || null,
          categoryId: matchedFeature?.categoryId || null,
          classifiedAt: new Date(),
        },
      });

      results.push({
        screenshotId: screenshot.id,
        status: "success",
        classification,
        matchedFeature: matchedFeature?.name || null,
      });

      // Rate limiting - wait 1 second between calls
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      results.push({
        screenshotId: screenshot.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    total: screenshots.length,
    successful: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "error").length,
    results,
  });
}
