# DESIGN.md — English Studio Japan

The visual system as built. Recorded from the shipped code, not from intent —
where this disagrees with the code, the code is right and this file is stale.

**World:** Alphabet Storm — letters condense out of weather into meaning.
Chosen by the user in round 3 of the concept roll, over the assigned direction.

**Mode:** Operate throughout. The landing page is the one Persuade surface and
inherits the world rather than leading it.

---

## 1. The load-bearing idea

State is a **value-and-density ladder, not a colour scale.**

The world's grammar — type scattering when unsettled, condensing when settled —
maps onto what this product actually tracks:

| State | Form | Where |
|---|---|---|
| open | dashed outline | a slot that exists but holds nothing |
| pending | half-filled mark | payment in flight, booking unconfirmed |
| settled | solid ink | confirmed, completed, saved |
| spent | hollow, struck through | cancelled, elapsed |

Two consequences, and they are why this survives:

1. **It inverts.** Light and dark are the same ladder with ground and ink
   swapped. There are no per-state dark variants to forget. The codebase now has
   **zero `dark:` utilities** — theming is entirely token-driven.
2. **Nothing is encoded by colour alone.** Every state carries a mark shape and a
   text label as well, which is what WCAG 1.4.1 asks for and what the previous
   colour-only chips did not satisfy.

`warn` (amber) and `error` (red) sit deliberately *outside* the ladder so they
read as interruptions to it. They are the only hues in the system.

---

## 2. Colour

Tokens live in `apps/web/src/app/globals.css`. Components must use tokens, never
raw palette utilities — the migration removed 273 of those and the count should
stay at zero.

**Storm values (decorative only).** `--storm-paper #fafaf8`, `--storm-ink
#0a0a0a`, `--storm-silver #c9cdd1`, `--storm-rain #8d9299`, `--storm-mist
#edeeee`.

> Silver is **1.53:1** on paper and rain is **3.00:1**. They carry dispersal
> marks and atmosphere. They are not text colours and not UI-state colours —
> using silver for a status mark or a slot border fails WCAG 1.4.11, which is a
> mistake this system already made once and corrected.

**Interface tokens, verified.** Light: text `#0a0a0a` (18.94:1 on canvas), muted
`#666b72` (5.14:1), primary is ink with paper on it (18.94:1), warn `#96580a`
(5.44:1), danger `#b91c1c` (6.19:1). Dark inverts: text `#fafaf8`, muted
`#9aa0a8` (7.42:1), warn `#fbbf24` (11.71:1), danger `#f87171` (7.07:1).

**Primary is ink, not a brand hue.** The system needs no accent colour to make a
call-to-action obvious; solid black on paper (and paper on ink at night) is the
strongest button available and carries 18.9:1 in both themes.

**Rule:** any new colour is checked numerically before it ships. Every value
above was computed, not eyeballed. The old palette failed AA on its primary CTA
(3.74:1) and its muted text (4.23:1) precisely because it wasn't.

---

## 3. Type

`--font-sans: var(--font-archivo), var(--font-mplus1)` — one stack, per-glyph
fallback, so Latin takes Archivo and Japanese takes M PLUS 1 automatically.

**M PLUS 1 was chosen by test, not by taste.** At weight 900 it holds the same
stroke density as Archivo 900; Zen Kaku Gothic New renders visibly lighter beside
it and would undercut every mixed ja/en display line. Noto Sans JP matches but is
the default reflex. Rendered comparison at display, UI and grid sizes decided it.

- Display: `font-black`, tracking `-0.035em` to `-0.04em`, capped at 6rem.
- Body: measure 54–70ch.
- **All figures that sit in a column or change in place take `tabular-nums`** —
  times, prices, counts, dates, table cells.
- `JetBrains Mono` is `--font-mono`, for genuine data only, never as a
  "technical" costume.

**Kana are weather, kanji are stone.** In `SettleText`, phonetic characters
(kana, Latin) scatter and settle; kanji land solid from the first frame, because
breaking a semantic unit into pieces reads as the interface glitching.

---

## 4. Composition

The page is the paper. Structure comes from **rules and space**, not containers.

Refused, and these are bans rather than defaults:

- Same-size card grids as page structure; nested cards.
- Eyebrow/kicker labels above headings. Where a heading must exist for semantics
  but would read as an eyebrow, it goes `sr-only` and the content carries the
  weight — see `DashboardNextLesson`.
- Section numbers, unless the sequence itself is information (booking steps are;
  a list of benefits is not).
- Gradient text, decorative glass, coloured left-borders, hard offset shadows.

**Focal moments.** One thing per surface is the largest thing on it, at display
scale: the next lesson's time on the dashboard, the amount at checkout, the
headline on the landing page. Everything else steps down from there.

---

## 5. Motion

**One authored moment: the settle.** `storm-settle` runs on genuine state
changes only — never on hover, never on press, never on mount of a dense grid.
Transform and opacity only, so it composites.

`prefers-reduced-motion` gets a **real alternative, not a kill**: the settle
still communicates that state changed, arriving as one quiet fade instead of
scattered characters.

The availability grid has **no transitions at all**. It is clicked dozens of
times a morning and animation there is a tax on the workflow the brief protects.

---

## 6. Primitives

`apps/web/src/components/ui/` — reach for these before writing classes.

| Primitive | Owns |
|---|---|
| `button.tsx` | every button and button-styled link; `buttonClasses()` for `<Link>` |
| `field.tsx` | `Field` + `Input`/`Textarea`/`Select`; label association, `aria-describedby`, `aria-invalid` |
| `modal.tsx` | native `<dialog>`, so focus trap and Escape come from the platform |
| `status.tsx` | the state ladder |
| `slot-state.ts` | slot appearance shared by all five calendar surfaces |
| `form-status.tsx` | save feedback, announced via `role="status"` / `role="alert"` |
| `settle-text.tsx` | the settle |
| `app-card`, `empty-state`, `inline-alert`, `page-header`, `skeleton` | pre-existing, retained |

Shared formatters, because hand-rolled ones drifted: `lib/format-money.ts`
(`formatYen`), `lib/format-lesson-datetime.ts` (`formatLessonRange` — states the
date once for same-day lessons).

**Never format a date or a price in a server component with
`toLocaleString()`.** With no locale and no timezone it renders in the *server's*
zone — this shipped on the checkout page, showing Japanese students UTC wall time
for the lesson they were paying for. Use `LocalBookingDateTimeRange`,
`LocalDateTime`, or `formatYen` with an explicit locale.

---

## 7. Size and reach

Touch targets: `md`/`lg` buttons clear 44px; `sm` is 36px and exists only for
genuinely dense surfaces. Nothing interactive goes below the 24px WCAG 2.5.8
floor — several controls were at ~20px and were raised.

Mobile-first: 267 `sm:` against 30 `md:` and 17 `lg:`. Wide-screen layouts are
the least-tuned part of the system and the most likely place to find slack.

Pinch-zoom stays enabled. `userScalable: false` fails WCAG 1.4.4; the iOS
focus-zoom it was guarding against is handled by the 16px form-control rule.

---

## 8. Known gaps

- Study surfaces and teacher ops still carry their **pre-redesign compositions**.
  They are tokenised, accessible and on the primitives, but not recomposed.
- Admin and org/school received cross-cutting fixes only — no recomposition.
- The impeccable **finish-reviewer pass has not been run**.
- `dashboard-quick-review`, `chat-panel` and the study components remain the
  largest un-reviewed client components.
