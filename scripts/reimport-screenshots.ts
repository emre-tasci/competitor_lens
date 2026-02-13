import { PrismaClient } from "@prisma/client";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const EXCHANGE_NAME_MAP: Record<string, string> = {
  "BTC Türk": "BTCTurk",
  BTCTurk: "BTCTurk",
  BiLira: "BiLira",
  "Binance Global": "Binance Global",
  BinanceTR: "BinanceTR",
  BybitTR: "BybitTR",
  Coinbase: "Coinbase",
  "Garanti Kripto": "Garanti Kripto",
  GateTR: "GateTR",
  Kraken: "Kraken",
  Kuantist: "Kuantist",
  "OKX TR": "OKX TR",
  Paribu: "Paribu",
};

async function main() {
  // 1. Load all exchanges once
  const exchanges = await prisma.exchange.findMany();
  const exchangeMap = new Map<string, string>(); // name (lowercase) -> id
  for (const e of exchanges) {
    exchangeMap.set(e.name.toLowerCase(), e.id);
  }
  console.log(`Loaded ${exchanges.length} exchanges`);

  // 2. Delete all old screenshots in one query
  console.log("Deleting old screenshots...");
  const deleted = await prisma.screenshot.deleteMany({});
  console.log(`Deleted ${deleted.count} records`);

  // 3. Scan S3 and collect all keys
  console.log("Scanning S3...");
  let continuationToken: string | undefined;
  const toInsert: { exchangeId: string; s3Url: string }[] = [];
  let skipped = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: "screenshots/",
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });
    const response = await s3.send(command);

    for (const object of response.Contents || []) {
      const key = object.Key!;
      if (!key.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

      const parts = key.split("/");
      if (parts.length < 3) continue;

      const folderName = parts[1];
      const mappedName = EXCHANGE_NAME_MAP[folderName] || folderName;
      const exchangeId = exchangeMap.get(mappedName.toLowerCase());

      if (!exchangeId) {
        skipped++;
        continue;
      }

      toInsert.push({ exchangeId, s3Url: key });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`Found ${toInsert.length} screenshots to import (skipped ${skipped})`);

  // 4. Bulk insert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    await prisma.screenshot.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`  Inserted ${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length}`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
