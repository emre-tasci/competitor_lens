import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getCachedPendingCount = unstable_cache(
  async () => {
    return prisma.featureUpdateSuggestion.count({
      where: { status: "pending" },
    });
  },
  ["api-stats-pending"],
  { revalidate: 30 }
);

export async function GET() {
  const pendingCount = await getCachedPendingCount();

  return NextResponse.json({ pendingCount }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
