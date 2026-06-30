---
name: design-system
description: StableX "Product Terminali" design system — the Wealthsimple-inspired visual language, StableX color palette, typography, spacing, component patterns, and mobile rules. Reference this before building or changing any UI so new work stays consistent and on-brand.
---

# Product Terminali — Design System

A calm, confident, fintech-grade interface that helps a product team stay
current with the crypto-exchange industry — tracking competitors' features,
announcements, and news. The model is **Wealthsimple's structure and feel, rendered in StableX's
red-accented neutral palette**. The product is dense and data-heavy, so apply
Wealthsimple's restraint and whitespace without inflating dense tables into
airy marketing layouts.

## 1. Core principles (the "not AI-slop" rules)

- **One accent, used sparingly.** StableX red is the *only* brand hue. Reserve
  it for: the logo, primary CTAs, active nav, progress bars, focus rings, and
  small data highlights. Everything else is neutral.
- **Headings are near-black, never red.** Titles are confident, large, and
  tightly tracked — not colored, not gradient, not flanked by an icon-in-a-
  colored-box.
- **Borders over shadows.** Cards are defined by a subtle border and a whisper
  shadow (`shadow-xs`). Lift happens only on hover, gently.
- **Whitespace is the layout.** Prefer spacing and dividers to nested tinted
  boxes (`bg-muted/50` blocks-in-blocks). Let content breathe.
- **No AI tells.** Avoid: rainbow/purple gradients, glow blobs, emoji in
  headings, `Sparkles`/"✨ AI-powered" badges, over-rounded blobby cards,
  everything-centered layouts, decorative blurred circles.
- **Calm motion.** Subtle `fade-in-up` on load with small staggered delays;
  ease-in-out; honor `prefers-reduced-motion` (already handled in globals.css).

## 2. Color palette & tokens

All tokens are CSS variables in `src/app/globals.css` (`:root` + `.dark`),
exposed to Tailwind via `@theme inline`. **Never hardcode hex** — use tokens.

| Token | Light | Role |
|---|---|---|
| `--primary` | `oklch(0.53 0.24 27)` ≈ `#dc0005` | StableX red — sole accent |
| `--background` | `oklch(0.985 0 0)` | app background |
| `--foreground` | `oklch(0.145 0.005 0)` | near-black text / headings |
| `--card` | `oklch(1 0 0)` | card / panel surface |
| `--muted` / `--muted-foreground` | `oklch(0.965 0 0)` / `oklch(0.5 0 0)` | quiet fills / secondary text |
| `--border` | `oklch(0.92 0.005 0)` | hairline borders |
| `--success` / `--warning` / `--info` | green 145 / amber 75 / blue 230 | **functional status only** (FeatureStatusBadge), not brand |

Dark mode is fully tokenized and wired via `next-themes`; test both.
Derive variations with opacity (`bg-primary/10`, `text-primary`) or
`color-mix(in oklch, …)` — do not invent new hues.

## 3. Typography

- Font: Geist Sans (`--font-geist-sans`), Geist Mono for numerics/kbd.
- Base layer applies `tracking-tight` + balanced wrap to `h1–h4` and enables
  antialiasing + `font-feature-settings`.
- Scale:
  - Page title (`PageHeader`): `text-3xl md:text-4xl font-bold tracking-tight`
  - Section title: `text-lg font-semibold` / card title `text-base font-semibold`
  - Body: `text-sm`–`text-base text-muted-foreground leading-relaxed`
  - Meta / labels: `text-xs text-muted-foreground`, uppercase eyebrows use
    `tracking-[0.14em]`
- Use `tabular-nums` on all metrics/counts so numbers align.

## 4. Spacing & layout

- Page sections: `space-y-8`. In-card stacks: `space-y-3`–`space-y-6`.
- Content max width `max-w-[1400px]`, page padding `p-4 md:p-6` (in `layout.tsx`).
- Radius: cards `rounded-xl`, buttons/inputs `rounded-lg`, badges `rounded-full`.
- Stat groups: prefer **one bordered panel with divided cells**
  (`divide-x divide-y` grid) over a row of separate cards.

## 4b. Editorial primitives (v2 — the "human-crafted" layer)

These opinionated utilities live in `globals.css`. Reach for them instead of
default-shadcn card chrome so surfaces don't read as a uniform card matrix.

- **`.figure`** — put on EVERY metric/count. Tabular, tightly-set numerals
  (`tabular-nums`, `-0.025em`, `ss01`). Numbers are a design element.
- **`.eyebrow`** — muted, wide-tracked uppercase kicker preceded by a single
  red dot (`::before`). The recurring accent motif; replaces red title text and
  icon-in-a-box. Exposed via `PageHeader` `eyebrow` prop.
- **`.panel`** — the canonical surface: hairline border, `rounded-2xl`, whisper
  shadow + a faint inset top highlight (premium, layered). Prefer over `Card`
  for new modules. `.panel-feature` adds a barely-there red wash + tinted border
  for the single most important module on a view.
- **`.section-head`** — editorial section header: label row over a full-width
  hairline rule (magazine divider, not boxed chrome).
- **`.divide-rows`** — wrap a list; children get hairline top borders. Use for
  feed rows instead of nesting each item in a tinted box.
- **`.accent-edge`** — a 3px red rule pinned to a block's left edge; flags
  alerts / featured rows. Sparing, deliberate red.
- **`.reveal`** — staggered `fade-in-up` (smoother easing); honors reduced-motion.

**Hierarchy by scale (Mercury rule).** Don't render N identical stat tiles.
Establish a hero figure (e.g. dashboard "Kapsam" at `text-5xl/6xl`), two medium
figures (`text-3xl`), and a compact secondary strip (`text-lg`, label-left /
value-right). Asymmetric, intentional — not a uniform grid.

**Editorial composition.** Dashboard "Gündem" uses a main column + right rail,
each holding varied-density modules (featured `.panel-feature` analysis, paired
feed panels, a social rail), never a flat 2-col card matrix.

**PageHeader API:** `title`, `description?`, `eyebrow?`, `action?`, `meta?`,
`size?: "default" | "display"` (display = `text-4xl→6xl`, tighter tracking, for
the dashboard hero), `divider?`. The dashboard H1 is the bare product name
**"Product Terminali"** (no marketing tagline) with eyebrow "Canlı · Sektör paneli".

## 5. Component patterns

- **PageHeader** (`src/components/PageHeader.tsx`) — use on every top-level page.
  Props: `title`, `description?`, `eyebrow?`, `action?`. This is the canonical
  Wealthsimple header; do not reintroduce inline-icon/colored titles.
- **Card** (`ui/card.tsx`) — `border + shadow-xs`, generous `py-6 gap-6`. Add
  `card-hover` (globals.css) only for clickable cards; it lifts 2px with a soft
  shadow and a border highlight.
- **Button** (`ui/button.tsx`) — `rounded-lg`. `default` = solid red CTA (one
  primary action per view); use `outline`/`ghost`/`secondary` for the rest.
- **Badge** (`ui/badge.tsx`) — `rounded-full` pills. `default` red is loud; use
  `secondary`/`outline` for neutral metadata.
- **FeatureStatusBadge** — functional status colors (var/yok/beta/yakında).
  Compact variant = 28px icon chip for the matrix.
- **Navigation** (`Navigation.tsx`) — fixed left sidebar (desktop) / Sheet
  (mobile). Items are grouped into labelled clusters (Genel / Gündem / Ürün /
  Yönetim) — Mercury-style tiered IA, not a flat list. Active item =
  `bg-accent text-foreground` + a short 3px red rounded indicator pinned to the
  rail's left edge (icon turns red); inactive hover shows the indicator at 40%.
  Logo = red `#dc0005` box + wordmark + muted "Rakip ürün takibi" subline.
- **Feature Matrix** (`FeatureMatrix.tsx`) — sticky header + sticky first
  column, each with a right/down shadow for depth on scroll. Category rows are
  neutral (`bg-muted`), not red. Whole rows highlight on hover.

## 6. Mobile / responsive rules

- Design mobile-first; verify at **375px**.
- Sidebar collapses to a top bar + slide-over Sheet (already in `Navigation.tsx`).
- Wide tables (matrix) scroll horizontally inside a bordered container with a
  **sticky first column**; show a "kaydırın →" hint on small screens.
- Grids step down: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card lists;
  stat strips `grid-cols-2 … xl:grid-cols-7`.
- Headers stack: `flex-col sm:flex-row` with the action below the title on mobile.

## 7. Accessibility

- Maintain WCAG AA contrast (near-black on near-white; red only where contrast
  passes — prefer it on fills with white text, or as `text-primary` on light).
- Semantic HTML, visible focus rings (`focus-visible:ring-ring/50 ring-[3px]`),
  keyboard-navigable interactive targets, `sr-only` labels where icons stand alone.
- Respect `prefers-reduced-motion` (animations disabled in globals.css).

## 8. Copy

UI text is **Turkish** — keep it Turkish. Tone: clear, professional, calm.
