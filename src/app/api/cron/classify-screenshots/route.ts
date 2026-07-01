import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyPending } from "@/lib/classify-runner";

// Incremental screenshot classification. Runs on a schedule (see vercel.json)
// and classifies any screenshots that don't yet have a record at the current
// taxonomy version — i.e. newly synced uploads. Idempotent & resumable, so a
// bounded batch per run drains the queue over successive invocations.

export const maxDuration = 300; // 5 min ceiling on Vercel
export const dynamic = "force-dynamic";

// Upper bound on screens fetched per run; the time budget below is the real
// governor (at ~3s/image, concurrency 4, ~250s clears a few hundred). Whatever
// doesn't fit spills to the next run since the job is resumable.
const BATCH_LIMIT = Number(process.env.CLASSIFY_CRON_BATCH || 300);
const TIME_BUDGET_MS = 250_000; // stop starting new work ~50s before the 300s cap

async function run(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const stats = await classifyPending(prisma, {
      limit: BATCH_LIMIT,
      timeBudgetMs: TIME_BUDGET_MS,
    });
    return NextResponse.json({
      ok: true,
      ...stats,
      tookMs: Date.now() - started,
      note: stats.remaining > 0
        ? `${stats.remaining} still pending — will continue on the next run`
        : "all screenshots classified",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron issues GET; allow POST for manual triggering too.
export const GET = run;
export const POST = run;
