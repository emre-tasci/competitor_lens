import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  TAXONOMY_VERSION,
  AXIS_A_LABELS,
  axisAArea,
  displayLabel,
} from "@/lib/taxonomy";

// GET /api/classifications/coverage-matrix — Axis-A screen (rows) x source_app
// (cols) => count. Counts every Axis-A label row (incl. secondaries) so a screen
// with two functional areas shows in both.
export async function GET() {
  const rows = await prisma.classificationLabel.findMany({
    where: { axis: "A", classification: { taxonomyVersion: TAXONOMY_VERSION } },
    select: { label: true, classification: { select: { sourceApp: true } } },
  });

  const appSet = new Set<string>();
  const cells: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const app = r.classification.sourceApp || "unknown";
    appSet.add(app);
    (cells[r.label] ??= {})[app] = (cells[r.label]?.[app] ?? 0) + 1;
  }

  const apps = [...appSet].sort((a, b) => a.localeCompare(b));

  // Preserve taxonomy order; only emit rows that carry data (present screens).
  const present = AXIS_A_LABELS.filter((l) => cells[l]);
  const matrix = present.map((label) => {
    const rowCells = cells[label] || {};
    const total = Object.values(rowCells).reduce((a, b) => a + b, 0);
    return {
      label,
      area: axisAArea(label),
      display: displayLabel(label),
      total,
      cells: rowCells,
    };
  });

  const totalsByApp: Record<string, number> = {};
  for (const app of apps) {
    totalsByApp[app] = matrix.reduce((sum, m) => sum + (m.cells[app] ?? 0), 0);
  }

  return NextResponse.json({
    apps,
    totalsByApp,
    rows: matrix,
    coverage: {
      screensCovered: present.length,
      screensTotal: AXIS_A_LABELS.length,
    },
  });
}
