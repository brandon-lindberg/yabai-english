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

---

## Light and dark mode

- **Attribute:** `data-theme="light"` | `data-theme="dark"` on `<html>`.
- **Persistence:** `localStorage` key **`english-platform-theme`**, values `light` or `dark`. Default when unset: **`light`** (does not follow system preference unless we add that later).
- **Do not** rely on Tailwind’s `dark:` variant tied to a `class="dark"` on `<html>` for brand colors — palette and semantics come from **`data-theme`** and CSS variables.
- **System UI:** `color-scheme` is set per theme in `globals.css` for native controls.

---

## Semantic color tokens (CSS)

Defined per `data-season` + `data-theme` in `globals.css`. Use these when you need a raw `var()` (e.g. hover washes, header border):

| Token | Role |
|-------|------|
| `--app-bg` | Page gradient start/end |
| `--app-bg-mid` | Page gradient middle |
| `--app-surface` | Cards, header tint base |
| `--app-text` | Primary text |
| `--app-muted` | Secondary / helper text |
| `--app-border` | Borders, dividers |
| `--app-primary` | Primary button / strong brand actions |
| `--app-primary-fg` | Text/icons on primary |
| `--app-link` | Links |
| `--app-accent` | Highlights, eyebrow labels, admin nav emphasis |
| `--app-chip` | Subtle filled chips / tags |
| `--app-hover` | Hover background mix for neutral controls |
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
