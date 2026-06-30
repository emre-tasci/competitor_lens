import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { s3 } from "@/lib/s3";

export const maxDuration = 60;

// POST (multipart/form-data): file + exchangeId (+ optional featureId).
// Uploads the image to S3 under screenshots/<Exchange>/<Feature>/<file> and
// creates the Screenshot record. Bytes pass through the server, so no S3 CORS
// config is required on the bucket.
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const exchangeId = form.get("exchangeId") as string | null;
    const featureIdRaw = form.get("featureId") as string | null;
    const featureId = featureIdRaw && featureIdRaw !== "none" ? featureIdRaw : null;

    if (!file || !exchangeId) {
      return NextResponse.json(
        { error: "file and exchangeId are required" },
        { status: 400 }
      );
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
    });
    if (!exchange) {
      return NextResponse.json({ error: "Exchange not found" }, { status: 404 });
    }

    let folder = "_uploads";
    if (featureId) {
      const feature = await prisma.feature.findUnique({
        where: { id: featureId },
      });
      if (feature) folder = feature.name;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `screenshots/${exchange.name}/${folder}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "image/png",
      })
    );

    const screenshot = await prisma.screenshot.create({
      data: { exchangeId, s3Url: key, featureId },
      include: { exchange: true, feature: true },
    });

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error("Screenshot upload error:", error);
    return NextResponse.json(
      {
        error: `Upload failed: ${error instanceof Error ? error.message : error}`,
      },
      { status: 500 }
    );
  }
}
