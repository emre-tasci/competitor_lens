import { PrismaClient } from "@prisma/client";
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

function slugify(name: string): string {
  return name
    .replace(/[\/\\]/g, "-")
    .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s\-()]/g, "")
    .trim();
}

async function main() {
  // Get all classified screenshots with feature and exchange info
  const screenshots = await prisma.screenshot.findMany({
    where: {
      classifiedAt: { not: null },
      featureId: { not: null },
    },
    include: {
      exchange: true,
      feature: { include: { category: true } },
    },
  });

  console.log(`Found ${screenshots.length} classified screenshots to organize\n`);

  let moved = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < screenshots.length; i++) {
    const ss = screenshots[i];
    const exchangeName = slugify(ss.exchange.name);
    const featureName = slugify(ss.feature!.name);
    const fileName = ss.s3Url.split("/").pop()!;

    // New path: screenshots/{Exchange}/{Feature}/{filename}
    const newKey = `screenshots/${exchangeName}/${featureName}/${fileName}`;

    if (ss.s3Url === newKey) {
      skipped++;
      continue;
    }

    const tag = `[${i + 1}/${screenshots.length}]`;

    try {
      // Copy to new location
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${encodeURIComponent(ss.s3Url)}`,
          Key: newKey,
        })
      );

      // Delete old file
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: ss.s3Url,
        })
      );

      // Update DB with new path
      await prisma.screenshot.update({
        where: { id: ss.id },
        data: { s3Url: newKey },
      });

      moved++;
      console.log(`${tag} ${ss.s3Url} -> ${newKey}`);
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${tag} HATA: ${msg} (${ss.s3Url})`);
    }
  }

  console.log(`\n--- Sonuç ---`);
  console.log(`  Taşınan: ${moved}`);
  console.log(`  Zaten doğru yerde: ${skipped}`);
  console.log(`  Hatalı: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
