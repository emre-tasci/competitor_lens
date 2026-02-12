import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const screenshot = await prisma.screenshot.findUnique({
    where: { id },
    include: { exchange: true, feature: true, category: true },
  });

  if (!screenshot) {
    return NextResponse.json(
      { error: "Screenshot not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(screenshot);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const screenshot = await prisma.screenshot.update({
    where: { id },
    data: body,
    include: { exchange: true, feature: true, category: true },
  });

  return NextResponse.json(screenshot);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.screenshot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
