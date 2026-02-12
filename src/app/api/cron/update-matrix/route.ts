import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkExchangeFeatures } from "@/lib/xai";

export async function GET(request: NextRequest) {
  // Auth check for cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exchanges = await prisma.exchange.findMany();
  const results = [];

  for (const exchange of exchanges) {
    try {
      const features = await prisma.exchangeFeature.findMany({
        where: { exchangeId: exchange.id },
        include: { feature: true },
      });

      const updates = await checkExchangeFeatures(
        exchange.name,
        exchange.websiteUrl || "",
        features.map((f) => ({
          name: f.feature.name,
          status: f.featureStatus,
        }))
      );

      for (const update of updates) {
        // Find feature by name
        const feature = await prisma.feature.findFirst({
          where: { name: { equals: update.feature, mode: "insensitive" } },
        });

        if (!feature) continue;

        await prisma.featureUpdateSuggestion.create({
          data: {
            exchangeId: exchange.id,
            featureId: feature.id,
            oldStatus: update.old_status,
            suggestedStatus: update.new_status,
            aiConfidence: update.confidence,
            evidence: update.evidence,
            sourceUrl: update.source_url,
            status: "pending",
          },
        });
      }

      results.push({
        exchange: exchange.name,
        suggestionsCreated: updates.length,
      });

      // Rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      results.push({
        exchange: exchange.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    results,
  });
}
