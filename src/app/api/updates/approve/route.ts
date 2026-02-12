import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { suggestionIds, action } = body; // action: "approve" | "reject"

  if (!suggestionIds || !Array.isArray(suggestionIds) || !action) {
    return NextResponse.json(
      { error: "suggestionIds (array) and action (approve/reject) are required" },
      { status: 400 }
    );
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  const results = [];

  for (const id of suggestionIds) {
    const suggestion = await prisma.featureUpdateSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion || suggestion.status !== "pending") {
      results.push({ id, status: "skipped", reason: "not found or not pending" });
      continue;
    }

    // Update suggestion status
    await prisma.featureUpdateSuggestion.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        reviewedAt: new Date(),
        reviewedBy: "admin",
      },
    });

    if (action === "approve") {
      // Update the exchange feature
      await prisma.exchangeFeature.upsert({
        where: {
          exchangeId_featureId: {
            exchangeId: suggestion.exchangeId,
            featureId: suggestion.featureId,
          },
        },
        update: {
          hasFeature: suggestion.suggestedStatus === "available",
          featureStatus: suggestion.suggestedStatus,
        },
        create: {
          exchangeId: suggestion.exchangeId,
          featureId: suggestion.featureId,
          hasFeature: suggestion.suggestedStatus === "available",
          featureStatus: suggestion.suggestedStatus,
        },
      });

      // Log the update
      await prisma.featureUpdateLog.create({
        data: {
          exchangeId: suggestion.exchangeId,
          featureId: suggestion.featureId,
          oldStatus: suggestion.oldStatus,
          newStatus: suggestion.suggestedStatus,
          updateSource: "ai_approved",
          updatedBy: "admin",
        },
      });

      results.push({ id, status: "approved" });
    } else {
      results.push({ id, status: "rejected" });
    }
  }

  return NextResponse.json({ results });
}
