import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectAllAnnouncements } from "@/lib/scraper";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get("exchangeId");
    const importance = searchParams.get("importance");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (exchangeId) where.exchangeId = exchangeId;
    if (importance) where.importance = importance;
    if (category) where.aiCategory = category;

    const [announcements, total] = await Promise.all([
      prisma.exchangeAnnouncement.findMany({
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
      prisma.exchangeAnnouncement.count({ where }),
    ]);

    return NextResponse.json({ announcements, total, limit, offset });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Duyurular yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "collect") {
      const result = await collectAllAnnouncements();
      return NextResponse.json({
        message: "Duyuru toplama tamamlandı",
        ...result,
      });
    }

    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  } catch (error) {
    console.error("Error collecting announcements:", error);
    return NextResponse.json(
      { error: "Duyuru toplama sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
