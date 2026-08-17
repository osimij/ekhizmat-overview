# eKhizmat design guide

Status: **canonical and default**. This is the single UX/UI contract for every eKhizmat platform (Citizen, Ministry, ЦОН/TSON, Admin, mobile prototype). It supersedes and replaces `polish-design-guide.md`, `docs/PLAN-MINISTRY-POLISH.md`, and `docs/component-inventory.md`.

Reference implementation: **`admin/services.html`** (the admin governance polish pass, commits `0c4e435..545ef3b`, August 2026), building on the Ministry polish pass (`e0c8385`, `c5967ca`). When a rule here seems ambiguous, open services.html next to the page you are changing and copy its reasoning.

The one-sentence philosophy, proven twice now:

> Polish is not the number of visual elements. It is the quality of hierarchy, alignment, restraint, state feedback, and edge-case handling.

---

## 0. How to use this guide (read this first, especially if you are an AI agent)

- Asked to build, restyle, "clean up", or polish any page → follow the **procedure in §2**, applying the rules in §3–§10. Do not invent a personal aesthetic; the aesthetic is defined here.
- Every rule in **§1 is machine-enforced** by `qa/design-lint.mjs`. Your change is not done while `npm run lint:design-system` fails.
- The **§10 decision rules** are the quick-reference form of this guide: "when you see X, do Y." Most polish work is applying those mechanically.
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

These fail CI. Never introduce them; remove them on sight:

1. **No raw colors** in app or design-system CSS — no hex, no `rgb()/rgba()`. Semantic tokens only (`--ink`, `--panel`, `--blue-tint`, …). Raw values live only in `design-system/tokens/color.css`.
2. **`letter-spacing` is always 0.** No positive, no negative tracking anywhere. `--tracking: 0` is a contract.
3. **No `text-transform: uppercase`.** Sentence case everywhere (see §4).
4. **No `transition: all`** and **no raw `cubic-bezier(...)`** — use motion tokens (`--t-*`, `--ease*`) only.
5. **Icons come only from the canonical sprite** `/design-system/assets/icons.svg#i-…` — never local `<use href="#…">` copies.
6. **No copied foundations** — apps never load or fork their own `tokens/base/components` CSS.
7. **localStorage keys** must be on the approved list in `qa/design-lint.mjs` (`ekh.preferences.theme|lang`, `ekh.admin.rail`, `ekh.ministry.side`, `ekh.citizen.auth`, `ekh.tson.bind`).

And two contract rules the lint cannot see:

8. The font is **Inter** via `var(--font)` (`design-system/tokens/type.css`). Do not introduce another font or a per-app override.
9. A pattern used by two or more pages belongs in `design-system/`, with an entry in `styleguide.html` and (for admin) `docs/admin-component-map.md`. Do not copy improved CSS between apps.

## 2. The polish procedure

Work in passes, in this order. Later passes are wasted if earlier ones are skipped.

1. **Inventory.** Screenshot the page in its real states: default, most crowded, empty, error, open menu/dialog, light/dark, Russian/Tajik, desktop/tablet/phone. List every visual object on the main screen and what fact or action it represents. Map user tasks by frequency (constant / repeated / occasional / rare) — frequency decides visibility and motion budget.
2. **Remove competition** (§10 rules 1–7). Duplicate representations of one fact, decorative icons in dense rows, subtitles that restate the title, redundant chips, actions repeated in several places. This pass deletes; it does not restyle.
3. **Converge controls** (§6, §10 rules 8–12). Filters become the labeled dropdown; natives get the shared custom styling; KPI cards, status displays, top bar, and sidebar converge on the canon in §3.
4. **Typography** (§4). Case, size, and weight discipline. Mostly this pass makes things smaller, quieter, and less bold.
5. **Layout and alignment** (§5). Token spacing by relationship, single-definition grids, `min-width: 0`, intentional truncation, stable shell anchors.
6. **States, behavior, accessibility** (§7, §9). Complete state coverage, URL-synced filter state, sticky panel scrolling, focus/touch/reduced-motion, localized accessible names.
7. **Motion last** (§8). Only where it explains state or space.
8. **Verify** (§11) and, if a page needed a rule this guide lacks, add the rule here in the same change.

## 3. Canon decisions

Settled product-wide. Pages still using a retired pattern are wrong, not "alternative":

| Topic | Standard | Retired |
| --- | --- | --- |
| Filters | Labeled dropdown: icon + text label + `appearance:none` select with chevron in a bordered field (`.registry-status-filter` on services.html); `:focus-within` ring | Segmented radio button-rows for filtering (tabs remain valid for *view* switching, e.g. `.lc-review-tabs`) |
| KPI / stat cards | **Separate bordered cards**: `--panel` background, `1px --line-in` border, `--r-l` radius, `--s-3` gap; value first, label second; `tabular-nums`; when a stat filters a list it is a `<button>` with `aria-pressed` (`.dashboard-metrics`, `.reg-stats`) | Joined strips with internal dividers; label-above-value order; icon tiles inside stat cards |
| Status in repeated rows | `.status-icon` (28px round, tinted, `role="img"` + `aria-label` + `title`): success=check, info/in-progress=clock, draft/warning=edit, danger=x | Text status pills in dense rows (pills stay valid in detail headers where the status is primary content) |
| Top bar | `60px`; page title left; search optically centered, `min(460px, 37vw)`; right side holds the **role slot only**; no avatar (identity lives in the sidebar user card); **no theme toggle** — theme follows the OS via `data-system-theme` | Per-page moon/sun toggle; avatar in the top bar |
| Sidebar | The shared `.ekh-side` component only (`design-system/css/sidebar.css` + `sidebar.js`): 264px expanded / 66px rail, fixed 33px icon axis, pre-paint collapse class on `<html>`, labels morph into hairline dividers, neutral (non-blue) selection in dark mode | Bespoke per-app rails (`.adm-rail`, old ministry rail) |
| Page header | One `h1`; a subtitle only when it adds orientation the title lacks; the page-level create/new action is a **quiet pill** (border, transparent, `--ink-2`) — blue is reserved for the decisive action of a flow (continue, publish, submit) | Subtitle restating the title; `btn-pri` on browse-page headers |
| Form controls | Shared custom-drawn radios/checkboxes (`appearance:none`, blue dot / SVG check, `:focus-visible` ring); every `select` gets `appearance:none` + sprite chevron; binary/short choices may be tappable cards (`.cost-options`) | Bare native radios/checkboxes/selects inside styled flows |
| Action color | `--blue` (`#0072d6` in tokens — chosen for identity + contrast) marks interactivity: primary action, selection, focus, links. One primary per region/decision. Explicit hover/press tokens, never `filter: brightness()` | Blue as decoration or heading color |
| Density | Platforms share anatomy, tokens, and state language but not density: Citizen comfortable/touch (44px+), Ministry compact specialist, ЦОН workstation (1280px minimum), Admin editor-oriented multi-pane | Forcing one density on all platforms |

## 4. Typography

Inter, `--tracking: 0`, sentence case, `tabular-nums` on all data surfaces (identifiers, dates, money, counts).

Scale — use `--fs-*` tokens by role:

| Role | Token | Weight |
| --- | ---: | ---: |
| Page title | `--fs-24`–`--fs-32` (consoles clamp between them) | 600 |
| Modal / section title | `--fs-20` / `--fs-16`–`--fs-18` | 500–600 |
| Body / operational baseline | `--fs-15` | 500 (consoles), 400 (long-form) |
| Row title (repeated lists) | `--fs-14` | 500 |
| Micro-label, table header, eyebrow, section caption | `--fs-14` sentence case | 500–600 |
| Secondary row metadata | `--fs-12`–`--fs-13` | 400–500 |
| Compact badge only | `--fs-10`–`--fs-11` | 550–650 |

Weight ladder — the whole interface uses a narrow band:

- **400** — long-form text, input values, quiet metadata, lead paragraphs.
- **450–500** — default UI text; repeated row titles are 500.
- **550** — medium emphasis: badges, key cells.
- **600** — the ceiling: headings, primary/danger button labels, and the *active/selected/current* item in a repeated list. Only state earns extra weight; decoration never does.
- **620–680** — display numerals only (stat values, money sums).

The most common defect in unpolished pages is everything bold at once: 11–12px uppercase tracked labels and 640–720 weights competing. The fix is always the same — 14px sentence case, letter-spacing 0, weight down the ladder.

## 5. Space, surfaces, alignment

**Spacing** uses the 4px token scale (`--s-1`…`--s-16`) chosen by *relationship*, not by eye: icon↔label 4–8, controls in one toolbar 8–12, columns in a row 12–20, panel interior 16–24, page sections 24–32, hero separation 40+. One 4px optical deviation is allowed with a code comment; it must not break the shared grid.

**Surfaces**, in order: `--bg` (page) → `--panel` (primary container) → `--field` / `--field-on-panel` (inputs, quiet groups) → `--raised` + `--shadow-layer` (menus, dialogs). Borders are quiet separators: `--line` around groups, `--line-in` for internal hairlines. One border per semantic level — never nest bordered cards that add no meaning.

**Scrollbars** are a shared foundation, never page-local: every page and nested scroll surface uses the 6px treatment in `design-system/css/foundations.css`, with a transparent track and a low-contrast thumb that becomes slightly clearer on fine-pointer hover. Do not hide or restyle scrollbars in an app stylesheet.

**Semantic state colors**: green = done/valid, amber = waiting/degraded, red = error/breach/destructive, neutral = draft/inactive. State must survive without color (text, icon, position, or accessible name carries it too). Category hue tiles (`--h-*-bg/fg`) aid recognition in catalogues; remove them from dense comparison rows.

**Alignment is a system**:

- Define table/queue columns **once** in a custom property, shared by header and rows (`--queue-columns` pattern); identical padding for both.
- Every flexible grid/flex child that may truncate gets `min-width: 0`. Use `minmax(0, 1fr)`, never bare `1fr`, for content tracks.
- Ellipsis only where the full value stays reachable (detail view, `title`, accessible name). Truncation is a layout decision, not an emergency.
- Shell anchors are stable: `--h-topbar` 60px, `--w-side` 264px / `--w-side-collapsed` 66px, centered search. Content changes never move navigation or global chrome.
- Multi-pane editors constrain reading width (`--w-builder-editor`) even when the workspace is wide; side panels (version rails, live previews) are `position: sticky` with their own `overflow-y: auto` scroll.

## 6. Components

Canonical anatomy lives in `styleguide.html` and `docs/admin-component-map.md`; compose, don't fork. Every interactive component must expose the full state set:

`default → hover → active/press → focus-visible → selected/open → disabled → loading → error/success → reduced-motion`

- **Buttons**: pill shape; press `scale(.97)` (`.96` icon buttons) over `--t-fast`; disabled never moves; primary/danger labels 600, ordinary 500.
- **Navigation items**: 18px outline icon, tint + ink + weight change together on the active item; counts stay secondary (red tint only when urgent).
- **Dropdown filter** (the canon filter): visible text label with 16px icon, bordered 38px field, `appearance:none` select, sprite chevron, `:focus-within` ring, syncs to the URL (§7).
- **Custom controls** beyond styled natives require the complete keyboard/ARIA model (trigger `aria-haspopup/expanded/controls`, listbox `aria-selected`, arrows/Home/End/Escape, focus return). Visual polish without keyboard completeness is unfinished work.
- **Status icons**: the four-glyph mapping from §3; tint pair + `role="img"` + localized `aria-label` + `title`.
- **Empty states** answer: what happened, is it good or bad, what can I do next (`.reg-empty`, `.fb-empty`). **Loading** skeletons match final geometry. **Errors** are specific and sit next to the decision they affect.

## 7. Behavior and state

- **Filter/view state lives in the URL** (`?status=draft`) via `history.replaceState`; on load, an allow-listed query param restores state. KPI cards that act as shortcuts set the same state and `aria-pressed`.
- **Theme** follows the OS (`data-system-theme` + `matchMedia` pre-paint script). **Sidebar collapse** persists (`ekh.admin.rail`) and is applied on `<html>` before first paint — no flash, no animation on load; the width tween arms only on a real toggle.
- Dynamic list regions get `aria-live="polite"`.
- Preferences are never silently overwritten by deterministic demo query params (see `docs/decisions.md`).

## 8. Motion

Character: calm, immediate, official. No bounce, no spring. Motion explains state or space — never decorates.

Frequency budget: constant actions (search, filter, sort, queue redraw) get **no** spatial animation; repeated ones near-instant; occasional layers (dialog, drawer, toast) standard transitions; rare moments (login, first success) a little warmth.

Tokens only: `--t-fast` 120ms (hover/press/color), `--t-popover` 150ms, `--t-exit` 160ms (exits slightly faster than entries), `--t-step` 180ms, `--t-layer` 200ms, `--t-draw` 400ms; curves `--ease`, `--ease-out`, `--ease-layer`. All zero out under reduced motion — but test that the interface still communicates.

Spatial rules: popovers grow from their trigger (`transform-origin`); drawers/toasts exit the way they entered; scale entrances start ~.98, never 0; remove DOM only after the exit finishes. Animate `transform`/`opacity` only — never font-size, padding, or page layout (the single-track sidebar tween and toast-stack collapse are the two audited exceptions).

## 9. Responsive, localization, accessibility

**Responsive** preserves task and reading order, recomposing at *content-failure* breakpoints, not device names: consoles fold the detail column below content (~1080px), swap the rail for a drawer / cards for tables (~960px), tighten padding (~620px). Test short viewports, not just narrow. `pointer: coarse` targets ≥44px.

**Localization (RU + TJ) is a layout rule**: size controls for the longer real translation; localize data, durations, money, statuses, and every `aria-label` (including both outcomes of stateful controls — "collapse"/"expand"); a component that breaks in the longer language is not finished.

**Accessibility is part of polish**: every control has a programmatic name; focus visible and never clipped; dialogs trap focus, close on Escape, return focus; row-buttons are keyboard reachable with useful names; sort direction is announced, not just drawn; color is never the only channel; hover-only affordances have focus/touch paths (`@media (hover:hover) and (pointer:fine)` gates hover styles).

## 10. Decision rules — quick reference

Apply mechanically wherever seen:

1. Uppercase/tracked micro-label → `--fs-14` sentence case, `letter-spacing: 0`.
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
12. Theme toggle in page chrome → remove; `data-system-theme` + pre-paint script.
13. Bare native select/radio/checkbox in a styled flow → shared custom-drawn control with `:focus-visible`.
14. Blue on a browse-page header action → quiet pill; blue only for the flow's decisive action.
15. Raw color/spacing/duration/curve value → token (lint enforces most of these).
16. Bare `1fr` or truncation-prone child without `min-width: 0` → `minmax(0,1fr)` + `min-width:0`; ellipsis only with the full value reachable.
17. Header and rows with separately defined columns → one `--*-columns` custom property for both.
18. Tall side panel scrolling with the page → `position: sticky` + own `overflow-y: auto`.
19. Hover-only affordance → add focus-visible and touch paths.
20. A good pattern rebuilt locally for the second time → promote to `design-system/`, add to `styleguide.html` + the Figma map.

## 11. Verification — definition of done

```bash
npm run lint:design-system   # must pass — §1 is not negotiable
npm test                     # lint + contrast + functional/privacy/presentation/responsive
npm run test:a11y
npm run test:visual
```

Then review like a designer:

- 1440px (sidebar expanded *and* collapsed), 960px, 620px, and a viewport under 700px tall; light and dark; Russian and Tajik.
- Compare side-by-side with `admin/services.html`: does your page read as the same product?
- Hunt the classic defects: header/body column drift, inconsistent left edges, everything-bold rows, tiny uppercase labels, clipped focus rings, color-only status, menus growing from the wrong origin, layers that vanish without an exit, hover stuck on touch, horizontal overflow during sidebar collapse.
- Read your own diff as a design artifact: for every meaningful change, you can state the user problem, the rule applied (cite the § here), what was *removed* because the new element replaces it, and which test protects it.

A page is polished when a user works faster and misreads less while being only vaguely aware that the interface got "cleaner."

## Appendix — evidence

The rules above are distilled from real passes; read the diffs for worked examples:

| Commits | Pass | What it demonstrates |
| --- | --- | --- |
| `e0c8385`, `c5967ca` | Ministry workflows + typography | IA before styling; weight/case discipline; table geometry |
| `ba33432` | Admin governance experience | De-decoration, status icons, wizard control styling |
| `c359fba` | Form builder spacing | Spacing-by-relationship fixes |
| `0800b7a` | Shared sidebar (`.ekh-side`) | Promoting a pattern to `design-system/`; collapse contract |
| `545ef3b` | Dashboard metrics + typography | The separate-bordered-card KPI canon |
