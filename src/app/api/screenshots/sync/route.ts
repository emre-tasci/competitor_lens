import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listS3Objects, parseS3Key } from "@/lib/s3";

export const maxDuration = 60;

// S3 folder name -> canonical DB exchange name (keep in sync with import script)
const EXCHANGE_NAME_MAP: Record<string, string> = {
  BTCTurk: "BtcTurk",
  Btcturk: "BtcTurk",
  "BTC Türk": "BtcTurk",
  Icrypex: "İcrypex",
  "Binance Global": "Binance",
  GateIO: "Gate.io",
  CryptoCom: "Crypto.com",
};

const TURKISH_EXCHANGES = new Set([
  "BtcTurk",
  "Paribu",
  "Bitci",
  "İcrypex",
  "Bitay",
  "Felans",
  "BinanceTR",
  "BybitTR",
  "GateTR",
  "KucoinTR",
  "CoinTR",
  "OKX TR",
  "Garanti Kripto",
  "BiLira",
  "Midas Kripto",
  "Ortak App",
  "Stablex",
  "Bitexen",
]);

// POST: scan the S3 bucket and create Screenshot rows for any files not yet
// in the DB. Idempotent — existing files are skipped. Auto-creates exchanges
// for new folders.
export async function POST() {
  try {
    const objects = await listS3Objects("screenshots/");

    const existingRows = await prisma.screenshot.findMany({
      select: { s3Url: true },
    });
    const existing = new Set(existingRows.map((r) => r.s3Url));

    const exchanges = await prisma.exchange.findMany({
      select: { id: true, name: true },
    });
    const exByName = new Map(exchanges.map((e) => [e.name, e.id]));

    const toCreate: { exchangeId: string; s3Url: string }[] = [];
    const newExchanges: string[] = [];
    let skipped = 0;

    for (const obj of objects) {
      if (existing.has(obj.key)) {
        skipped++;
        continue;
      }
      const parsed = parseS3Key(obj.key);
      if (!parsed) continue;

      const exName =
        EXCHANGE_NAME_MAP[parsed.exchangeFolder] || parsed.exchangeFolder;
      let exId = exByName.get(exName);
      if (!exId) {
        const marketType = TURKISH_EXCHANGES.has(exName) ? "turkish" : "global";
        const created = await prisma.exchange.create({
          data: { name: exName, marketType },
        });
        exId = created.id;
        exByName.set(exName, exId);
        newExchanges.push(exName);
      }
      toCreate.push({ exchangeId: exId, s3Url: obj.key });
    }

    let imported = 0;
    if (toCreate.length) {
      const result = await prisma.screenshot.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      imported = result.count;
    }

    return NextResponse.json({
      imported,
      skipped,
      newExchanges,
      totalInBucket: objects.length,
    });
  } catch (error) {
    console.error("Screenshot sync error:", error);
    return NextResponse.json(
      { error: `Sync failed: ${error instanceof Error ? error.message : error}` },
      { status: 500 }
    );
  }
}
