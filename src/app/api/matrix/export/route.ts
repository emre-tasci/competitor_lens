import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketType = searchParams.get("marketType");
  const format = searchParams.get("format") || "csv";

  const exchangeWhere = marketType ? { marketType } : {};

  const [exchanges, categories, cells] = await Promise.all([
    prisma.exchange.findMany({
      where: exchangeWhere,
      orderBy: { name: "asc" },
    }),
    prisma.featureCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.exchangeFeature.findMany({
      where: marketType ? { exchange: { marketType } } : {},
    }),
  ]);

  // Build cell lookup
  const cellMap: Record<string, Record<string, string>> = {};
  for (const cell of cells) {
    if (!cellMap[cell.exchangeId]) cellMap[cell.exchangeId] = {};
    cellMap[cell.exchangeId][cell.featureId] = cell.hasFeature
      ? "VAR"
      : cell.featureStatus === "unknown"
        ? ""
        : "YOK";
  }

  // All features flattened
  const allFeatures = categories.flatMap((c) => c.features);

  if (format === "csv") {
    // Build CSV
    const header = [
      "competitor name",
      "local/global",
      ...allFeatures.map((f) => f.name),
    ];
    const rows = exchanges.map((exchange) => [
      exchange.name,
      exchange.marketType === "turkish" ? "TR" : "Global",
      ...allFeatures.map(
        (f) => cellMap[exchange.id]?.[f.id] || ""
      ),
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feature-matrix-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // JSON format (for Excel generation on client)
  return NextResponse.json({
    exchanges,
    features: allFeatures,
    categories,
    cells: cellMap,
  });
}
