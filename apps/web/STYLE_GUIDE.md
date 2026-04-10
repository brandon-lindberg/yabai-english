# English Studio — Web Style Guide

Use this document (and `src/app/globals.css`) as the reference for visual consistency. Prefer **semantic tokens** and **Tailwind theme colors** over hard-coded hex, except where noted.

---

## Stack

- **Tailwind CSS v4** with `@import "tailwindcss"` and `@theme inline` in `globals.css`.
- **Fonts:** [Geist Sans](https://vercel.com/font) and [Geist Mono](https://vercel.com/font) via `next/font/google` in `src/app/layout.tsx` (`--font-geist-sans`, `--font-geist-mono`).
- **Season + theme:** `data-season` and `data-theme` on `<html>`, initialized by `src/lib/theme-init-script.ts` (`beforeInteractive` script in root layout).

---

## Seasonal palettes (brand colors)

These four accent slots are fixed hex values. They appear as `--p1` … `--p4` on `html` and drive backgrounds, borders, chips, and accents via `color-mix` and semantic tokens in `globals.css`.

| Season | p1 | p2 | p3 | p4 |
|--------|----|----|----|-----|
| **Spring** | `#C3FF93` | `#FFDB5C` | `#FFAF61` | `#FF70AB` |
| **Summer** | `#FA5C5C` | `#FD8A6B` | `#FEC288` | `#FBEF76` |
| **Autumn** | `#D6D46D` | `#F4DFB6` | `#DE8F5F` | `#9A4444` |
| **Winter** | `#0B2D72` | `#0992C2` | `#0AC4E0` | `#F6E7BC` |

**Season selection (Northern Hemisphere, local calendar month):**

| Months | Season |
|--------|--------|
| Mar–May | spring |
| Jun–Aug | summer |
| Sep–Nov | autumn |
| Dec–Feb | winter |

### Per-season color allocation

**Spring** — fresh, playful:

| Role | Light | Dark |
|------|-------|------|
| Gradient | lime `#d8ffc0` → gold `#fff0b0` → blush `#ffd6e8` | `#0e1a08` → `#1e1808` → `#1c0c16` |
| Surface | `#fefff5` (green-tinted) | `#1a2c10` |
| Primary | `#FF70AB` (p4 hot pink) | `#FF70AB` |
| Link | `#d63384` (dark pink) | `#FFDB5C` (p2 gold) |
| Accent | `#FFAF61` (p3 orange) | `#FFAF61` |
| Chip | `#fff0a8` (p2 gold tint) | `#2c1a24` (pink-tinted dark) |
| Border | `#eec868` (gold) | `#3a5820` (green) |

**Summer** — warm, energetic:

| Role | Light | Dark |
|------|-------|------|
| Gradient | sun `#fff4c0` → peach `#ffe0c0` → coral `#ffd0d0` | `#1e0e0e` → `#201510` → `#1c1a08` |
| Surface | `#fffcf5` (warm) | `#2c1818` |
| Primary | `#FA5C5C` (p1 coral) | `#FBEF76` (p4 sun yellow) |
| Link | `#d44030` (dark red) | `#FD8A6B` (p2 peach) |
| Accent | `#FBEF76` (p4 yellow) | `#FA5C5C` (p1 coral) |
| Chip | `#fde0a0` (p3 gold tint) | `#2e1c14` (warm dark) |
| Border | `#f8a880` (peach) | `#4a2020` (warm) |

**Autumn** — cozy, earthy:

| Role | Light | Dark |
|------|-------|------|
| Gradient | cream `#f8f0c0` → olive `#ece898` → tan `#f0cca8` | `#1a1208` → `#201808` → `#1e100e` |
| Surface | `#fefcf0` (warm off-white) | `#281c10` |
| Primary | `#9A4444` (p4 deep red) | `#DE8F5F` (p3 orange) |
| Link | `#b05028` (dark orange) | `#D6D46D` (p1 olive gold) |
| Accent | `#DE8F5F` (p3 orange) | `#F4DFB6` (p2 cream) |
| Chip | `#eee098` (p1 olive tint) | `#302014` (warm dark) |
| Border | `#dea868` (warm gold) | `#3e2818` (earth) |

**Winter** — cool, elegant:

| Role | Light | Dark |
|------|-------|------|
| Gradient | ice `#dceeff` → cyan `#c8f0f8` → warm `#f6f0d8` | `#040e22` → `#082848` → `#0a1830` |
| Surface | `#f4f8ff` (blue-tinted) | `#0c2858` |
| Primary | `#0B2D72` (p1 navy) | `#0AC4E0` (p3 cyan) |
| Link | `#0880aa` (dark cyan) | `#F6E7BC` (p4 cream) |
| Accent | `#0AC4E0` (p3 cyan) | `#0992C2` (p2 blue) |
| Chip | `#f0e8c0` (p4 warm tint) | `#102848` (navy) |
| Border | `#78c0e0` (cyan) | `#0c3a6a` (deep blue) |

---

## Light and dark mode

- **Attribute:** `data-theme="light"` | `data-theme="dark"` on `<html>`.
- **Persistence:** `localStorage` key **`english-platform-theme`**, values `light` or `dark`. Default when unset: **`light`** (does not follow system preference unless we add that later).
- **Do not** rely on Tailwind’s `dark:` variant tied to a `class="dark"` on `<html>` for brand colors — palette and semantics come from **`data-theme`** and CSS variables.
- **System UI:** `color-scheme` is set per theme in `globals.css` for native controls.

---

## How palette colors map to UI

Every palette color (p1–p4) must be **visibly present** in each season. The mapping strategy:

| UI element | Which palette color | How it shows up |
|------------|-------------------|-----------------|
| **Body gradient start** | Tinted from p1 | Visible hue, not washed out — `--app-bg` |
| **Body gradient middle** | Tinted from p2 | The sweep color — `--app-bg-mid` |
| **Body gradient end** | Tinted from p4 | Contrasting endpoint — `--app-bg-end` |
| **Primary button** | One of p1–p4 (the boldest) | At or near full saturation — `--app-primary` |
| **Links** | Different palette color or accessible derivative | `--app-link` |
| **Accent** (admin badge, eyebrow) | Another palette color | `--app-accent` |
| **Chips / tags** | Light tint of remaining color | `--app-chip` |
| **Borders** | Warm / visible — not invisible pastel | `--app-border` |

The body gradient is a **3-stop** sweep at `160deg`:

```css
background: linear-gradient(160deg, --app-bg 0%, --app-bg-mid 45%, --app-bg-end 100%);
```

---

## Semantic color tokens (CSS)

Defined per `data-season` + `data-theme` in `globals.css`. Use these when you need a raw `var()` (e.g. hover washes, header border):

| Token | Role |
|-------|------|
| `--app-bg` | Page gradient start (tinted from p1) |
| `--app-bg-mid` | Page gradient middle (tinted from p2) |
| `--app-bg-end` | Page gradient end (tinted from p4) |
| `--app-surface` | Cards, header tint base (lightly palette-tinted, not pure white/black) |
| `--app-text` | Primary text |
| `--app-muted` | Secondary / helper text |
| `--app-border` | Borders, dividers (visible palette hue, not invisible) |
| `--app-primary` | Primary button / strong brand actions (a bold palette color) |
| `--app-primary-fg` | Text/icons on primary |
| `--app-link` | Links (different palette color from primary) |
| `--app-accent` | Highlights, eyebrow labels, admin nav emphasis |
| `--app-chip` | Filled chips / tags (light tint of a palette color) |
| `--app-hover` | Hover background tint |
| `--app-header-border` | Header bottom border |
| `--app-success-*` | Success backgrounds, border, text |
| `--app-warn-*` | Warning surfaces |
| `--app-danger` | Error / destructive emphasis |

---

## Tailwind theme mapping

From `@theme inline` in `globals.css` — prefer these utilities for everyday UI:

| Utility | Maps to |
|---------|---------|
| `bg-background` | `--app-bg` |
| `text-foreground` | `--app-text` |
| `text-muted` | `--app-muted` |
| `bg-surface` | `--app-surface` |
| `border-border` | `--app-border` |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `text-link` | Links |
| `text-accent` | Accent text |

---

## Typography

### Families

| Role | Implementation |
|------|----------------|
| **Sans (UI)** | `font-sans` → Geist Sans (`var(--font-geist-sans), system-ui, sans-serif` on `body`) |
| **Mono** | `font-mono` → Geist Mono (tokens, codes) |

### Type scale (Tailwind — use consistently)

| Class | Typical use |
|-------|-------------|
| `text-xs` | Fine legal/helper copy, compact meta (e.g. theme toggle) |
| `text-sm` | Nav links, buttons, form labels, body in dense UIs |
| `text-base` | Default reading when not using `text-sm` |
| `text-lg` | Hero subtitle, emphasized paragraphs |
| `text-xl` | Short emphasis (e.g. quiz result title) |
| `text-2xl` | Page titles (`h1` on inner pages) |
| `text-4xl` / `sm:text-5xl` | Marketing hero headline |

### Font weights

- **Semibold / bold** for headings and app wordmark: `font-semibold`, `font-bold`.
- **Medium** for nav and buttons: `font-medium`.

### Letter spacing

- **Tight headlines:** `tracking-tight` on large titles.
- **Eyebrow / label:** `uppercase tracking-wide` with `text-sm` (see home hero pattern).

---

## Layout and spacing

- **Content width:** `max-w-5xl` + horizontal padding `px-4 sm:px-6` (header uses this pattern).
- **Header:** `sticky top-0 z-50`, height `h-14`, bottom border `border-[var(--app-header-border)]`, glass: `bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] backdrop-blur-md`.
- **Page structure:** `body` is `flex min-h-full flex-col`; main areas should grow naturally; background is the **fixed gradient** on `body` (keep meaningful surfaces `bg-surface` or transparent where appropriate).

---

## Radius, borders, and elevation

- **Pill buttons / nav actions:** `rounded-full`.
- **Inputs and compact cards:** `rounded-lg`.
- **Larger cards / option lists:** `rounded-xl` / `rounded-2xl`.
- **Borders:** `border border-border`; use `border-dashed` only for empty/placeholder states when intentional.

There is no shared shadow token yet — if adding shadows, define a `--app-shadow-*` in `globals.css` and document it here.

---

## Interactive patterns

- **Primary CTA:** `rounded-full bg-primary px-4 py-2` (or `px-5 py-2.5` for hero), `text-sm font-semibold` or `font-medium`, `text-primary-foreground`, `hover:opacity-90`.
- **Secondary / ghost:** `rounded-full border border-border bg-surface`, same text/hover as header buttons, **`hover:bg-[var(--app-hover)]`**.
- **Destructive / validation:** prefer `style={{ color: "var(--app-danger)" }}` or success tokens only when Tailwind utilities are insufficient.
- **Links in content:** `text-link` with hover states that don’t rely on unrelated palette hues.

---

## Icons and imagery

- No mandated icon set in CSS — keep stroke/fill colors aligned with `foreground`, `muted`, or `accent` as appropriate.

---

## i18n / `html`

- Root `<html lang="ja">` is set in layout; RTL is handled via `className` when needed. Do not reset `lang` per component without a deliberate locale strategy.

---

## Files to keep in sync

| Concern | File(s) |
|---------|---------|
| Palettes + semantic tokens | `src/app/globals.css` |
| Tailwind color/font theme | `globals.css` `@theme inline` |
| Font loading | `src/app/layout.tsx` |
| Season + theme bootstrap | `src/lib/theme-init-script.ts` |
| Theme toggle storage key | `src/components/theme-toggle.tsx` (must match script) |

When you change tokens or naming, update **this guide** in the same PR.
