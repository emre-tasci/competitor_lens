---
name: palette-tokens
description: Where the StableX color palette and design tokens are defined, with the key oklch values
metadata:
  type: project
---

StableX "Product Terminali" (Next.js 15 App Router, React 19, Tailwind v4, radix-ui primitives in `src/components/ui/`).

All theme tokens live in `src/app/globals.css` as CSS variables under `:root` and `.dark`, exposed to Tailwind via `@theme inline`.

**Brand accent (the ONLY brand hue — keep it):**
- `--primary: oklch(0.53 0.24 27)` ≈ `#dc0005` (StableX red). Dark mode: `oklch(0.63 0.22 27)`.
- Hardcoded `#dc0005` appears in the nav logo box (`Navigation.tsx`) and previously in `.gradient-text`.

**Neutrals:** background `oklch(0.985 0 0)`, foreground `oklch(0.145 0.005 0)`, card `oklch(1 0 0)`, muted-foreground `oklch(0.5 0.01 0)`, border `oklch(0.92 0.005 0)`. Dark bg `oklch(0.13 0.005 0)`.

**Status colors:** success (green 145), warning (amber 75), info (blue 230). Used only in `FeatureStatusBadge` and status chips — NOT brand hues, keep them functional/muted.

**Radius:** `--radius: 0.625rem` (10px); scale sm/md/lg/xl/2xl derived.

Rule: red is the single accent, used sparingly (logo, primary CTA, active nav, progress bars, data highlights). Headings are near-black foreground, NOT red. Everything else leans on neutrals + whitespace.
