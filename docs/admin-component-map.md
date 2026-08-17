# Admin → Figma Component Map

Figma library: **eKhizmat Admin · Component Library**
https://www.figma.com/design/7oLyneW8KGGotb5Qevm0wH

Every reusable piece of the admin platform (Конструктор) extracted into Figma components,
built on variables that carry the real CSS custom properties (`var(--…)`) in their Web code
syntax. Redesign in Figma → copy token values back into `design-system/tokens/*.css` →
restyle the mapped classes below.

## Tokens

| Figma collection | Modes | Maps to |
|---|---|---|
| `Color` (31 vars) | Light / Dark | `design-system/tokens/color.css` semantic vars (`--ink`, `--panel`, `--action`, tints…) |
| `Hues` (28 vars) | Light / Dark | the 14 `--h-*-bg/fg` tile pairs |
| `Spacing` (10 vars) | — | `--s-1` … `--s-16` |
| `Radius` (5 vars) | — | `--r-s` … `--r-pill` |
| Text styles (12) | — | Inter ramp per `tokens/type.css` |
| `Shadow/Layer` effect | — | `--shadow-layer` |
| `Scrollbar` foundation | Rest / hover | universal 6px treatment in `design-system/css/foundations.css` |

Every variable's **Web code syntax** is the exact CSS var, visible in Figma Dev Mode.

## Components ↔ code

| Figma page | Component (variants) | Code |
|---|---|---|
| 🧩 Icons | `icon/<hugeicons-name>` × 42 | replaces `design-system/assets/icons.svg` sprites |
| 🧩 Button | `Button` (Style: Primary/Secondary/Ghost × Size: M/S; props: Label, Has icon, Glyph) | `.btn`, `.btn-pri/.btn-sec/.btn-ghost`, `.btn-sm` |
| | `Icon Button` (36px) | `.icon-btn` |
| | `Row Action` (28px) | `.rowact` |
| 🧩 Pills & Badges | `Status Pill` (6 tones) | `.pill-st`, `.status-pill--*` (unified) |
| | `Metachip` | `.metachip` |
| | `Source Tag` | `.src-tag` |
| | `Count Badge` | `.cnt`, `.stg-n` |
| | `Var Chip` | `.var-chip` |
| 🧩 Tiles & Avatars | `Icon Tile` (10 hues, Glyph swap; Selected = solid `--blue` / `--on-blue`) | `.tile .t-*`; selected via `:has(> input:checked) > .tile` or `.tile[aria-pressed="true"]` |
| | `Avatar` (Initials prop) | `.avatar`, `.av` |
| 🧩 Inputs | `Field` (Text/Select/Search/Textarea; Label/Value/Help props, label+help toggles) | `.field`, `.input`, `.select`, `.at-search` |
| 🧩 Selection Controls | `Segment` + `Segmented Control` | `.seg` |
| | `Toggle` (On/Off) | `.sw`/`.knob` |
| | `Toggle Row` | `.pr` |
| | `Checkbox Row` | `.consent` |
| 🧩 Navigation | `Rail Item` (Default/Active; Count toggle, Glyph swap) | `.ekh-side__item` (shared sidebar, all platforms) |
| | `Rail Section Label` | `.ekh-side__label` |
| | `User Card` | `.ekh-side__user` |
| | `Top Bar` | `.adm-top` |
| 🧩 Stats & Metrics | `Stat Card` (Default/Danger) | `.stat`, `.metric` |
| | `Metric Inline` | dense strips |
| 🧩 List Rows | `Service Row` | `.svc-row` (also reuse for forms list, versions, tasks) |
| | `Field Row` | `.fb-item` head |
| 🧩 Pipeline & Steps | `Pipeline Stage` (Default/Selected; sub/count/dot toggles) | `.stg` |
| | `Lifecycle Chip` (Done/Current/Upcoming) | `.lc .st` |
| | `Checklist Row` (Ready/Attention) | `.chk-row` |
| | `Sandbox Step` (Pending/Running/Passed) | `.sbx-step` |
| 🧩 Content Blocks | `Panel` (Title prop + slot) | `.panel` |
| | `Mobile Preview Actions` (paired / full-row) | `.mobile-preview-actions` |
| | `Section Header` (kicker/lead toggles) | `.eh`, `.sec-head` |
| | `Note` (Info/Success/Warning/Danger) | `.note-info`, `.note-warn` |
| | `Empty State` | `.reg-empty`, `.fb-empty` |
| | `Tab` (Active/Default) | `.tab`, `.ml-tabs` |
| | `Stepper` (Current / Done) | `.stepper`, `.stepper__step[aria-current='step']`, `.stepper__step.done` |
| 🧩 Overlays | `Modal` (slot body, icon-only close, action pair) | `.modal` + `.mhd` |
| | `Toast` | `.toast` |

## Icon mapping — icons.svg → Hugeicons (stroke-rounded, 24px, 1.5px)

| Current | Hugeicons | Current | Hugeicons |
|---|---|---|---|
| i-search | search-01 | i-info | information-circle |
| i-plus | plus-sign | i-lock | square-lock-01 |
| i-edit | edit-02 | i-building | building-02 |
| i-doc | file-01 | i-globe | globe-02 |
| i-check | tick-02 | i-money | money-01 |
| i-x | cancel-01 | i-bell | notification-01 |
| i-trash | delete-02 | i-filter | filter-horizontal |
| i-eye | view | i-chev-l/r/d | arrow-left/right/down-01 |
| i-users | user-multiple | i-arrow-ur | arrow-up-right-01 |
| i-role | user-settings-01 | i-moon / i-sun | moon-02 / sun-03 |
| i-shield | shield-01 | i-star8 | sparkles |
| i-wallet | wallet-01 | (overview) | dashboard-square-01 |
| i-sign | signature | (grip) | drag-drop-vertical |
| i-gear | settings-02 | i-paperclip | attachment-01 |
| i-mail | mail-01 | i-cat-cert | certificate-01 |
| i-history | clock-04 | i-cat-passport | passport |
| i-refresh | refresh | i-baby | baby-01 |
| i-clock | clock-01 | i-biz | briefcase-01 |
| i-calendar | calendar-03 | i-retire | archive-02 |
| i-upload | upload-02 | i-rings | (pick in Hugeicons plugin) |

SVGs pull from `https://cdn.hugeicons.com/icons/<name>-stroke-rounded.svg`.
`i-logo` stays custom (brand).

## Compact-UX direction encoded in the components

1. **Icon-first actions.** Row/toolbar actions are `Row Action`/`Icon Button` (icon-only with
   tooltip), not text buttons — kills the "everything looks like a button" clutter.
2. **One row anatomy.** `Service Row` (tile · title+meta · trailing status) is the single list
   pattern for services, forms, versions, publications and review tasks.
3. **Status is a pill, never a sentence.** `Status Pill` + `Metachip` replace prose status text.
4. **Optional verbosity.** Section leads, field help, stage sub-lines and nav labels are all
   boolean props — the compact mode is "toggles off", already designed in.
5. **Tighter density.** Paddings sit on the `space/2–space/3` steps; headers are one line.
