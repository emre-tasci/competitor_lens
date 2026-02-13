import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const feature = await prisma.feature.findUnique({
    where: { id },
    include: {
      category: true,
      exchangeFeatures: {
        include: { exchange: true },
        orderBy: { exchange: { name: "asc" } },
      },
      screenshots: {
        include: { exchange: true, category: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  return NextResponse.json(feature);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const feature = await prisma.feature.update({
    where: { id },
    data: body,
    include: { category: true },
  });

  return NextResponse.json(feature);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.feature.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
