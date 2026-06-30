---
name: ui-patterns
description: Component locations, conventions, and the Wealthsimple-inspired decisions implemented in Product Terminali
metadata:
  type: project
---

Full design system is documented in `.claude/skills/design-system/SKILL.md` — read that first.

**Stack:** Next.js 15 App Router, React 19, Tailwind v4, radix-ui primitives in `src/components/ui/`, lucide-react, sonner, next-themes (dark mode wired in `layout.tsx`). UI text is Turkish — keep it.

**Key shared pieces:**
- `src/components/PageHeader.tsx` — canonical page title (eyebrow/title/description/action). Use on every top-level page instead of inline `<h1>` with icons.
- `src/components/ui/card.tsx` — border + `shadow-xs`; `.card-hover` (globals.css) for clickable cards.
- `src/components/ui/button.tsx` — `rounded-lg`.
- `src/components/FeatureMatrix.tsx` — sticky header + sticky first column with shadow dividers; neutral category rows; row hover highlight; mobile horizontal-scroll hint.

**Wealthsimple decisions already applied (don't regress these):**
- `.gradient-text` was repurposed in globals.css from red → `var(--foreground)` so every page title renders near-black, not red. Page titles must stay near-black foreground.
- Removed icon-in-`bg-primary/10`-box next to page titles across all pages.
- Removed `Sparkles` AI-tell icon (dashboard now uses `Star`).
- Removed decorative blurred glow blobs from the exchange detail hero.
- Stat groups use one bordered panel with `divide-x/divide-y` cells, not rows of separate cards.
- Headings get `tracking-tight` + balanced wrap + antialiasing via globals.css base layer; `prefers-reduced-motion` disables animations.

**Build/verify:** needs Node 20 (`nvm use 20`) + DATABASE_URL/DIRECT_URL/AWS_* env (build statically renders DB-hitting pages). See SKILL doc / task brief for the exact env block. Pre-existing unused-var ESLint *warnings* exist in several files — they don't fail the build.
