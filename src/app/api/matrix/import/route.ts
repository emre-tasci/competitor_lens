import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExcelBuffer, mapFeatureStatus, getFeatureCategoryMapping, slugify } from "@/lib/excel-parser";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, featureColumns, errors } = parseExcelBuffer(buffer);

  if (errors.length > 0 && rows.length === 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Ensure all feature categories exist
  const categoryNames = new Set(
    featureColumns.map((f) => getFeatureCategoryMapping(f.toLowerCase().trim()))
  );
  const categoryMap: Record<string, string> = {};

  for (const catName of categoryNames) {
    let cat = await prisma.featureCategory.findFirst({
      where: { name: catName },
    });
    if (!cat) {
      cat = await prisma.featureCategory.create({
        data: { name: catName },
      });
    }
    categoryMap[catName] = cat.id;
  }

  // Ensure all features exist
  const featureMap: Record<string, string> = {};
  let sortOrder = 0;
  for (const col of featureColumns) {
    sortOrder++;
    const normalized = col.toLowerCase().trim();
    const slug = slugify(normalized);
    const catName = getFeatureCategoryMapping(normalized);
    const categoryId = categoryMap[catName];

    let feature = await prisma.feature.findUnique({ where: { slug } });
    if (!feature) {
      feature = await prisma.feature.create({
        data: {
          name: normalized,
          slug,
          categoryId,
          sortOrder,
        },
      });
    }
    featureMap[normalized] = feature.id;
  }

  // Import rows
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    // Find or create exchange
    let exchange = await prisma.exchange.findFirst({
      where: { name: { equals: row.exchangeName, mode: "insensitive" } },
    });

    if (!exchange) {
      exchange = await prisma.exchange.create({
        data: {
          name: row.exchangeName,
          marketType: row.marketType,
        },
      });
    }

    // Update exchange features
    for (const [featureName, value] of Object.entries(row.features)) {
      const featureId = featureMap[featureName];
      if (!featureId) continue;

      const { hasFeature, featureStatus } = mapFeatureStatus(value);

      const existing = await prisma.exchangeFeature.findUnique({
        where: {
          exchangeId_featureId: {
            exchangeId: exchange.id,
            featureId,
          },
        },
      });

      if (existing) {
        await prisma.exchangeFeature.update({
          where: { id: existing.id },
          data: { hasFeature, featureStatus },
        });

        // Log if status changed
        if (existing.featureStatus !== featureStatus) {
          await prisma.featureUpdateLog.create({
            data: {
              exchangeId: exchange.id,
              featureId,
              oldStatus: existing.featureStatus,
              newStatus: featureStatus,
              updateSource: "excel_import",
            },
          });
        }
        updated++;
      } else {
        await prisma.exchangeFeature.create({
          data: {
            exchangeId: exchange.id,
            featureId,
            hasFeature,
            featureStatus,
          },
        });
        created++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    exchanges: rows.length,
    features: featureColumns.length,
    cellsCreated: created,
    cellsUpdated: updated,
    warnings: errors,
  });
}
