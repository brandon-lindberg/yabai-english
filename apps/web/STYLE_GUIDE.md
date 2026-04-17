# English Studio — Web Style Guide

Use this document (and `src/app/globals.css`) as the reference for visual consistency. Prefer **semantic tokens** and **Tailwind theme colors** over hard-coded hex, except where noted.

---

## Stack

- **Tailwind CSS v4** with `@import "tailwindcss"` and `@theme inline` in `globals.css`.
- **Fonts:** [Geist Sans](https://vercel.com/font) and [Geist Mono](https://vercel.com/font) via `next/font/google` in `src/app/layout.tsx` (`--font-geist-sans`, `--font-geist-mono`).
- **Theme:** `data-theme="light"` | `data-theme="dark"` on `<html>`, initialized by `src/lib/theme-init-script.ts` (`beforeInteractive` script in root layout). Storage key: **`english-platform-theme`**.

---

## Brand palette (single calm system)

One restrained palette for light and dark (no seasonal rotation). Core idea: **cool neutral canvas**, **white / deep slate surfaces**, **teal primary** for trust.

Semantic CSS variables (see `globals.css`):

| Token | Role |
|-------|------|
| `--app-canvas` | Page background (solid) |
| `--app-surface` | Cards, panels |
| `--app-elevated` | Inputs, inset areas (`bg-background` in Tailwind) |
| `--app-text` / `--app-muted` | Body and helper text |
| `--app-border` | Borders and dividers |
| `--app-primary` / `--app-primary-fg` | Primary actions |
| `--app-link` | Text links |
| `--app-accent` | Secondary emphasis |
| `--app-chip` | Soft highlight backgrounds |
| `--app-hover` | Hover wash |
| `--app-header-border` | Sticky header border |
| `--app-success-*` / `--app-warn-*` / `--app-danger` | Status surfaces |
| `--app-warning-*` | Alias for warn (legacy classnames) |
| `--app-focus-ring` | `:focus-visible` outline |

---

## Light and dark mode

- **Persistence:** `localStorage` key **`english-platform-theme`**, values `light` or `dark`. Default when unset: **`light`**.
- **Do not** rely on Tailwind’s `dark:` variant for brand colors — semantics come from **`data-theme`** and CSS variables.
- **System UI:** `color-scheme` is set per theme in `globals.css`.

---

## Tailwind theme mapping

From `@theme inline` in `globals.css`:

| Utility | Maps to |
|---------|---------|
| `bg-background` | `--app-elevated` (inputs, inset panels) |
| `text-foreground` | `--app-text` |
| `text-muted` | `--app-muted` |
| `bg-surface` | `--app-surface` |
| `border-border` | `--app-border` |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `text-link` | Links |
| `text-accent` | Accent text |
| `text-destructive` | Error emphasis |

Page background is **`body { background-color: var(--app-canvas) }`** — not the `bg-background` utility.

---

## Shared UI components

- **`PageHeader`**, **`AppCard`**, **`EmptyState`**, **`InlineAlert`** — `src/components/ui/` for consistent page framing and alerts.

---

## Typography

### Families

| Role | Implementation |
|------|----------------|
| **Sans (UI)** | `font-sans` → Geist Sans |
| **Mono** | `font-mono` → Geist Mono |

### Type scale

| Class | Typical use |
|-------|-------------|
| `text-xs` | Meta, compact labels |
| `text-sm` | Nav, buttons, form labels |
| `text-base` | Default reading |
| `text-lg` | Section titles |
| `text-2xl` / `sm:text-3xl` | Page titles (`PageHeader`) |
| `text-4xl` / `sm:text-5xl` | Marketing hero (signed-out home) |

### Font weights

- **Semibold** for headings; **medium** for nav and controls.

---

## Layout and spacing

- **Content width:** `max-w-5xl` or `max-w-6xl` + `px-4 sm:px-6`.
- **Header:** `sticky top-0 z-50`, border `border-[var(--app-header-border)]`, glass: `bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-md`.
- **Page structure:** `body` is `flex min-h-full flex-col`; main content uses neutral surfaces (`bg-surface` on cards).

---

## Radius, borders, and elevation

- **Pill actions:** `rounded-full`.
- **Inputs:** `rounded-lg` / `rounded-xl`.
- **Cards:** `rounded-2xl` with `border border-border` and optional `shadow-sm`.

---

## Interactive patterns

- **Primary CTA:** `rounded-full bg-primary … text-primary-foreground hover:opacity-90`.
- **Secondary:** `rounded-full border border-border` + **`hover:bg-[var(--app-hover)]`**.
- **Focus:** global `:focus-visible` uses `--app-focus-ring`.

---

## Shell navigation

- **`getHeaderPrimaryNavLinks`** — `src/lib/shell/header-nav-links.ts` defines role-based primary nav (students: dashboard, book, learn, schedule, optional placement; teachers: dashboard, schedule; admins: dashboard, admin).
- **`SiteHeader`** — `src/components/shell/site-header.tsx`; account menu includes profile and integrations links.

---

## Files to keep in sync

| Concern | File(s) |
|---------|---------|
| Semantic tokens | `src/app/globals.css` |
| Tailwind bridge | `globals.css` `@theme inline` |
| Font loading | `src/app/layout.tsx` |
| Theme bootstrap | `src/lib/theme-init-script.ts` |
| Theme toggle storage key | `src/components/theme-toggle.tsx` (must match script) |

When you change tokens or naming, update **this guide** in the same PR.
