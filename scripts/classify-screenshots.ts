/**
 * Two-axis screenshot classification backfill (taxonomy = TAXONOMY_VERSION).
 *
 * Thin CLI wrapper around the shared runner in src/lib/classify-runner.ts (the
 * same code path the incremental cron route uses). Resumable & idempotent:
 * classifies every screenshot without a record at the current taxonomy version.
 *
 * Run (background):
 *   nohup npx tsx scripts/classify-screenshots.ts > /tmp/classify.log 2>&1 &
 *
 * Env knobs: CLASSIFY_CONCURRENCY (default 4).
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// ---- Manual .env load (Node 18 lacks stable --env-file). MUST run before
// PrismaClient is instantiated, so keep this above the prisma import/use. ----
try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
} catch {}

import { PrismaClient } from "@prisma/client";
import { classifyPending } from "../src/lib/classify-runner";

const prisma = new PrismaClient();
const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);

classifyPending(prisma, { log })
  .catch((e) => { console.error("FATAL", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
