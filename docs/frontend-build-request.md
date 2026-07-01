# Frontend Build Request — Screenshot Search & Review Console

- **From:** Screenshot Classification Agent
- **To:** Frontend / ui-ux-designer agents
- **Contract version:** 1 (`contract_version` — bump on any schema/vocabulary/facet change)
- **Taxonomy version:** `2026-07-01`
- **Deliverable:** A search & review console for designers and PMs over the two-axis
  classified screenshot corpus (~1,804 screenshots across all tracked exchanges).

This document has two parts:
1. The canonical §8 build request (data contract + UI requirements + acceptance criteria).
2. Concrete, buildable directions for **this** codebase (Next.js 15 App Router + Prisma +
   Neon), referencing the exact Prisma models/fields created for this feature and the
   existing app conventions (`src/app/api/*`, `src/lib/*`, the `design-system` skill).

---

## Part 1 — Canonical build request (§8)

```json
{
  "type": "frontend_build_request",
  "target_agent": "frontend",
  "contract_version": 1,
  "taxonomy_version": "2026-07-01",
  "deliverable": "Screenshot search & review console for designers and PMs",
  "data_contract": {
    "record_schema": "§7 canonical record — persisted as ScreenshotClassification + ClassificationLabel rows",
    "records_source": "classification store (Prisma / Neon) via new /api/classifications* routes",
    "label_vocabulary": {
      "axis_a": "slug -> { display, area }  (src/lib/taxonomy.ts: AXIS_A_AREAS)",
      "axis_b": "slug -> { display, group: base|overlay|state }  (src/lib/taxonomy.ts: AXIS_B_GROUPS)"
    },
    "facets": [
      "axis_a (grouped by area, expandable)",
      "axis_b (grouped by base / overlay / state)",
      "source_app",
      "captured_platform",
      "language",
      "confidence (range slider, on primary label)",
      "overlay_present (toggle)",
      "needs_review (toggle)",
      "classified_at (date range)"
    ]
  },
  "ui_requirements": [
    "Gallery grid of thumbnails as the default view; lazy-loaded.",
    "Faceted filtering: multi-select WITHIN a facet, AND ACROSS facets, per-facet AND/OR toggle. Matching MUST include secondary labels, not just primary.",
    "Live facet counts (screenshots per label) so a PM can audit coverage at a glance.",
    "Full-text search over source_app, salient_text, rationale, and label display names.",
    "Detail view: full image + ALL tags on both axes (primary vs secondary, confidence), source app, platform, model+tier, taxonomy_version, timestamp.",
    "Cross-app pattern view: pivot on a single Axis-B type across every app, and on a single Axis-A slug across competitors.",
    "Coverage matrix: Axis-A screens (rows) x source_app (columns), cells = count.",
    "Review queue: needs_review == true; show review_reason.",
    "Human-in-the-loop correction: override/add/remove a label on either axis or reassign primary; written back as authoritative overrides the classifier respects and never overwrites.",
    "Export the current filtered set (CSV of records + a zip of images)."
  ],
  "acceptance_criteria": [
    "Every §7 field is filterable or visible somewhere in the UI.",
    "Multi-label screens appear under ALL their labels' filters, on both axes.",
    "A corrected label survives re-classification and taxonomy-version bumps."
  ]
}
```

---

## Part 2 — Concrete directions for this codebase

### 2.1 Data model you are building on (already migrated to Neon)

Defined in `prisma/schema.prisma`, pushed via `npx prisma db push`. Read via
`import { prisma } from "@/lib/db"`.

- **`ScreenshotClassification`** (`screenshot_classifications`) — one row per
  `(screenshotId, taxonomyVersion)`. Fields: `contentHash`, `taxonomyVersion`,
  `sourceApp`, `sourceAppConfidence`, `capturedPlatform`, `language`, `modelTier`,
  `modelName`, `modelMode`, `overlayPresent`, `salientText` (`String[]`), `rationale`,
  `needsReview`, `reviewReason`, `classifiedAt`. Relation `labels` +
  `screenshot` (→ existing `Screenshot`, which has `s3Url` + `exchange`).
- **`ClassificationLabel`** (`classification_labels`) — the faceting workhorse. One row
  per `(classification, axis, label)`. Fields: `axis` (`"A"` | `"B"`), `label` (exact
  §4 slug), `isPrimary`, `confidence`. Indexed on `[axis,label]`, `label`, `isPrimary`.
  **This is why multi-label filtering is a simple join** — a screenshot appears under
  every one of its label rows, primary or secondary.
- **`LabelOverride`** (`label_overrides`) — the §8 feedback loop. Keyed by
  `screenshotId` (NOT by classification), so corrections survive re-classification and
  taxonomy bumps. Fields: `axis`, `label`, `action` (`"add"` | `"remove"` |
  `"set_primary"`), `confidence?`, `reviewedBy?`, `note?`. Unique on
  `[screenshotId, axis, label, action]`. The backfill script applies these as an
  authoritative post-pass; the write endpoint below creates them.
- **`TaxonomyGapLog`** (`taxonomy_gap_log`) — out-of-scope proposals for PM review
  (`proposedArea`, `proposedScreen`, `reason`, `resolved`).

Vocabulary + display helpers live in **`src/lib/taxonomy.ts`**: `AXIS_A_AREAS`,
`AXIS_B_GROUPS`, `AXIS_A_LABELS`, `AXIS_B_LABELS`, `axisAArea()`, `axisBGroup()`,
`displayLabel()`, `TAXONOMY_VERSION`. The facet UI should render groups/areas from
these — do not hardcode label lists in components.

### 2.2 New backend (Next.js App Router, under `src/app/api/`)

Follow the existing route-handler convention (see `src/app/api/screenshots`,
`src/app/api/search`). Use `prisma` from `@/lib/db` and presigned image URLs from
`getPresignedScreenshotUrl(s3Key)` in `@/lib/s3` (the `Screenshot.s3Url` is an S3 key,
not a URL).

1. **`GET /api/classifications`** — faceted search read-model. Query params:
   - `axisA`, `axisB` (repeatable), `sourceApp`, `platform`, `language`,
     `overlay` (bool), `needsReview` (bool), `minConfidence`, `dateFrom`, `dateTo`,
     `q` (full-text), `matchMode=and|or` per axis, `page`, `pageSize`.
   - Filter on `TAXONOMY_VERSION` by default. Match against `ClassificationLabel` rows
     so **secondaries count** (`where: { labels: { some: { axis:"A", label:{ in } } } }`;
     for AND-mode across N labels, require N `some` clauses / a grouped count).
   - Full-text `q`: `OR` over `sourceApp`, `rationale`, `salientText` (array `has`/
     `hasSome`), and label display names (resolve `q` → matching slugs via
     `src/lib/taxonomy.ts` then include those in the label filter).
   - Return records joined to `screenshot` with a presigned thumbnail URL, plus a
     `total` for pagination.
2. **`GET /api/classifications/facets`** — live facet counts for the current filter set.
   Return `{ axisA: {slug: count}, axisB: {...}, sourceApp, platform, language, ... }`.
   Implement with `groupBy` on `ClassificationLabel` (joined to filtered classification
   ids) so counts reflect the active cross-facet filter (counts include secondaries).
3. **`GET /api/classifications/[screenshotId]`** — detail: full record, all labels both
   axes with `isPrimary`/`confidence`, `sourceApp`, `platform`, `modelName`+`modelTier`,
   `taxonomyVersion`, `classifiedAt`, `salientText`, `rationale`, applied overrides,
   full-size presigned image URL.
4. **`GET /api/classifications/coverage-matrix`** — Axis-A slug (rows) × `sourceApp`
   (cols) → count. `groupBy` over `ClassificationLabel where axis="A"` joined to
   classification `sourceApp`.
5. **`GET /api/classifications/pattern?axisB=ui:bottom_sheet`** (and
   `?axisA=deposit:address_qr`) — cross-app pivot: all screenshots carrying that label,
   grouped by `sourceApp`, for design-research mode.
6. **`POST /api/classifications/[screenshotId]/override`** — the feedback loop write.
   Body `{ axis, label, action, confidence?, reviewedBy?, note? }`. Upsert a
   `LabelOverride` (respect the unique key), then re-apply overrides to the current
   `ScreenshotClassification`/`ClassificationLabel` rows so the UI reflects it
   immediately. **Never delete or mutate a `LabelOverride` during classification.**
   Validate `label` against `isValidAxisA`/`isValidAxisB` from `taxonomy.ts`.
7. **`GET /api/classifications/export`** — same filters as search; stream a CSV of
   records and (optionally) a zip of the filtered images (presigned fetch server-side).
8. **`GET /api/classifications/gaps`** — list `TaxonomyGapLog` (unresolved first) for the
   PM to approve/reject vocabulary expansions.

Guard write/export routes with the existing admin pattern (`src/lib/adminToken.ts`,
already used by `src/app/api/admin`).

### 2.3 New UI (App Router pages under `src/app/`)

Build on the **`design-system` skill** (StableX "Product Terminali", Wealthsimple-
inspired) — invoke it before styling anything so this stays on-brand with the existing
`exchanges`, `matrix`, `news` pages. Reuse Radix + `lucide-react` + `sonner` + `recharts`
already in the project.

- **`/screens`** — default gallery. Left rail = faceted filter panel (Axis A grouped by
  area/expandable, Axis B grouped by base/overlay/state, source_app, platform, language,
  confidence slider, overlay toggle, needs_review toggle, date range). Each facet shows
  **live counts** and a per-facet **AND/OR** toggle. Main = lazy-loaded thumbnail grid
  (presigned URLs), primary Axis-A + Axis-B chips overlaid, `needs_review` badge.
- **`/screens/[id]`** — detail view per §2.2.3, with the inline **correction UI**
  (add/remove label on either axis, reassign primary) posting to the override endpoint
  and toasting success. Show provenance (model+tier, taxonomy_version, timestamp) so PMs
  trust the record.
- **`/screens/patterns`** — cross-app pattern pivot (pick an Axis-B type or Axis-A slug →
  gallery grouped by `sourceApp`).
- **`/screens/coverage`** — the coverage matrix (Axis-A rows × source_app cols, cell =
  count, click-through to the filtered gallery). Highlights gaps in competitor coverage.
- **`/screens/review`** — review queue: `needs_review == true`, `review_reason` shown,
  fast-correct inline. Add a tab for the taxonomy gap log.
- **Export** button on the gallery: calls the export endpoint with the active filters.

### 2.4 Conventions to respect

- Images: `Screenshot.s3Url` is an **S3 key** → always resolve via
  `getPresignedScreenshotUrl` / `getScreenshotUrl` (`@/lib/s3`); never build URLs by hand.
- Always scope reads to `TAXONOMY_VERSION` from `@/lib/taxonomy` (a version bump replaces
  the corpus; the UI should not mix versions).
- Filtering must go through `ClassificationLabel` rows (never the void legacy
  `Screenshot.aiClassification` field) so secondaries are always matched.
- Facet labels/groups come from `taxonomy.ts` helpers, not hardcoded strings.

### 2.5 Acceptance (maps to §8)

- Every §7 field is filterable or visible (search rail + detail view cover all fields).
- Multi-label screens surface under all their labels on both axes (guaranteed by the
  per-label `ClassificationLabel` join).
- A corrected label survives re-classification and taxonomy bumps (guaranteed by
  `LabelOverride` being screenshot-keyed and re-applied by the classifier post-pass).
