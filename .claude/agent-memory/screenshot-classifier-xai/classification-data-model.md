---
name: classification-data-model
description: Where screenshot classifications live in Postgres/Prisma and the resumable filter to use
metadata:
  type: project
---

Classifications live in the **Neon Postgres** DB (Prisma), NOT in Excel, for this `competitor_lens` project. The deployed app reads them, so write to the live Neon DB.

Schema (`prisma/schema.prisma`):
- `FeatureCategory` (7 rows) groups `Feature` (52 rows). **These Features ARE the functionality categories.**
- `Screenshot`: `s3Url` (S3 key, pattern `screenshots/<Exchange>/<FeatureFolder>/<file>`), nullable `featureId` + `categoryId`, plus `aiClassification` (Json), `aiConfidence` (Float), `classifiedAt` (DateTime?). S3 bucket `competitor-lens-screenshots`, region `eu-central-1`.

**Why:** classify each screenshot → set `featureId` (+ that feature's `categoryId`).
**How to apply:**
- Resumable filter is `classifiedAt: null` (the runner stamps `classifiedAt` on every processed row, even if no feature matched). Re-running continues where it left off.
- A row can be `classifiedAt`-stamped but have `featureId = null` if the model returned a feature name not in the 52 — those are the "unmatched / needs review" set; query `classifiedAt NOT null AND featureId null`.
- Initial state 2026-06-30: 1491 screenshots, all unclassified.
