import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectAllNews } from "@/lib/news";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get("exchangeId");
    const source = searchParams.get("source");
    const sentiment = searchParams.get("sentiment");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (exchangeId) where.exchangeId = exchangeId;
    if (source) where.source = source;
    if (sentiment) where.aiSentiment = sentiment;

    const [news, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        include: {
          exchange: {
            select: { id: true, name: true, logoUrl: true, marketType: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return NextResponse.json({ news, total, limit, offset });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Haberler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "collect") {
      const result = await collectAllNews();
      return NextResponse.json({
        message: "Haber toplama tamamlandı",
        ...result,
      });
    }

    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  } catch (error) {
    console.error("Error collecting news:", error);
    return NextResponse.json(
      { error: "Haber toplama sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
