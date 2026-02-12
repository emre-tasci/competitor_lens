import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const exchange = await prisma.exchange.findUnique({
    where: { id },
    include: {
      screenshots: {
        include: { feature: true, category: true },
        orderBy: { uploadedAt: "desc" },
      },
      exchangeFeatures: {
        include: {
          feature: { include: { category: true } },
        },
        orderBy: { feature: { sortOrder: "asc" } },
      },
      _count: {
        select: { screenshots: true, exchangeFeatures: true },
      },
    },
  });

  if (!exchange) {
    return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
  }

  return NextResponse.json(exchange);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const exchange = await prisma.exchange.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(exchange);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.exchange.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
