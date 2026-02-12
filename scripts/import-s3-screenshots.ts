import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
const prisma = new PrismaClient();

// S3 folder name -> DB exchange name mapping
const EXCHANGE_NAME_MAP: Record<string, string> = {
  BTCTurk: "BtcTurk",
  Btcturk: "BtcTurk",
  Binance: "Binance",
  Paribu: "Paribu",
  Bybit: "Bybit",
  OKX: "OKX",
  Coinbase: "Coinbase",
  KuCoin: "KuCoin",
  Bitget: "Bitget",
  GateIO: "Gate.io",
  "Gate.io": "Gate.io",
  MEXC: "MEXC",
  Kraken: "Kraken",
  Bitci: "Bitci",
  Icrypex: "İcrypex",
  Bitay: "Bitay",
  Felans: "Felans",
  CryptoCom: "Crypto.com",
  "Crypto.com": "Crypto.com",
};

// Turkish exchange names for auto market type detection
const TURKISH_EXCHANGES = new Set([
  "BtcTurk",
  "Paribu",
  "Bitci",
  "İcrypex",
  "Bitay",
  "Felans",
]);

async function importScreenshots() {
  console.log("Starting S3 screenshot import...");
  console.log(`Bucket: ${process.env.AWS_S3_BUCKET}`);

  let continuationToken: string | undefined;
  let imported = 0;
  let skipped = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: "screenshots/",
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    for (const object of response.Contents || []) {
      const key = object.Key!;

      // Only image files
      if (!key.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

      // Parse key: screenshots/{ExchangeName}/{filename}.ext
      const parts = key.split("/");
      if (parts.length < 3) continue;

      const folderName = parts[1];
      const fileName = parts.slice(2).join("/");
      if (!folderName || !fileName) continue;

      // Map exchange name
      const exchangeName = EXCHANGE_NAME_MAP[folderName] || folderName;

      // Find or create exchange
      let exchange = await prisma.exchange.findFirst({
        where: { name: exchangeName },
      });

      if (!exchange) {
        const marketType = TURKISH_EXCHANGES.has(exchangeName)
          ? "turkish"
          : "global";
        exchange = await prisma.exchange.create({
          data: { name: exchangeName, marketType },
        });
        console.log(`  New exchange created: ${exchangeName} (${marketType})`);
      }

      // Check if screenshot already exists (dedup)
      const existing = await prisma.screenshot.findFirst({
        where: { s3Url: key },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.screenshot.create({
        data: {
          exchangeId: exchange.id,
          s3Url: key,
        },
      });

      imported++;
      if (imported % 50 === 0) {
        console.log(`  Imported ${imported} screenshots...`);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (already exists): ${skipped}`);
}

importScreenshots()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
