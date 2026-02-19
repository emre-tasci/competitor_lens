import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAnalysis, type AnalysisType } from "@/lib/analysis";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get("exchangeId");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (exchangeId) where.exchangeId = exchangeId;
    if (type) where.analysisType = type;

    const [analyses, total] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where,
        include: {
          exchange: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.aIAnalysis.count({ where }),
    ]);

    return NextResponse.json({ analyses, total, limit, offset });
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Analizler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, exchangeId } = await request.json();

    const validTypes: AnalysisType[] = [
      "daily_brief",
      "weekly_summary",
      "competitor_alert",
      "trend_analysis",
    ];

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        {
          error: "Geçersiz analiz tipi. Geçerli tipler: " + validTypes.join(", "),
        },
        { status: 400 }
      );
    }

    const result = await generateAnalysis(type, exchangeId || undefined);
    return NextResponse.json({
      message: "Analiz oluşturuldu",
      analysis: result,
    });
  } catch (error) {
    console.error("Error generating analysis:", error);
    return NextResponse.json(
      { error: "Analiz oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}
