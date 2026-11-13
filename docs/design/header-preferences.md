# Compact header preferences

Scope: responsive header preferences and guest navigation. Operate mode. The user's two screenshots reject the previous standalone settings row and wide segmented controls. This brief updates the header part of the learning-journeys contract.

THESIS: Keep infrequent display preferences out of the learner's way, with clear access when needed.

OWN-WORLD: Preserve Alphabet Storm, Archivo/M PLUS 1, current ink/paper tokens, buttons and rules. Use a consistent 18px line-icon family; no new palette, font or raster assets.

STORY: The wordmark and sign-in stay visible. Desktop exposes two quiet preference icons. Mobile exposes one hamburger with visitor navigation and labelled preference rows containing those same icon controls. The selected learning subject remains distinct from interface language, with a compact context line beside the wordmark and a named change action.

FIRST VIEWPORT: One compact header bar. No dedicated language/theme row and no exposed mobile settings. Desktop icon controls sit beside sign-in; mobile tap targets remain comfortable despite visually small glyphs.

FORM: A precise refinement of the established header, not a new visual world. Shared disclosure dismissal, navigation items and preference controls serve desktop, mobile and account menus. Seed/comp selection is not applicable.

FINISH: Test red/green behavior, keyboard/outside dismissal, theme persistence, query-preserving locale navigation and responsive layout. Capture both themes and Japanese copy at mobile, intermediate and desktop sizes, including the user's screenshot context. Review against the user's rejected screenshots and preserve the incumbent design system.

## Verification and system compatibility

Compared the finished header with this contract, `docs/design/learning-journeys.md`, `DESIGN.md`, `PRODUCT.md`, `MIRROR_PLAN.md` section 3, the global tokens and the shared header/button/disclosure/icon sources. Alphabet Storm, Archivo/M PLUS 1, the existing light/dark ink-and-paper tokens and ruled page structure remain intact. The compact controls extend the button primitive with comfortable mobile targets, consistent 18px SVG icons and shared preference/disclosure behavior across desktop, mobile and account menus. No palette, font, token or shipping raster was introduced; `DESIGN.md` remains unchanged and the absent sidecar was not created for this ordinary refinement.

The final [finish review](../../.impeccable/review/header-finish-review.md) records **ship**, with no material fixes within the captured guest-header scope. It inspected all 30 full-viewport `root`, `open` and `japanese` captures at 320, 390, 524, 664 and 1440px in both themes. This documentation pass also compared the earlier `mirror/choice-1440-light.png` and `mirror/choice-390-light.png` captures with the final desktop root, open mobile menu and 320px Japanese dark captures: the standalone segmented settings row gives way to one compact bar, quiet desktop icons and a mobile hamburger with labelled preferences. The wordmark, sign-in and distinct subject/change context remain legible. The earlier app captures establish the rejected baseline; the original user screenshot files have expired. Signed-in account-menu visuals and live motion are outside this visual approval.

Recorded verification includes red/green cases for locale disclosure, saved theme and synchronization between control instances; 366 passing focused mirror tests; three passing guest browser journeys covering responsive layout, menu/Escape/outside dismissal, resize synchronization, query retention and Japanese learning intent; and passing TypeScript, ESLint and production build checks. The detector result is `[]`, supporting no independent visual claim. No database fixtures were created for this refinement; task-owned servers were stopped and port 3100 released. This documentation pass started no processes or browser sessions.

Pre-existing context drift is reported without repair: `PRODUCT.md` still describes English-only learning and frozen functionality; the explicit authorized mirror/header work supersedes that older scope. Historical system audit counts, the incumbent document format and existing unrelated implementation gaps were not revalidated or canonized as new rules.
