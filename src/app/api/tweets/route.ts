import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectAllTweets } from "@/lib/twitter";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get("exchangeId");
    const highlightsOnly = searchParams.get("highlights") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (exchangeId) where.exchangeId = exchangeId;
    if (highlightsOnly) where.isHighlight = true;

    const [tweets, total] = await Promise.all([
      prisma.tweet.findMany({
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
      prisma.tweet.count({ where }),
    ]);

    return NextResponse.json({ tweets, total, limit, offset });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    return NextResponse.json(
      { error: "Tweetler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "collect") {
      const result = await collectAllTweets();
      return NextResponse.json({
        message: "Tweet toplama tamamlandı",
        ...result,
      });
    }

    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  } catch (error) {
    console.error("Error collecting tweets:", error);
    return NextResponse.json(
      { error: "Tweet toplama sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
