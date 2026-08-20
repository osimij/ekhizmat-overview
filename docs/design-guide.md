# eKhizmat design guide

Status: **canonical and default**. This is the single UX/UI contract for every eKhizmat platform (Citizen, Ministry, ЦОН/TSON, Admin, mobile prototype). It supersedes and replaces `polish-design-guide.md`, `docs/PLAN-MINISTRY-POLISH.md`, and `docs/component-inventory.md`.

Reference implementation: **`admin/services.html`**. When a rule here seems ambiguous, open services.html next to the page you are changing and copy its reasoning. Every rule in this guide was distilled from a real, measured before/after pass over live pages (see the Appendix) — none of it is theoretical preference, which is why the rules are binding.

The one-sentence philosophy, proven across the Ministry and Admin passes:

> Polish is not the number of visual elements. It is the quality of hierarchy, alignment, restraint, state feedback, and edge-case handling.

The practical corollary: **most polish work is deletion and convergence, not decoration.** An unpolished eKhizmat page almost never lacks anything — it has too many competing signals, too many weights, too many one-off values. If your diff for a "polish" task is mostly additions, re-read §2.

---

## 0. How to use this guide (read this first, especially if you are an AI agent)

- Asked to build, restyle, "clean up", or polish any page → follow the **procedure in §2**, applying the rules in §3–§10. Do not invent a personal aesthetic; the aesthetic is defined here, and consistency with the neighbouring pages is worth more than any local improvement.
- Every rule in **§1 is machine-enforced** by `qa/design-lint.mjs`. Your change is not done while `npm run lint:design-system` fails.
- The **§10 decision rules** are the quick-reference form of this guide: "when you see X, do Y." Most polish work is applying those mechanically. When a rule and your taste disagree, the rule wins; if you believe the rule is wrong, change the rule *and* the code in the same change, with the reasoning.
- **Measure, don't eyeball.** The drift this guide exists to kill (four panel-title styles, a 70px gutter jump between pages) survived many visual reviews and fell in one afternoon of `getComputedStyle` / `getBoundingClientRect` measurements in the browser. Verify roles numerically.
- Finish with **§11 verification**. "Looks better in one screenshot" is not done.

Sources of truth (never duplicate these, always link to them):

| What | Where |
| --- | --- |
| Tokens (color, space, type, shape, motion, layout) | `design-system/tokens/*.css` |
| Shared components | `design-system/css/components.css`, `patterns.css`, `sidebar.css` |
| Live component examples | `/design-system/styleguide.html` |
| Icons (only source of icons) | `/design-system/assets/icons.svg` |
| Shared behavior (dialogs, menus, toasts, sidebar, preferences) | `design-system/js/` |
| Code ↔ Figma map (admin library) | `docs/admin-component-map.md` |
| Mechanical rule enforcement | `qa/design-lint.mjs` (`npm run lint:design-system`) |
| Behavioral/layout regression | `qa/functional/`, `qa/accessibility/`, `qa/visual/` (Playwright) |

## 1. Non-negotiables (lint-enforced)

These fail CI. Never introduce them; remove them on sight. Each exists because the violation, once present, spreads by copy-paste faster than review can catch it:

1. **No raw colors** in app or design-system CSS — no hex, no `rgb()/rgba()`. Semantic tokens only (`--ink`, `--panel`, `--blue-tint`, …). Raw values live only in `design-system/tokens/color.css`. *Why:* a raw color is invisible to theming — it renders in one theme and breaks silently in the other, and it can never be retuned centrally.
2. **`letter-spacing` is always 0**, except two display logotypes. No positive tracking anywhere; `--tracking: 0` is the contract. The only negative value allowed is `-0.02em`, and only on `.login__brand b` (workstation wordmark) and `#heroTitle` (citizen home display title). *Why:* tracking was historically used to make tiny uppercase labels feel "designed" — the same crutch this guide retires. Inter at our sizes needs none. These two lines are large display type (`--fs-24` / `--fs-44`), not labels; `-0.02em` is optical tightening, not a hierarchy tool.
3. **No `text-transform: uppercase`.** Sentence case everywhere (§4). *Why:* uppercase is slower to scan, reads bureaucratically loud, and was always a hierarchy patch — fix the hierarchy instead.
4. **No `transition: all`** and **no raw `cubic-bezier(...)`** — motion tokens (`--t-*`, `--ease*`) only. *Why:* `all` animates properties you didn't intend (including layout); raw curves fragment the motion character and dodge the reduced-motion zeroing that the tokens provide.
5. **Icons come only from the canonical sprite** `/design-system/assets/icons.svg#i-…` — never local `<use href="#…">` copies. *Why:* local copies fork the icon set and break when the sprite updates or the build rewrites asset paths.
6. **No copied foundations** — apps never load or fork their own `tokens/base/components` CSS. *Why:* a fork stops receiving fixes the moment it is created.
7. **Storage keys** must be on the approved list in `qa/design-lint.mjs`. localStorage: `ekh.preferences.theme|lang`, `ekh.admin.rail`, `ekh.ministry.side`, `ekh.citizen.auth`, `ekh.tson.bind`. sessionStorage: `ekh.tson.arm`, `ekh.ministry.arm` (operator workstation in this tab only — never citizen data). *Why:* the platforms share one origin; unreviewed keys become cross-app leaks and privacy liabilities (see `docs/decisions.md`).

And three contract rules the lint cannot see:

8. The font is **Inter** via `var(--font)` (`design-system/tokens/type.css`). Do not introduce another font or a per-app override. *Why:* one font is the cheapest form of cross-platform coherence; per-app overrides also break on clean devices where the override isn't bundled.
9. A pattern used by two or more pages belongs in `design-system/`, with an entry in `styleguide.html` and (for admin) `docs/admin-component-map.md`. Do not copy improved CSS between apps. *Why:* the second copy is where drift starts — the two copies will be edited independently within weeks.
10. **One definition per class name.** A class the design system already styles (`.modal`, `.overlay`, `.toast`, `.screen`, `.tabs`, `.btn`, …) must not be re-skinned in an app stylesheet. Either consume the shared component under its canonical name, or promote your better version and delete the other. *Why:* two rules for one name do not "override" each other — they interleave, and whatever the app forgets to redeclare leaks in silently. ЦОН's toasts inherited `position:fixed; opacity:0` from the citizen-era `.toast` and rendered invisible; its modal scrim inherited an ink-based color that *lightened* the screen in dark mode. Both read as correct in review, because the app's own block looked complete.

## 2. The polish procedure

Work in passes, in this order. The order matters because each pass changes what the next one sees: there is no point aligning type on an element pass 2 will delete, and no point animating a control pass 3 will replace.

1. **Inventory.** Screenshot the page in its real states: default, most crowded, empty, error, open menu/dialog, light/dark, Russian/Tajik, desktop/tablet/phone. List every visual object on the main screen and what fact or action it represents. Map user tasks by frequency (constant / repeated / occasional / rare) — frequency decides visibility and motion budget. *Never start from the cleanest screen; the crowded one is where the design fails.*
2. **Remove competition** (§10 rules 1–7). Duplicate representations of one fact, decorative icons in dense rows, subtitles that restate the title, redundant chips, actions repeated in several places. This pass deletes; it does not restyle. *Why first: every element you delete here is styling, aligning, and localizing work you never do.*
3. **Converge controls** (§6, §10 rules 8–14). Filters become the labeled dropdown; natives get the shared custom styling; KPI cards, status displays, top bar, sidebar, and preferences converge on the canon in §3. *Why: a control that differs from its sibling on the next page reads as a bug even when both work.*
4. **Typography** (§4). Case, size, and weight discipline. Mostly this pass makes things smaller, quieter, and less bold.
5. **Layout and alignment** (§5). Token spacing by relationship, single-definition grids, `min-width: 0`, intentional truncation, stable shell anchors, the shared content container.
6. **States, behavior, accessibility** (§7, §9). Complete state coverage, URL-synced filter state, sticky panel scrolling, focus/touch/reduced-motion, localized accessible names.
7. **Motion last** (§8). Only where it explains state or space. *Why last: motion applied before the layout settles gets rebuilt, and motion is the easiest place to add fake polish that hides real problems.*
8. **Verify** (§11) and, if a page needed a decision this guide lacks, add the rule here in the same change — that is how every rule in this document was born.

## 3. Canon decisions

Settled product-wide. Pages still using a retired pattern are wrong, not "alternative". Each row carries its reasoning so you can extend the canon correctly to cases the row doesn't literally cover:

| Topic | Standard | Retired |
| --- | --- | --- |
| Filters | Labeled dropdown: icon + text label + `appearance:none` select with chevron in a bordered field (`.registry-status-filter` on services.html); `:focus-within` ring. *Why: filter option sets grow and their RU/TJ labels are long — a dropdown holds any count at fixed width, while a button-row fights for space and wraps.* Ministry's `.filter-select` custom listbox satisfies the same canon (label + bordered field + chevron, complete §6 keyboard model) — converging it to the native select is permitted but not required. | Segmented radio button-rows for filtering (tabs remain valid for *view* switching, e.g. `.lc-review-tabs`, where 2–3 short mutually-exclusive views benefit from being visible at once) |
| KPI / stat cards | **Separate bordered cards**: `--panel` background, `1px --line-in` border, `--r-l` radius, `--s-3` gap; value first, label second; `tabular-nums`; when a stat filters a list it is a `<button>` with `aria-pressed` (`.dashboard-metrics`, `.reg-stats`). *Why: each stat is an independent fact — separate cards scan as units, reflow cleanly at any breakpoint, and value-first matches how operators read numbers.* | Joined strips with internal dividers; label-above-value order; icon tiles inside stat cards (decoration competing with the number) |
| Status in repeated rows | `.status-icon` (28px round, tinted, `role="img"` + `aria-label` + `title`): success=check, info/in-progress=clock, draft/warning=edit, danger=x. *Why: in a dense list the status is a comparison signal, not prose — a tinted glyph carries it at a glance while the text lives in the accessible name where it belongs.* | Text status pills in dense rows (pills stay valid in detail headers where the status is the primary content of the view) |
| Top bar | `60px`; page title left; search optically centered, `min(460px, 37vw)`; right side holds the **role slot only** — plus, on a workstation, the escalation notification bell: SLA escalations (§7Б.3) are global and relevant on every screen, which is exactly the test this rule sets for permanent chrome, and a bell reachable only from one page would be missed. *Why: permanent chrome earns its place only with content that is global and per-page-relevant; everything else moved behind the profile.* | Per-page moon/sun theme toggle; language dropdown in the bar; avatar in the top bar |
| Global preferences | Language and theme live in the **profile popover** (`.adm-profile-pop` / workstation `.menu`), anchored to the sidebar user card (a real `<button>`), an avatar trigger on full-screen editors, or the quiet login gear before sign-in: identity card (when signed in), language flyout, three-state theme choice (system / light / dark, `i-theme-system` icon). The language row is **label + current value + chevron** — no leading globe (the label already names the control). Theme keeps its three-state icons. Collapsed-rail compact may show a globe only when the label is hidden. Explicit choice persists via `ekh.preferences.theme`; pages pinned to `data-system-theme` render the explicit choices disabled and follow the OS. Elevation via `--shadow-1`; flyout submenus use `dd-right`/`dd-up` with a hover aim-bridge. *Why: preferences are set rarely — identity is where users look for them, and removing them from the frame is what lets the top bar stay quiet.* | Theme/language controls in permanent chrome; a globe beside the word “Language” |
| Sidebar | The shared `.ekh-side` component only (`design-system/css/sidebar.css` + `sidebar.js`): 264px expanded / 66px rail, fixed 33px icon axis, pre-paint collapse class on `<html>`, labels morph into hairline dividers, neutral (non-blue) selection in dark mode. *Why: navigation is muscle memory — one component means targets never move between pages, and the collapse contract (nothing shifts horizontally, text fades, labels become dividers) is engineered once.* | Bespoke per-app rails (`.adm-rail`, old ministry rail) |
| Page header | One `h1`; a subtitle only when it adds orientation the title lacks; a page-level create/new action appears only when the sidebar does not already carry that destination, and then as a **quiet pill** (border, transparent, `--ink-2`). *Why: the header orients, it doesn't sell — and an action duplicated from the sidebar is pure noise (services dropped its button because "Хизмати нав" is a rail item; forms keeps one because it isn't).* | Subtitle restating the title; `btn-pri` on browse-page headers; a header action duplicating a sidebar item |
| Sequential wizard | Shared `.stepper` across the top of a single centered panel; current step via `aria-current="step"`; completed steps use `.done`. *Why: a horizontal stepper preserves top-to-bottom reading order — the user reads progress, then the question; a side rail makes two columns compete.* | Vertical numbered rail beside the form |
| Form controls | Shared custom-drawn radios/checkboxes (`.ekh-checkbox` / `.ekh-radio` in `components.css`: `appearance:none`, blue dot / drawn check, `:focus-visible` ring); every `select` gets `appearance:none` + sprite chevron; binary/short choices may be tappable cards (`.cost-options`). *Why: native control rendering varies by OS and clashes with the token palette; `accent-color` still paints the OS widget, which arrives with its own border and its own white in dark mode. The custom set is drawn once, themed by tokens, and keeps full keyboard behavior because it styles real inputs.* | Bare native radios/checkboxes/selects inside styled flows; `accent-color` as the styling method |
| Action color | `--blue` (`#0072d6` in tokens — chosen for identity + contrast) marks interactivity: primary action, selection, focus, links. One primary per region/decision. Explicit hover/press tokens, never `filter: brightness()`. *Why: blue is the affordance signal — every decorative use of it teaches users to ignore it.* | Blue as decoration or heading color |
| Notes & banners | Transparent background + `1px` border mixed from the semantic color (`color-mix(in srgb, var(--blue) 20%, var(--line))` pattern), semantic ink text, **bare icon** (`.lc-review-context`). *Why: a solid tint block competes with the content it annotates; an outlined note reads as a quiet aside in both themes.* | Solid tint-filled banners; icon in a white circle inside the banner |
| Selected icon tile | When a choice is selected (`:checked`, `aria-pressed`, `aria-selected`, or `.open`), its icon well goes **solid `--blue` + `--on-blue` glyph** (builder `.stg-ic`). Category hue is idle-only. `.status-icon` and sidebar icons keep their own contracts. *Why: selection is state and must out-rank category decoration; if hue and selection use the same visual channel, neither reads.* | Selected tile keeps its category hue |
| Density | Platforms share anatomy, tokens, and state language but not density: Citizen comfortable/touch (44px+), Ministry compact specialist, ЦОН workstation (1280px minimum), Admin editor-oriented multi-pane. *Why: the jobs differ — a citizen files one request, an operator processes hundreds; forcing one density betrays one of them.* | Forcing one density on all platforms |
| Platform launcher | Full-viewport `--launch-bg` canvas — plain `--panel` paper in light, the Figma `--bg` in dark — composed from Figma «eKhizmat New Design» node `25:167` and **presented at `--launch-scale` (`.85`)**, the way the login gate presents its own composition at `--login-scale`: every metric below is the Figma value (or its role token) times that one factor, so re-tuning the page cannot drift one proportion against another. **One 1200px content column, centered on the viewport**, split between two edges: the intro on the left (logo mark above the title, page-title `h1` at `--fs-36`/`--weight-medium`, one orientation line at `--fs-20`/`--ink-2` on a 500px measure) and the four destinations on the right as a **stack that hugs its widest row** and stops at 435px — 1020 and 370 as painted. A destination row is **borderless and unfilled at rest**: a 78px category-hue tile (`--r-launch-tile`), name at `--fs-24`/`--weight-regular`, audience at `--fs-17`/`--ink-2`, `--r-launch-card` corners, `--s-1` between rows; `--hover` on the row is the only fill, under pointer or focus — the category tile keeps its hue in every state. Whatever the two columns do not use is the gutter between them — it is not padding to tune. Language and theme sit as quiet **bottom-left chrome** (globe + current language, slash, theme icon) because this page has no profile — they follow the content in the DOM, and their *glyph*, not the pill box, lands on the same content edge as the title. The main padding mirrors the chrome height so the stage centers on the viewport middle rather than on what the footer leaves. Below 960px everything stacks into one column the width of the destination stack (chrome included) and steps the title down again to `--fs-28`; the presented scale already puts the rows and the chrome controls at touch size, so nothing else changes. No top header or wordmark, no 2×2, no bordered description cards, no copy that restates the destination, no decorative arrows. *Why: the job is to pick a workplace, and the design decides it with two anchored blocks instead of a cluster floating in the middle — the eye goes to the title, then straight along the reading line to the stack. Resting borders and fills were carrying no information (there are four rows, always, and none of them is a state), so the surface now appears only for the row being chosen. A 2×2 fights the one-decision reading order; a top header duplicated the logo that already sits with the title; `--fs-44` in a 24rem column wrapped the Tajik title onto three lines, and the 500px measure keeps it to one at `--fs-36` (the intro box gets 560 for exactly that). Aligning the chrome to the content edge rather than the viewport edge is what makes the bottom-left corner read as part of the composition.* | 2×2 destination grid; bordered description cards with corner arrows; `--maxw`-capped one-column stack; a centered intrinsic cluster floating between the gutters; resting `--panel` fill + `--line-in` hairline on destination rows; chrome inset from the viewport edge instead of the content edge; top header with wordmark + preferences |
| Workstation login | Shared `.login` gate (`design-system/css/patterns.css`), based on Figma FH2J… nodes `1:135` and `1:169`: logo + product name anchored top-left, a flat `--login-bg` canvas with no enclosing card, one 400px credential column with 70px pill fields, then a wider six-cell MFA view. Credential labels are legend-on-border floats (`.login-field--floating`): idle, the label is `--fs-18` / `--weight-medium` and vertically centered inside the pill; focused or filled, it scales to `--fs-14` and sits on the top stroke as a cutout (`--login-bg` punching the outline) — both login and password float the same way. Field text inset is `--s-8` plus one `--s-1` on the start edge. The complete composition is presented uniformly at `--login-scale` (`.8`) inside one locked `100dvh` canvas—never a page scrollbar. `.login__inner` insets `--s-6` on top (`--login-chrome-pad`) and `clamp(var(--s-4), 2vw, var(--s-8))` on the sides so brand and gear sit closer to the edge without going flush; the unscaled shell gear uses `--login-chrome-inset` (`pad × --login-scale`) so it shares a top line with the scaled `.login__brand`. The wordmark `.login__brand b` is optically tightened at `-0.02em` (the §1 logotype exception). Bottom stays `--s-10` so the session note and floating platform switcher keep their floor. Step 1 is titled “Вход в сессию” at `--fs-28` / `--weight-medium` (500, not the page-title 600: size already names the role on an empty canvas, and 600 would shout when nothing else is bold); step 2 uses the MFA title and instruction. The MFA action stack (Войти + Назад) is `width: 100%` of the six-cell OTP row — not the 400px credential column. The workstation-only session note (`--fs-14`) anchors the bottom; no product version. At narrow/short viewports the same reading order reflows without horizontal overflow. No "step N of M" chrome — the content change is the progress. Pre-login language/theme is **one quiet `--ink-2` icon-button** at the top-right (required before sign-in, §9); prototype platform switching floats and must not share that `--h-btn-m` slot. *Why: removing the card makes the task itself the visual center; cutout floats keep empty fields from looking labelled-above while the risen legend stays on the stroke; the stable brand and footer keep context without competing with the fields. A blue ghost gear next to the overflow control reads as a second primary and overflows the one-button slot.* | Card-on-wash login; label-above fields; Linear in-field labels; "step 1 of 2" chrome; a second product subtitle above the form; version string in the footer; MFA actions locked to the 400px credential column; blue/ghost chrome sharing the login corner with the platform switcher |
| Workstation lock | A modal on the screen that was locked: the shell stays mounted, blurs (`.shell.is-blurred`), and the overlay tints it with `--overlay`. The card is `--panel`, `--r-lock` (32px — Figma 64 on a 2880×1864 @2× frame), padding `--s-8` with `--s-10` on top. Inner controls use the S0 login classes at `--login-scale` so field/button match login’s painted size (70 → 56). The title is `--fs-24` / `--weight-medium` so it paints near the modal `--fs-20` after scale. Three groups — icon, title+hint, field+button — share `--s-8`; within the copy, title↔hint is `--s-2`; within the controls, field↔button is `--s-4` (one step above S0 credentials so the single field does not crowd Unlock). One-line title, `--weight-regular` hint. Brand stays on the overlay (top-left, same as S0), not inside the card. *Why: lock interrupts a live workstation — the operator should still see where they stopped, through a veil, and answer one question in the same type they signed in with.* | Opaque second login canvas; painting login tokens at 1× while S0 presents them at `--login-scale`; using Figma @2× px values as CSS px |
| Dialog surface | Shared `.ekh-dialog` and legacy `.modal` surfaces use `--r-dialog` (40px on roomy viewports), a quiet `--line` border, `--panel`, and restrained `--shadow-1`; compact confirmation content may center, while data-heavy dialogs keep their reading axis left-aligned. On phone the surface contracts to `--r-xl` and `--s-6` padding. *Why: the large calm radius and border carry the Figma popup language without forcing every operational dialog into the lock screen’s centered one-action composition.* | Heavy layer shadow; copying the locked-workstation composition onto every data-heavy dialog |
| Workstation idle | A shift home: page header (status + one primary), KPI cards, then recent activity. Secondary destinations are ghost controls under the title, not a second hero. *Why: the operator is waiting, not lost — a tall empty panel around the start button is a splash, and splash composition fights the glanceable facts that tell them whether the shift is healthy.* | Decorative empty/watermark hero with a single centered button |
| Workstation identity gate | One `--w-gate-wide` card. Method tabs switch views (not a numbered wizard). Single column: the control, then the primary. Conversation script appears only in the waiting state — it is a prompt for what to say, not a competing column. Guest is a hairline row inside the card; cancel is outside. No subtitle that restates the title or lists the three methods. *Why: the two-column layout was built for a QR tile; without it the side script is empty space around a phone field, and numbered tabs plus a numbered list read as two wizards. Gate screens already mean one decision — identify was the exception that still looked like a dashboard.* | 720px two-column “QR left / script right”; always-visible numbered script; subtitle listing the methods |
| Workstation live-scan | The identity gate uses the static Hugeicons `FaceIdIcon` centered in a quiet `--field` rounded square; its caption carries the instruction, with no animated perimeter. The separate biometric-enrollment capture may use one restrained `--blue` dotted SVG stroke to communicate active capture. *Why: the frequently used identity check should stay still, while enrollment benefits from an explicit capture-state cue.* | Corner-bracket pulse + traveling scanline + `box-shadow` glow; animated identity-gate frame |

## 4. Typography

Inter, `--tracking: 0`, sentence case, `tabular-nums` on all data surfaces (identifiers, dates, money, counts — so columns of digits don't wobble as values change). Display-logotype exceptions (`-0.02em`): `.login__brand b` and citizen `#heroTitle` (§1).

**The document root keeps the browser's 16px.** Never set `font-size` on `html` (or a root wrapper) — the `--fs-*` tokens are rem-based, so a 15px root silently shrinks every token by 6.25% across the whole app while each individual value still "looks like" its token (ЦОН shipped this way for weeks before it was caught by measurement). Set the platform's base size on `body` with `--fs-15`, not on the root.

The system in one sentence: **size expresses role, weight expresses state.** A thing is big because of what it *is* (page title, row title, metadata); it is bold because of what it is *doing right now* (selected, active, primary). When you can't decide a value, ask which of the two questions you're answering.

Scale — use `--fs-*` tokens by role. These exact values were measured and unified across all seven admin pages; do not reintroduce neighbors (16 vs 17, 27 vs 28):

| Role | Token | Weight |
| --- | ---: | ---: |
| Page title | `--fs-28` | 600 |
| Pane/step heading inside an editor or wizard | `--fs-24` | 600 |
| Modal title | `--fs-20` | 600 |
| Panel / section title | `--fs-17` | 500, one line |
| Body / operational baseline | `--fs-15` | 500 (consoles), 400 (long-form) |
| Row title (repeated lists) | `--fs-14` | 500 |
| Micro-label, table/column header, eyebrow, section caption | `--fs-13` sentence case | 500 |
| Secondary row metadata | `--fs-12` | 400 |
| Compact badge/chip only | `--fs-10`–`--fs-11` | 500–550, numerals 600 |

Weight ladder — the whole interface uses a narrow band, because a narrow band is what makes the one heavier thing visible:

- **400** — long-form text, input values, quiet metadata, lead paragraphs.
- **450–500** — default UI text; repeated row titles are 500.
- **550** — medium emphasis: badges, key cells.
- **600** — the ceiling: headings, primary/danger button labels, and the *active/selected/current* item in a repeated list. Only state earns extra weight; decoration never does.
- **620–680** — display numerals only (stat values, money sums), where mass compensates for the thin strokes of large digits.

Where a value sits on the token scale, write the token — `var(--weight-regular)`, `var(--weight-medium)`, `var(--weight-semibold)` — and reserve numeric literals for the in-between steps (450, 550, 620–680).

The most common defect in unpolished pages is everything bold at once: 11–12px uppercase tracked labels and 640–720 weights competing. When everything is emphasized, nothing is. The fix is always the same — 13px sentence case, letter-spacing 0, weight down the ladder.

## 5. Space, surfaces, alignment

**Spacing** uses the 4px token scale (`--s-1`…`--s-16`) chosen by *relationship*, not by eye — spacing is information about what belongs together: icon↔label 4–8, controls in one toolbar 8–12, columns in a row 12–20, panel interior 16–24, page sections 24–32, hero separation 40+. One 4px optical deviation is allowed with a code comment; it must not break the shared grid.

**Padding is the highest-leverage variable in this guide.** More than color, type, or motion, padding decides whether a surface reads as designed or accidental — every case below was a visible defect on a live page before it became a rule. When polishing, audit padding *first* within §5.

**The padding casebook** — the recurring situations and the settled answer for each:

1. **Cards in a row whose text can wrap.** The row uses grid/flex `align-items: stretch` (every card the full row height) and each card is `display:flex; flex-direction:column` with its **bottom cluster pinned via `margin-top:auto`** — and the cluster is the value *and* its meta line together, not just the last line. When one card's title wraps to two lines, the gap opens in the middle; the numbers stay on one baseline across the row. *Why: the eye reads a card row along the line of its bottom elements — one floating number makes every neighbouring card look broken.*
2. **Row hover geometry: records bleed, options float.** Data rows in tables and registries (`.svc-row`, `.tbl`, `.data-table`, queue rows) carry the panel's inline padding themselves and hover **edge to edge with square corners** — the highlight touching the edges says "this whole record". Menu items, sidebar items, and option tiles sit *inside* their container's padding and hover as **rounded islands** (`--r-s`/8px). *Why: a square bleed inside a rounded popover collides with its corners; a floating island inside a wide table makes the row look narrower than its data.* A third context — **glanceable dashboard cards** (alert lists, feeds: rows under a card title) — combines both: at rest the row is transparent and its text shares the card title's left edge; the rounded island is **already in the box model** (`padding` + matching negative `margin`, width `calc(100% + pad×2)`), and hover/focus only paints `--hover`. Do not add that padding on hover — with `width: 100%` the chevron jumps. Use it whenever rows must stay text-aligned with a heading above them.
3. **Quiet controls on the content edge.** A ghost button or back-link that starts (or ends) a padded region gets a **negative start margin equal to its own inline padding** (e.g. `margin-left:-10px`), so its *label* sits exactly on the content edge while the padded hit-target hangs outside. *Why: the reader aligns text with text; a label floating 10px inward off the title's edge reads as a mistake, but shrinking the padding would shrink the click target.*
4. **Gap under a panel title.** The space between a panel's title and its first row **equals the list's own row rhythm** — the title participates in the list, it does not float above it with a section-sized gap. Section-sized gaps (24–32) are for separating *panels*, not for the inside of one. *Why: one even rhythm reads as one object; an oversized head gap splits the panel into two objects.*
5. **Scrolling lists inside panels.** The scroll container spans the panel full-bleed and the *content* carries the inline padding, so the scrollbar thumb hugs the **panel's edge**, not the content. *Why: an inset thumb reads as part of the content and steals a column of attention; at the edge it is chrome.*
6. **Panels holding only an empty state.** Empty states get **generous vertical padding** (on the order of `--s-10`/`--s-12`), not the list's compact tokens — the panel must hold its ground rather than collapse into a sliver; normal padding resumes the moment real rows exist. *Why: a collapsed empty panel looks like a rendering bug; deliberate air says "this space is intentionally waiting".*
7. **Optical vertical symmetry** — the container-level rule below: bottom padding is computed, not copied from the top.

**Optical vertical symmetry in containers.** A container's padding is what the eye *sees*, not what the token says — and the last child usually contributes its own trailing space (row padding, card margin, list gap). The rule: **last child's trailing space + container `padding-bottom` = container `padding-top`.** Write it as arithmetic the next reader can verify, either `padding-bottom: calc(var(--s-5) - var(--s-2))` against the child's known trailing space, or `padding-bottom: 0` when the child's own space already equals the top (leave a comment stating the sum, e.g. the idle recent list: "rows already give --s-3; together with this it matches the --s-6 on top"). *Why: applying the same token top and bottom double-counts the child's space, so every panel looks bottom-heavy by exactly one row-padding — a defect nobody can name but everyone sees.*

**Surfaces**, in order: `--bg` (page) → `--panel` (primary container) → `--field` / `--field-on-panel` (inputs, quiet groups) → `--raised` + `--shadow-1`/`--shadow-layer` (popovers, menus, dialogs). Borders are quiet separators: `--line` around groups, `--line-in` for internal hairlines. One border per semantic level — never nest bordered cards that add no meaning, because each extra border spends contrast the content needs.

**Scrollbars** are a shared foundation, never page-local: every page and nested scroll surface uses the 6px treatment in `design-system/css/foundations.css`, with a transparent track and a low-contrast thumb that becomes slightly clearer on fine-pointer hover. Do not hide or restyle scrollbars in an app stylesheet — scattered `scrollbar-width:none` hacks were how each page ended up scrolling differently. One exception: inside a device mockup the artifact imitates the target OS, whose scrollbars are overlays — the phone preview's app viewport (`.pv-app`) hides its bar deliberately.

**Semantic state colors**: green = done/valid, amber = waiting/degraded, red = error/breach/destructive, neutral = draft/inactive. State must survive without color (text, icon, position, or accessible name carries it too). Category hue tiles (`--h-*-bg/fg`) aid recognition in catalogues; remove them from dense comparison rows where they compete with the fields users actually compare.

**Alignment is a system**, because "nearly aligned" reads as unfinished even when nobody can say why:

- Define table/queue columns **once** in a custom property, shared by header and rows (`--queue-columns`, `--form-row-columns`); identical padding for both. Two independently-maintained column definitions *will* drift.
- **Column alignment in data tables:** the first column (identity — name, center, service) is left-aligned; **every other column is centered**, and each header cell follows its column's alignment. *Why: the identity column is read like text; the metric columns are compared as isolated values, and centering keeps short values (474, 94%) from hugging one edge of a wide track. `tabular-nums` keeps the digits stable within each cell.*
- Every flexible grid/flex child that may truncate gets `min-width: 0`. Use `minmax(0, 1fr)`, never bare `1fr`, for content tracks — grid's intrinsic minimum otherwise lets one long value widen the whole page.
- Ellipsis only where the full value stays reachable (detail view, `title`, accessible name). Truncation is a layout decision, not an emergency.
- Shell anchors are stable: `--h-topbar` 60px, `--w-side` 264px / `--w-side-collapsed` 66px, centered search. Content changes never move navigation or global chrome.
- One content container per console: admin's is `.adm-body` (1360px max, centered, `--s-6` padding); every other platform must name exactly one equivalent and route all screens through it. The container sets the left edge for every page — page sections must never override its width, or the content edge jumps between pages (review.html once sat 70px off because of a private `max-width:1500px`). The only sanctioned exception is a deliberately centered flow (the wizard's narrow sheet), which is a different composition, not a different gutter.
- Multi-pane editors constrain reading width (`--w-builder-editor`) even when the workspace is wide; side panels (version rails, live previews) are `position: sticky` with their own `overflow-y: auto` scroll.
- A full-workspace editor (service builder, form editor) locks its shell to the viewport instead: `height: 100dvh` + `overflow: hidden` on the shell, and every column becomes its own scroll region. Sticky is for panels inside a page that scrolls; shell-lock is for pages that *are* the app.

## 6. Components

Canonical anatomy lives in `styleguide.html` and `docs/admin-component-map.md`; compose, don't fork. Every interactive component must expose the full state set — a component missing a state fails exactly when the user is paying most attention:

`default → hover → active/press → focus-visible → selected/open → disabled → loading → error/success → reduced-motion`

- **Buttons**: pill shape; press `scale(.97)` (`.96` icon buttons) over `--t-fast` — the interface physically acknowledges input; disabled never moves; primary/danger labels 600, ordinary 500.
- **Navigation items**: 18px outline icon, tint + ink + weight change together on the active item (one state, all channels agree); counts stay secondary (red tint only when urgent).
- **Dropdown filter** (the canon filter): visible text label with 16px icon, bordered 38px field, `appearance:none` select, sprite chevron, `:focus-within` ring, syncs to the URL (§7).
- **Profile popover** (`.adm-profile-pop`): identity card on top, hairline divider, then preferences (language flyout, three-state theme). Language row anatomy is label + current value + chevron, matching the workstation `.menu__row` — no leading globe and no empty icon well. Anchored to the sidebar user card or the editor avatar trigger; `--shadow-1` elevation on `--raised`; compact variant under the collapsed rail (globe only when the label hides); submenus position with `dd-right`/`dd-up` and keep a hover aim-bridge so diagonal pointer travel doesn't close the flyout. The trigger toggles closed, click-outside dismisses, Escape closes the top layer, and the language row toggles its flyout.
- **Custom controls** beyond styled natives require the complete keyboard/ARIA model (trigger `aria-haspopup/expanded/controls`, listbox `aria-selected`, arrows/Home/End/Escape, focus return). Visual polish without keyboard completeness is unfinished work — it demos well and fails real users.
- **Status icons**: the four-glyph mapping from §3; tint pair + `role="img"` + localized `aria-label` + `title`.
- **Icon fills — where they live and where they don't.** Tinted backgrounds behind icons survive in exactly two places: the **status circle** in tables and registry rows (it is a scanning anchor in a wide row), and **category hue tiles** on catalogue/selection cards (recognition matters there). Everywhere else the icon is a **bare colored glyph** and the color alone carries the state: leading icons of editor list rows, icons inside notes/banners, and status glyphs in glanceable dashboard-card rows (`.alert-row`, thicker 2px stroke compensating for the lost circle). *Why: a filled well next to 13px text outweighs the text; fills are for places the eye must find from a distance, not for icons sitting inside a reading line.* In dark mode the tint fill behind a status circle softens via `color-mix` toward transparent (~50–60%) so it doesn't glow against dark panels.
- **Empty states** answer three questions: what happened, is it good or bad, what can I do next (`.reg-empty`, `.fb-empty`). **Loading** skeletons match final geometry so nothing jumps on arrival. **Errors** are specific and sit next to the decision they affect.
- **Device previews** reproduce real device geometry: the builder phone is iPhone 17 Pro Max — screen 440×956pt, 62pt display radius and Dynamic Island expressed as percentages of the screen so proportions hold at any width (see the `.pv-phone` comment in `apps/admin/app.css`). The chrome stays quiet: no fake OS status content, bezel color mixed toward the page background, caption *below* the device in small regular text. *Why: a preview sells trust in the builder — wrong proportions read as a toy.*

## 7. Behavior and state

- **Filter/view state lives in the URL** (`?status=draft`) via `history.replaceState`; on load, an allow-listed query param restores state. KPI cards that act as shortcuts set the same state and `aria-pressed`. *Why: reload, back-button, and shared links must land on what the user was looking at.*
  - **Workstation operator session.** ЦОН and Ministry keep the signed-in operator in `sessionStorage` (`ekh.tson.arm`, `ekh.ministry.arm`) so a normal reload (F5, Cmd+R, Vite HMR) returns to the same idle-safe screen. A citizen visit is never written there — refresh mid-reception lands on the shift home, not the person at the window. Cmd+Shift+R / Ctrl+F5, logout, and closing the tab return to the login gate. *Why: a prototype that dumps the operator through MFA on every refresh is unusable; resurrecting the citizen would violate the privacy contract.*
  - **Platform exception — ЦОН session screens.** Inside a visit (`#/session/*`, `#/catalog-view`) filter and search state stays out of the URL: a service search can contain a citizen's name, and the workstation's privacy contract forbids personal data in the address bar in any form — its router actively evicts a hash containing Cyrillic or a 6+ digit run (`apps/tson/js/router.js`). The management dashboards, whose state is only a period and a region **code**, do sync. The rule for extending this: a param may live in the URL when it is drawn from a closed, non-personal, ASCII allow-list; otherwise the state belongs in memory. *Why: URL state is a convenience; not leaking the person at the window is a requirement, and when they collide the requirement wins.*
- **Theme** is chosen in the profile popover (system / light / dark). Explicit choices persist via `ekh.preferences.theme`; pages pinned with `data-system-theme` disable the explicit options and follow the OS through the `matchMedia` pre-paint script. Theme is applied on `<html>` **before first paint** — a theme flash is a bug.
- **Sidebar collapse** persists (`ekh.admin.rail`) and is applied on `<html>` before first paint; the width tween arms only on a real toggle (`.ekh-side-anim`), so loads and re-renders never animate.
- Dynamic list regions get `aria-live="polite"` so screen readers hear filter results change.
- Preferences are never silently overwritten by deterministic demo query params (see `docs/decisions.md`).

## 8. Motion

Character: calm, immediate, official. No bounce, no spring. Motion explains state or space — never decorates. An operator who sees the same transition three hundred times a day experiences every unnecessary millisecond as friction.

Frequency budget: constant actions (search, filter, sort, queue redraw) get **no** spatial animation; repeated ones near-instant; occasional layers (dialog, drawer, toast) standard transitions; rare moments (login, first success) a little warmth.

Tokens only: `--t-fast` 120ms (hover/press/color), `--t-popover` 150ms, `--t-exit` 160ms (exits slightly faster than entries — leaving should feel lighter than arriving), `--t-step` 180ms, `--t-layer` 200ms, `--t-draw` 400ms; curves `--ease`, `--ease-out`, `--ease-layer`. All zero out under reduced motion — but test that the interface still communicates state without them.

Spatial rules: popovers grow from their trigger (`transform-origin`); drawers/toasts exit the way they entered; scale entrances start ~.98, never 0; remove DOM only after the exit finishes — a layer that vanishes mid-exit reads as a crash. Animate `transform`/`opacity` only — never font-size, padding, or page layout (the single-track sidebar tween, toast-stack collapse, and the Face ID marching dotted stroke via `stroke-dashoffset` are the audited exceptions: the first two prevent a content jump; a dashed stroke cannot march by transform).

Cross-page navigation: console pages are separate documents, so navigation is a hard cut by default and JS-built shell chrome can paint empty for a frame. The canon fix is both halves together: `blocking="render"` on the shell-building module in each page's `<head>` (the rail must never paint empty), plus `@view-transition{navigation:auto}` with the rail and top bar carrying `view-transition-name`s so identical shell pixels hold still while the workspace cross-fades at `--t-fast` (0ms under reduced motion). Result: separate documents feel like one application.

## 9. Responsive, localization, accessibility

**Responsive** preserves task and reading order, recomposing at *content-failure* breakpoints, not device names: consoles fold the detail column below content (~1080px), swap the rail for a drawer / cards for tables (~960px, the point where column alignment stops helping comparison), tighten padding (~620px). Test short viewports, not just narrow. `pointer: coarse` targets ≥44px.

**Localization (RU + TJ) is a layout rule, not a translation pass**: size controls for the longer real translation; localize data, durations, money, statuses, and every `aria-label` (including both outcomes of stateful controls — "collapse"/"expand"); a component that breaks in the longer language is not finished.

**Accessibility is part of polish** — an interface feels finished when it responds consistently regardless of input method: every control has a programmatic name; focus visible and never clipped by rounded containers; dialogs trap focus, close on Escape, return focus to the trigger; row-buttons are keyboard reachable with useful names; sort direction is announced, not just drawn; color is never the only channel; hover-only affordances have focus/touch paths (`@media (hover:hover) and (pointer:fine)` gates hover styles so touch devices never get stuck hover states).

## 10. Decision rules — quick reference

Apply mechanically wherever seen. Each is the compressed form of a §3–§9 rule; the reasoning lives there:

1. Uppercase/tracked micro-label → `--fs-13` sentence case, `letter-spacing: 0`. Display logotypes (`.login__brand b`, `#heroTitle`) may use `-0.02em`.
2. UI text weight above 600 (or drifting 640/650/700) → step down the §4 ladder; ≥620 for display numerals only.
3. Everything in a row equally bold → titles 500, only active/selected 600.
4. Subtitle restating the `h1` → delete.
5. Decorative icon tile in a dense repeated row → remove (keep in catalogues where recognition matters).
6. Two representations of one fact (pill + dot, icon + badge, chip + text) → keep the strongest one.
7. Same action in sidebar + toolbar + card + button → one placement per frequency map.
8. Text status pill in a repeated row → `.status-icon` with `aria-label` + `title`.
9. Segmented radio row used as a filter → labeled dropdown, state in the URL.
10. Joined KPI strip / label-first stat → separate bordered cards, value first, `tabular-nums`, `aria-pressed` when clickable.
11. Bespoke sidebar/rail markup → shared `.ekh-side`.
12. Theme or language control in permanent chrome → move into the profile popover (§3); pages pinned to `data-system-theme` keep explicit theme choices disabled.
13. Sequential wizard with a side step rail → shared `.stepper` above the question in a centered panel.
14. Bare native select/radio/checkbox in a styled flow → shared custom-drawn control with `:focus-visible`.
15. Blue on a browse-page header action → quiet pill; blue only for the flow's decisive action.
16. Raw color/spacing/duration/curve value → token (lint enforces most of these).
17. Bare `1fr` or truncation-prone child without `min-width: 0` → `minmax(0,1fr)` + `min-width:0`; ellipsis only with the full value reachable.
18. Header and rows with separately defined columns → one `--*-columns` custom property for both.
19. Tall side panel scrolling with the page → `position: sticky` + own `overflow-y: auto`.
20. Hover-only affordance → add focus-visible and touch paths.
21. A good pattern rebuilt locally for the second time → promote to `design-system/`, add to `styleguide.html` + the Figma map.
22. Secondary description lines inside a step/pipeline rail → title only; the detail belongs in the selected pane's header.
23. A "live"/status badge with a pulsing dot on always-visible chrome → static quiet caption; constant surfaces get no animation (§8).
24. Selectable row/card/button with an icon well (`.tile`, `.stg-ic`, `.fb-ic`, …) → selected well is solid `--blue` / `--on-blue`; idle keeps category hue. Do not restyle `.status-icon` or sidebar icons.
25. A hard cut or empty-shell flash when navigating between console pages → render-block the shell-building module in `<head>` + cross-document view transitions with the shell pinned (§8).
26. A list of versioned library objects (forms) → one `.svc-row` with a compact `vN` strip whose background carries status (green live, amber draft, neutral archive); slight corner radius, not a pill, and no status-icon in that strip. Show at most 3 versions with a quiet `+N` overflow chip. Status text stays in `title` + `.sr-only`. No second Open control, no description that restates the title, no identical icon tile on every row.
27. A specialist-console login (Ministry, ЦОН) that still uses a card-on-wash composition, product subtitle, labelled form, or numbered wizard → shared flat `.login` gate: one non-scrolling `100dvh` canvas, its complete composition uniformly presented at `--login-scale`, anchored brand, step heading at `--fs-28` / `--weight-medium`, legend-on-border floating-label pill fields, Continue then six-cell MFA whose action stack matches the OTP row width, `--fs-14` session note with no version, no step counter. Do not copy the CSS into the app stylesheet.
28. A wait/idle screen with a decorative empty panel around the primary action → shift home: header + KPI cards + recent activity; delete the empty panel and any hint that restates the button.
29. A ЦОН identity gate that still uses two columns, a subtitle listing the methods, or a numbered script beside the field → one `--w-gate-wide` card, method tabs, single column, script only while waiting. Guest is a hairline inside the card; cancel is outside.
30. A Face ID identity gate with animated scan chrome → static Hugeicons `FaceIdIcon` plus the instructional caption. For the less frequent biometric-enrollment capture, one `--blue` marching dotted stroke may communicate active capture; reduced motion keeps it static. Do not pulse the icon.
31. A login-gate corner that packs a blue ghost settings gear next to the prototype platform switcher inside a one-button `--h-btn-m` slot → one quiet `--ink-2` preferences icon at the top-right; the platform switcher floats (same as the host-less Ministry gate). Localization before sign-in stays; decorative blue on that icon does not. The gear’s `top` is `--login-chrome-inset`, sharing a line with `.login__brand` — do not give the unscaled shell a second `--s-6`.
32. A container using the same padding token top and bottom while its last child carries trailing space → optical vertical symmetry (§5): `padding-bottom = padding-top − last child's trailing space`, written as a `calc()` or a commented `0`.
33. Cards in a row where titles can wrap → `align-items:stretch` on the row, column-flex cards, value + meta pinned together with `margin-top:auto` (§5 casebook 1).
34. Hover highlight in the wrong geometry → records bleed square edge-to-edge; menu/nav/option items hover as rounded inset islands; dashboard-card rows rest text-aligned with the island reserved in the box model (hover only paints) (§5 casebook 2). Never mix geometries in one context. Never add hover-only padding on `width: 100%` rows.
35. First/last quiet control whose label sits off the content edge → negative start margin equal to its own padding; the hit-target hangs outside the edge (§5 casebook 3).
36. Panel title floating above its list with a section-sized gap → title-to-first-row gap equals the row rhythm (§5 casebook 4).
37. Scrollbar thumb inset beside content inside a panel → full-bleed scroller, padding on the content, thumb at the panel edge (§5 casebook 5).
38. Empty state rendered with the list's compact padding → generous vertical air until real rows exist (§5 casebook 6).
39. Tinted fill behind an icon outside its two homes → bare colored glyph. Fills live only on status circles in tables/registries and hue tiles on catalogue/selection cards (§6 icon fills).
40. Solid tint-filled info banner → transparent background, semantic-colored border, semantic ink, bare icon (§3 notes & banners).
41. Data table with uniform column alignment → identity column left, all other columns centered, headers following their columns (§5).
42. A workstation lock that replaces the live screen with an opaque second login canvas, wraps the title in a 400px column, or paints login tokens at 1× → modal on the blurred/tinted workstation: `--overlay` scrim, `--panel` card, `--r-lock`, `--s-8` padding (`--s-10` on top), one-line title. Inner title/field/button reuse the S0 login classes at `--login-scale` so they match login’s painted size. Figma lock numbers from a 2880×1864 frame are @2× — halve them for CSS.
43. A panel title forced onto two lines with `\n` and `white-space: pre-line` to fit a narrow column → keep the title on one line (`white-space: nowrap`); size the column for the longest locale (§9). A forced wrap makes a §4 panel title look like a caption.
44. A sparse spline or thin columns floating in a wide dashboard panel → full-width horizontal day rows, calendar week Monday–Sunday, value on every row. A rolling window that starts on “today minus six” makes Monday land in the middle of the axis.
45. A temporary mode parked in permanent navigation (batch processing as a sidebar destination, a bulk bar always visible) → reveal it contextually when its precondition exists (rows selected); permanent chrome is for permanent destinations.
46. A platform chooser built as a 2×2 of cards, a stretched `--w-launcher` split, a top header with wordmark + preferences, or a cluster floating between the gutters → one centered 1200px content column split edge to edge: logo + title left, four borderless destination rows stacked right (hue tile + name + audience, fill on hover only); language/theme as slash-separated bottom-left chrome whose glyph sits on the title's edge. Descriptions, arrows, and a second logo in a header go.
47. A demo/role switcher (or any per-session identity control) rendered inside a page header, or duplicated between the header and the top bar → one control, in the **top-bar role slot** (`#adminRoleSlot`), on every page where the role changes what the page shows; pages the role does not affect render none. *Why: it is global state, not page content — two controls for one fact is rule 6, and a page-header copy makes the header advertise chrome instead of orienting (§3 page header, rule 7).*
48. A creation wizard whose final action opens a *dependency* of the thing it just created (a form, a document, a template) instead of the thing itself → the primary action opens **the object's own editor**; the secondary action lands wherever the saved draft is visible. The dependency is attached from inside that editor, where it lives. *Why: the last screen of a wizard teaches the object model. Sending the author to the form editor taught that a service is a form; sending them to the constructor teaches that a service is a process which uses a form.*
49. A number in permanent chrome (a rail badge, a panel count) that is a literal rather than a selector over the same state the list renders → derive it. *Why: a count that never moves when the state machine does reads as a bug, and the moment it disagrees with the list below it, the whole screen stops being trusted.*
50. Two pages of one console resolving the theme differently (one pinned to `data-system-theme`, the rest honoring `ekh.preferences.theme`) → one boot script for the whole console; keep the pin only for a surface that genuinely must follow the OS. *Why: the flash is not the defect — the defect is that navigating between two pages of the same product changes its appearance, and that the preferences control is disabled on some pages and not others (§7).*


## 11. Verification — definition of done

```bash
npm run lint:design-system   # must pass — §1 is not negotiable
npm test                     # lint + contrast + functional/privacy/presentation/responsive
npm run test:a11y
npm run test:visual
```

Then review like a designer, and measure like an engineer:

- 1440px (sidebar expanded *and* collapsed), 960px, 620px, and a viewport under 700px tall; light and dark; Russian and Tajik.
- **Measure the roles numerically** on every page you touched: `getComputedStyle` for the §4 type roles, `getBoundingClientRect().left` on the `h1` for the shared content edge. Same role, same number, every page.
- Compare side-by-side with `admin/services.html`: does your page read as the same product?
- Hunt the classic defects: header/body column drift, inconsistent left edges, everything-bold rows, tiny uppercase labels, clipped focus rings, color-only status, menus growing from the wrong origin, layers that vanish without an exit, hover stuck on touch, horizontal overflow during sidebar collapse.
- Read your own diff as a design artifact: for every meaningful change, you can state the user problem, the rule applied (cite the § here), what was *removed* because the new element replaces it, and which test protects it.

A page is polished when a user works faster and misreads less while being only vaguely aware that the interface got "cleaner."

## 12. Platform handoff — Ministry

State of convergence before the Ministry redesign, so an agent starts from facts, not archaeology:

**Already shared (do not rebuild):** the `.ekh-side` sidebar, the `.login` workstation gate with MFA, the operator sessionStorage contract (`ekh.ministry.arm`), the design lint, tokens, and the icon sprite. Ministry's `.filter-select` custom listbox is canon-compliant (§3 Filters).

**Audit first, in this order (§2 procedure applies as-is):**
1. **Typography roles** (§4) — measure every role numerically against the scale; Ministry predates the settled 28/24/17/14/13/12 ladder and the weight-token rule.
2. **One content container** (§5) — Ministry must name its single workspace container and route every screen through it; measure the `h1` left edge across screens.
3. **Padding casebook** (§5) — all seven cases, especially optical vertical symmetry in queue panels and wrapping-card rows in report grids.
4. **Hover geometry** (§5 casebook 2) — Ministry queues are records (bleed); its menus and popovers are islands.
5. **Icon fills** (§6) — status circles stay in queue tables; leading icons in dense rows go bare; banners become outlined (§3).
6. **Global preferences** (§3) — Ministry's avatar menu must carry the language + three-state theme rows of the profile popover canon; no permanent-chrome toggles.
7. **Tables** — identity column left, other columns centered (§5); shared `--*-columns` definitions (rule 18).

**Does not apply:** rule 25 (cross-page view transitions) — Ministry is a single-document SPA; screen changes follow §8's in-app motion budget instead.

**The bar:** Ministry was the *original* polish reference (Appendix, `e0c8385`) — this pass brings it up to the canon that admin and ЦОН have since established. Where Ministry's existing pattern is better than the canon, follow §0: change the rule and the code in the same commit, with reasoning.

## Appendix — evidence

Every rule above was distilled from a real pass; read the diffs for worked examples. This is also the maintenance model: each future pass that teaches a new rule adds its commit here.

| Commits | Pass | What it demonstrates |
| --- | --- | --- |
| `e0c8385`, `c5967ca` | Ministry workflows + typography | IA before styling; weight/case discipline; table geometry |
| `ba33432`, `c359fba` | Admin governance + form builder spacing | De-decoration, status icons, spacing by relationship |
| `0800b7a` | Shared sidebar (`.ekh-side`) | Promoting a pattern to `design-system/`; the collapse contract |
| `545ef3b` | Dashboard metrics + typography | The separate-bordered-card KPI canon |
| `a015e61` | Builder workspace | Device-preview geometry, editor shell-lock, shared scrollbars, title-only pipeline |
| `4b9381c` | Wizard + selected tiles | Shared stepper canon; solid-blue selected icon wells |
| `ec39b20` | Forms library convergence | A full page converging on existing canon; versioned-row pattern (rule 26) |
| `10cbabb` | Typography unification | Browser-measured role scale across all pages (§4 table) |
| `5ccd252` | Cross-page navigation | Render-blocked shell + view transitions (rule 25) |
| `825bc2f`, `1328533` | Edge alignment + quiet chrome | One content container (§5); header-action-only-when-needed |
| `3b00217` | Profile popover | Preferences out of permanent chrome; `--shadow-1` token |
| `44aecd3` | ЦОН workstation convergence | Root font-size vs. rem type tokens; one definition per shared class name (`.ekh-dialog`, `.ekh-toast`, `.ekh-filter`, `.ekh-checkbox`); `--*-ink` text-on-tint pairs with a contrast test; layer exits; URL state under a privacy contract |
| `27e47c5` | ЦОН identity gate | One `--w-gate-wide` card; script only while waiting (rule 29) |
| `27e47c5` | ЦОН Face ID scan | Marching dotted stroke, not a scanline (rule 30) |
| `fba1912` | ЦОН idle shift home | Denser recent list; optical vertical symmetry in the container (§5, rule 32); KPI vertical centering |
| `896890a` | Figma login + popup redesign | Flat shared workstation gate; responsive six-cell MFA; 40px quiet dialog surface; locked-workstation popup convergence |
| `6d36499` | Admin stylesheet consolidation | One definition per class; deleting override strata instead of adding more; app.css −34% with a measured `getComputedStyle`/`getBoundingClientRect` proof of identity |
| `50d4f93` | Admin shell + IA | One role control in the top-bar slot (rule 47); a task out of permanent navigation (rule 45); one theme contract per console (rule 50); derived rail counts (rule 49) |
| `7c8dd80` | Admin dashboard | The glanceable dashboard-card row (§5 casebook 2) applied three ways; a real queue instead of a hardcoded row; one feed instead of three thin panels |
| `09fc7e0` | Admin registry | The library list promoted to `design-system` (`.ekh-list-head`/`.ekh-list-row`); one `--list-columns` for header and rows (rule 18); identity left, everything else centred (rule 41) |
| `c36c1c1` | Admin wizard | A wizard ending in its object's editor (rule 48); a prose duration becoming a bounded choice |
| `5b809d5` | Admin builder | One toolbar; titles-only pipeline rail (rule 22); a colour-only state badge gaining a glyph and an accessible name (§9); a second field composer deleted rather than maintained |
| `e2e60bd` | Admin review | One heading per view; one fact per column; the canon filter and top-bar search; truthful required marks; guidance moved into the empty state |
| `fdb4cc9` | Admin form composer | A pattern extracted rather than rebuilt (rule 21): collapsed rows, grip drag with a keyboard path, three languages, formats and conditions in one module |
