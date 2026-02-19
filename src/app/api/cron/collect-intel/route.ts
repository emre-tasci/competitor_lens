import { NextRequest, NextResponse } from "next/server";
import { collectAllTweets } from "@/lib/twitter";
import { collectAllAnnouncements } from "@/lib/scraper";
import { collectAllNews } from "@/lib/news";
import { generateAnalysis } from "@/lib/analysis";

export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Step 1: Collect tweets
  try {
    results.tweets = await collectAllTweets();
  } catch (error) {
    errors.push(`Tweet collection failed: ${error}`);
  }

  // Step 2: Collect announcements
  try {
    results.announcements = await collectAllAnnouncements();
  } catch (error) {
    errors.push(`Announcement collection failed: ${error}`);
  }

  // Step 3: Collect news
  try {
    results.news = await collectAllNews();
  } catch (error) {
    errors.push(`News collection failed: ${error}`);
  }

  // Step 4: Generate daily brief
  try {
    results.dailyBrief = await generateAnalysis("daily_brief");
  } catch (error) {
    errors.push(`Daily brief generation failed: ${error}`);
  }

  return NextResponse.json({
    message: "Intelligence collection completed",
    results,
    errors,
    timestamp: new Date().toISOString(),
  });
}
