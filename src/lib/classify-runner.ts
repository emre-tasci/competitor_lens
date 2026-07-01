/**
 * Shared screenshot-classification runner (taxonomy = TAXONOMY_VERSION).
 *
 * One implementation used by BOTH:
 *   - the backfill script (scripts/classify-screenshots.ts), and
 *   - the incremental cron route (src/app/api/cron/classify-screenshots).
 *
 * Behaviour mirrors §3/§6/§8/§9: two-tier model policy, sha256 dedup, the
 * LabelOverride feedback loop (applied as an authoritative post-pass, never
 * overwritten), bounded concurrency, exponential backoff, and failure
 * isolation (one bad image is flagged needs_review, never fatal).
 *
 * Clients are constructed at call time (not import time) so the script's manual
 * .env load runs first; `prisma` is injected so the route can share @/lib/db.
 */
import type { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";
import { createHash } from "crypto";
import {
  resolveModel,
  classifyScreenshotImage,
  ClassificationOutcome,
} from "./screenshot-classifier";
import { TAXONOMY_VERSION, AXIS_B_OVERLAY } from "./taxonomy";

export interface RunStats {
  tier1: number;
  tier2: number;
  dedup: number;
  fail: number;
  processed: number;
}

export interface RunOptions {
  /** Max screenshots to process this run. Omit = all pending. */
  limit?: number;
  /** Parallel workers. Default: env CLASSIFY_CONCURRENCY or 4. */
  concurrency?: number;
  /** Stop starting new work after this many ms (for serverless time limits). */
  timeBudgetMs?: number;
  /** Optional progress logger. */
  log?: (m: string) => void;
}

const noop = () => {};

async function getBytes(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("empty S3 body");
  return Buffer.from(bytes);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  log: (m: string) => void,
  max = 5
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const retryable =
        status === 429 || (typeof status === "number" && status >= 500) || status === undefined;
      attempt++;
      if (!retryable || attempt >= max) throw err;
      const backoff = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
      log(`  retry ${attempt}/${max} for ${label} after ${backoff}ms (status=${status})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

/** Apply authoritative human overrides (§8) as a post-pass. Never dropped. */
function applyOverrides(
  outcome: ClassificationOutcome,
  overrides: { axis: string; label: string; action: string; confidence: number | null }[]
): ClassificationOutcome {
  if (overrides.length === 0) return outcome;
  // A human already adjudicated this screen via the §8 feedback loop. Keep it
  // resolved across re-classification / taxonomy bumps: never re-raise the flag.
  outcome.needs_review = false;
  outcome.review_reason = "İnceleme tamamlandı — kullanıcı düzeltti";
  const axisFor = (a: string) => (a === "A" ? outcome.axis_a : outcome.axis_b);
  for (const ov of overrides) {
    const arr = axisFor(ov.axis);
    if (ov.action === "remove") {
      const i = arr.findIndex((x) => x.label === ov.label);
      if (i >= 0) arr.splice(i, 1);
    } else if (ov.action === "add") {
      if (!arr.some((x) => x.label === ov.label))
        arr.push({ label: ov.label, primary: false, confidence: ov.confidence ?? 1 });
    } else if (ov.action === "set_primary") {
      if (!arr.some((x) => x.label === ov.label))
        arr.push({ label: ov.label, primary: false, confidence: ov.confidence ?? 1 });
      arr.forEach((x) => (x.primary = x.label === ov.label));
    }
  }
  // Guarantee exactly one primary per axis after edits.
  for (const arr of [outcome.axis_a, outcome.axis_b]) {
    if (arr.length && arr.filter((x) => x.primary).length !== 1) {
      const top = [...arr].sort((a, b) => b.confidence - a.confidence)[0];
      arr.forEach((x) => (x.primary = x.label === top.label));
    }
  }
  return outcome;
}

async function persist(
  prisma: PrismaClient,
  screenshotId: string,
  contentHash: string,
  sourceApp: string | null,
  outcome: ClassificationOutcome
) {
  await prisma.$transaction(async (tx) => {
    await tx.screenshotClassification.deleteMany({
      where: { screenshotId, taxonomyVersion: TAXONOMY_VERSION },
    });
    await tx.screenshotClassification.create({
      data: {
        screenshotId,
        contentHash,
        taxonomyVersion: TAXONOMY_VERSION,
        sourceApp: sourceApp ?? outcome.source_app,
        sourceAppConfidence: sourceApp ? 1 : outcome.source_app_confidence,
        capturedPlatform: outcome.captured_platform,
        language: outcome.language,
        modelTier: outcome.modelTier,
        modelName: outcome.modelName,
        modelMode: outcome.modelMode,
        overlayPresent: outcome.overlay_present,
        salientText: outcome.salient_text,
        rationale: outcome.rationale,
        needsReview: outcome.needs_review,
        reviewReason: outcome.review_reason,
        labels: {
          create: [
            ...outcome.axis_a.map((x) => ({ axis: "A", label: x.label, isPrimary: x.primary, confidence: x.confidence })),
            ...outcome.axis_b.map((x) => ({ axis: "B", label: x.label, isPrimary: x.primary, confidence: x.confidence })),
          ],
        },
      },
    });
    if (outcome.taxonomy_gap && outcome.axis_a.some((x) => x.label.startsWith("unclassified"))) {
      await tx.taxonomyGapLog.create({
        data: {
          screenshotId,
          taxonomyVersion: TAXONOMY_VERSION,
          proposedArea: outcome.taxonomy_gap.proposed_area,
          proposedScreen: outcome.taxonomy_gap.proposed_screen,
          reason: outcome.taxonomy_gap.reason,
        },
      });
    }
  });
}

async function processOne(
  ctx: { prisma: PrismaClient; s3: S3Client; xai: OpenAI; bucket: string; model: string; log: (m: string) => void },
  ss: { id: string; s3Url: string; exchange: { name: string } },
  stats: RunStats
) {
  const { prisma, s3, xai, bucket, model, log } = ctx;
  const label = `${ss.exchange.name}/${ss.s3Url.split("/").pop()}`;
  try {
    const bytes = await withRetry(() => getBytes(s3, bucket, ss.s3Url), `s3:${label}`, log);
    const contentHash = "sha256:" + createHash("sha256").update(bytes).digest("hex");

    const overrides = await prisma.labelOverride.findMany({
      where: { screenshotId: ss.id },
      select: { axis: true, label: true, action: true, confidence: true },
    });

    // §6 dedup: identical bytes already classified at this version -> clone.
    const twin = await prisma.screenshotClassification.findFirst({
      where: { contentHash, taxonomyVersion: TAXONOMY_VERSION, NOT: { screenshotId: ss.id } },
      include: { labels: true },
    });
    if (twin) {
      const outcome: ClassificationOutcome = {
        source_app: twin.sourceApp,
        source_app_confidence: twin.sourceAppConfidence,
        captured_platform: twin.capturedPlatform,
        language: twin.language,
        axis_a: twin.labels.filter((l) => l.axis === "A").map((l) => ({ label: l.label, primary: l.isPrimary, confidence: l.confidence })),
        axis_b: twin.labels.filter((l) => l.axis === "B").map((l) => ({ label: l.label, primary: l.isPrimary, confidence: l.confidence })),
        overlay_present: twin.overlayPresent,
        salient_text: twin.salientText,
        rationale: twin.rationale,
        needs_review: twin.needsReview,
        review_reason: twin.reviewReason,
        taxonomy_gap: null,
        modelTier: twin.modelTier as 1 | 2,
        modelName: twin.modelName,
        modelMode: twin.modelMode as "non_reasoning" | "reasoning",
      };
      applyOverrides(outcome, overrides);
      await persist(prisma, ss.id, contentHash, ss.exchange.name, outcome);
      stats.dedup++;
      stats.processed++;
      log(`  DEDUP ${label}`);
      return;
    }

    const base64 = bytes.toString("base64");
    const outcome = await withRetry(() => classifyScreenshotImage(xai, base64, model), `xai:${label}`, log);
    applyOverrides(outcome, overrides);
    await persist(prisma, ss.id, contentHash, ss.exchange.name, outcome);
    if (outcome.modelTier === 2) stats.tier2++; else stats.tier1++;
    stats.processed++;
    const a = outcome.axis_a.find((x) => x.primary)?.label;
    const b = outcome.axis_b.find((x) => x.primary)?.label;
    const ov = AXIS_B_OVERLAY.has(b || "") ? " [overlay]" : "";
    log(`  T${outcome.modelTier} ${label} -> ${a} | ${b}${ov}${outcome.needs_review ? " *review*" : ""}`);
  } catch (err: unknown) {
    // Failure isolation: record a needs_review stub so the item is not lost.
    stats.fail++;
    stats.processed++;
    const msg = err instanceof Error ? err.message : String(err);
    log(`  FAIL ${label}: ${msg}`);
    try {
      await persist(prisma, ss.id, "error:" + ss.id, ss.exchange.name, {
        source_app: ss.exchange.name, source_app_confidence: 1, captured_platform: null, language: null,
        axis_a: [{ label: "unclassified:out_of_scope", primary: true, confidence: 0.1 }],
        axis_b: [{ label: "ui:detail", primary: true, confidence: 0.1 }],
        overlay_present: false, salient_text: [], rationale: "classification failed",
        needs_review: true, review_reason: `error: ${msg.slice(0, 200)}`, taxonomy_gap: null,
        modelTier: 1, modelName: model, modelMode: "non_reasoning",
      });
    } catch { /* swallow — never fatal */ }
  }
}

/**
 * Classify all screenshots that lack a record at the current taxonomy version.
 * Bounded by `limit` and `timeBudgetMs` for serverless/incremental use.
 * Idempotent and resumable — safe to call repeatedly.
 */
export async function classifyPending(prisma: PrismaClient, opts: RunOptions = {}): Promise<RunStats & { remaining: number }> {
  const log = opts.log ?? noop;
  const concurrency = opts.concurrency ?? Number(process.env.CLASSIFY_CONCURRENCY || 4);
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET not set");

  const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-central-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  const xai = new OpenAI({ apiKey: process.env.XAI_API_KEY || "", baseURL: "https://api.x.ai/v1" });

  const model = await resolveModel(xai);
  log(`Taxonomy ${TAXONOMY_VERSION} | model ${model} | concurrency ${concurrency}${opts.limit ? ` | limit ${opts.limit}` : ""}`);

  const todo = await prisma.screenshot.findMany({
    where: { classifications: { none: { taxonomyVersion: TAXONOMY_VERSION } } },
    include: { exchange: { select: { name: true } } },
    orderBy: { uploadedAt: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });
  log(`to classify ${todo.length}`);

  const stats: RunStats = { tier1: 0, tier2: 0, dedup: 0, fail: 0, processed: 0 };
  const ctx = { prisma, s3, xai, bucket, model, log };
  const deadline = opts.timeBudgetMs ? Date.now() + opts.timeBudgetMs : Infinity;
  let idx = 0;

  async function worker() {
    for (;;) {
      if (Date.now() >= deadline) return; // out of time budget — stop starting work
      const i = idx++;
      if (i >= todo.length) return;
      log(`[${i + 1}/${todo.length}]`);
      await processOne(ctx, todo[i], stats);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length || 1) }, worker));

  const remaining = await prisma.screenshot.count({
    where: { classifications: { none: { taxonomyVersion: TAXONOMY_VERSION } } },
  });
  log(`DONE. tier1=${stats.tier1} tier2=${stats.tier2} dedup=${stats.dedup} fail=${stats.fail} remaining=${remaining}`);
  return { ...stats, remaining };
}
