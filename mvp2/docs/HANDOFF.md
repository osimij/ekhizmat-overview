# eKhizmat Blueprints — Handoff & Context

> Read this first in a new session. It explains the `blueprints/` set: a Figma-bound
> screen library covering the **service-application form template**, the **full client
> journey/lifecycle**, the **admin panel**, and the **operator (in-person service-window)
> console** (§10). Built **June 2026**, Tajik-first, in the
> existing eKhizmat design language. The live prototype (`index.html`) is only lightly touched via
> **shared CSS** (the design-system pass + the class-based theme-toggle fix, §4); its markup/JS are untouched.

---

## 1. What this is & why

The live prototype shipped one hard-coded citizen flow (the "I had a baby" journey). The
user asked for three things, designed well enough to **port to Figma**:

1. A **reusable form-filling template** for requesting *any* service (certificates/
   references — маълумотнома/справка — and beyond).
2. The **full client journey** built on that template (discover → apply → track → receive
   → use), plus a **map** of which components live where.
3. The **admin panel** — conceptual for MVP, but every screen laid out, especially
   **how adding a user looks**.

Decision recap: fresh **standalone files** (don't touch `index.html`); **5 worked services**
to exercise all field types + modals; admin = **core + management** (9 screens); icons are
**placeholders now** (the user will wire a Hugeicons MCP later — see §7).

## 2. File map

```
blueprints/
  index.html          Gallery launcher (links every screen + both maps + the UI kit)
  components.html     DESIGN-SYSTEM reference / UI kit — every primitive in every state
                      (color, type, radii, buttons, inputs+validation, select, segmented,
                      checkbox/radio, switch, tags/pills, tiles, dropdown, dropzone, modal/toast)
  map-citizen.html    Client journey lifecycle map (8 stages, front/back-stage, principles)
  map-admin.html      Admin IA / flow map (entry → review loop → management cluster)
  service.html        Generic SERVICE DETAIL (once-only preview, cost, est, requirements)
  apply.html          THE form template — 5 service configs + every modal (see §6)
  track.html          Tracking (radical transparency) + 4 status states via tabs
  document.html       Delivered certificate viewer + share(QR)/verify modals
  admin-login.html    Staff sign-in (split layout, role-aware, 2FA)
  admin-dashboard.html Queues, SLA, public transparency KPIs, action-needed
  admin-inbox.html    Applications queue (data table, filters, SLA, bulk assign)
  admin-review.html   One application + decision modals (approve / request-info / reject)
  admin-users.html    Staff users table
  admin-user-new.html Add-user WIZARD (5 steps: identity→role→dept→permissions→invite)
  admin-services.html Service registry + form/template builder (drives apply.html)
  admin-roles.html    Roles × capabilities matrix
  admin-settings.html Offices, hours, routing rules, pickup points
  (operator console)  MOVED → the standalone /OPERATOR bundle (op-login/op-queue/op-verify +
                      css/operator.css + its own JS engine + docs). See §10.
css/blueprint.css     NEW shared components only (built on tokens/base/components/screens)
js/sprite.js          Injects the icon sprite (44 real Hugeicons + 25 placeholders) at <body> top
js/blueprint.js       Shared interactions (stepper, modal+focus-trap, tabs, pressed-groups,
                      upload demo, toast, faux-QR, admin rail builder, page-nav) + the LANGUAGE
                      ENGINE (source-keyed tg→ru swap, persistence, MutationObserver) + switcher injection
js/blueprint-i18n.js  Tajik→Russian dictionary: window.BP_DICT = { ru: {<tajik source>:<russian>} }
                      (~919 entries; flat JSON, editable). English deferred — add a sibling `en:{}` to enable.
.qa/blueprints.mjs    Screenshot every page × {light,dark} × {desktop,mobile}
.qa/apply-states.mjs  Drive apply.html through steps/modals
.qa/lifecycle-states.mjs  Track tabs + document modals
                      (operator QA → /OPERATOR/qa/operator.mjs, lives with the bundle)
docs/HANDOFF.md       This file
```

Each page links `tokens → base → components → screens → blueprint` CSS, loads
`js/sprite.js` right after `<body>` opens, and `js/blueprint.js` at the end.

## 3. How to view & QA

```bash
# from repo root
python3 -m http.server 8799 --directory .
# open http://localhost:8799/blueprints/index.html  (the gallery)

# screenshots (all pages, both themes, desktop+mobile) → .qa/bp/
node .qa/blueprints.mjs .qa/bp http://localhost:8799/blueprints/
# a subset:
node .qa/blueprints.mjs .qa/bp http://localhost:8799/blueprints/ apply track
# interactive states:
node .qa/apply-states.mjs && node .qa/lifecycle-states.mjs
```

Gotchas (from memory `ekhizmat-repo-structure`): park the mouse at 0,0 before shots; a
sibling `Desktop/mvp` folder squats ports 8741/8752 — use an explicit `--directory` and a
fresh port (8799). The QA scripts add `body.shot` to hide the dev toolbar in exports.

Every page has a thin **dev toolbar** (`.bp-bar`) at the very top: a page-switcher
`<select>`, theme toggle, and (on apply.html) a service-example switcher. It is hidden by
`body.shot` during screenshots. `apply.html` exposes `window.applyExample(key)` and
`window.bpFlowGoto(sel,n)` for scripting.

## 4. Design language (binding — do not drift)

Source of truth: `design-principles.md`, `css/tokens.css|components.css|screens.css`, memory
`ekhizmat-design-language`. Key rules reused verbatim:
- White panels + **hairline row dividers**, never bordered floating cards, never border-color hovers.
- **Pills** for actions (`#0088FF`/white); **soft-rect** hovers for rows/menus.
- **Icon tiles** carry a hue (`.t-blue…t-olive`) + shape (`.tile .sh-c/.sh-r/.sh-l`).
- **No shadows** except `--veil` on floating layers (modals, drawers, toast).
- **`.src-tag`** (green ✓ "аз …") is the signature of the "once only" principle — used wherever data is pre-filled.
- Dark theme via `html[data-theme]`; 44px targets under `pointer:coarse`; visible focus rings.
- Girih star (`#i-star8`, `#girih-tile`) is identity-only: progress, watermark.

New components added in `blueprint.css` (all token-based): `.bp-bar`, `.gx-*` gallery,
`.svd-*` service detail, `.once` once-only block, `.select`, `.opt` option cards, `.dropzone`/
`.filerow` upload, modal extras (`.mhd/.mx/.pm/.cal/.slots/.loc/.otp`), `.pill-st` status
pills, `.eta`, `.cert-sheet` certificate, `.adm-*` admin shell, `.tbl` data table, `.stat`
dashboard, `.drawer`, `.wz` wizard, `.matrix`, `.jmap/.jstage` vertical map, `.kit-*` UI-kit.

**Design-system pass (June 18, 2026) — shared `components.css`/`tokens.css`, so the live app benefits too.**
The primitives were hardened into a deliberate set and showcased in `components.html`:
- **Switch** (`.sw`) now uses the one action **blue** (was a muddy green) — no off-system color; subtle knob only.
- **Checkbox/radio** are real primitives: `.check`/`.radio` (custom, blue) + global `accent-color` fallback.
- **Inputs** gained states: `.field.err`/`[aria-invalid]` ring + `.err-msg`, `:disabled`, `textarea.input`.
- **Dropzone** border is now visible (`--control-line`) and gets a blue active affordance on hover.
- New tokens: `--track-off`, `--control-line` (both themes).
- **Language switcher** (globe + ТҶ/RU/EN) is **auto-injected by `blueprint.js`** into every `.hdr-acts`
  and admin `.at-right` — single source of truth; the old dead `ТҶ` button is stripped. `blueprint.js`
  also now has a generic `.dd` dropdown handler (open/close, single-select, gliding `.dd-hl` highlight),
  mirroring the live app. New sprite icon: `#i-globe`.

**Language switching + theme-toggle fix (June 18, 2026 — second pass).**
- **Russian works for real** across all 17 screens (not a mock). The engine at the end of `blueprint.js`
  harvests the rendered DOM and swaps each trimmed **Tajik source string** → Russian via `window.BP_DICT.ru`
  (`js/blueprint-i18n.js`). No screen markup carries i18n keys — translation is a pure **runtime layer**, so
  the designed screens are untouched. Choice persists in `localStorage["ekh-lang"]` (holds across page nav).
  Init runs on `DOMContentLoaded` (after page inline scripts), and a **MutationObserver** re-translates
  dynamic content (apply.html service switch, calendar, file rows, toasts). `<select>` options are translated;
  `.bp-bar` dev chrome and the switcher's **native language names** (`[data-no-i18n]`) are not.
  - To extend/maintain: edit `js/blueprint-i18n.js` directly (flat JSON), or `.qa/dict-final.json` + `.qa/build-dict.py`.
  - **English** is intentionally deferred: the switcher shows EN **disabled** with a "soon" tag until a `BP_DICT.en` is added.
- **Theme toggle fixed.** The moon/sun swap CSS in `css/screens.css` was id-scoped to the live app's `#themeBtn`,
  so blueprint headers (`#themeBtn2`) showed **both** icons. Now **class-based** (`.th-moon`/`.th-sun`), so every
  toggle swaps — live app, blueprint headers, dev bar. The injector also adds a header actions cluster (theme +
  lang) to the gallery/map pages, which had a bare header.

## 5. Screen inventory & notable states

- **service.html** — two-column (main + sticky CTA aside); "what you get" ledger; once-only
  preview; how-it-works; works for free/paid/biz.
- **apply.html** — steps: 1 confirm known data · 2 new inputs · 3 delivery & payment · 4
  review & e-sign · 5 success. Stepper hides itself on the success step.
- **track.html** — tabs switch 4 states: review · needs-info · rejected(fixable) · ready.
- **document.html** — certificate sheet (emblem, seal, faux-QR) + share & verify modals.
- **admin-review.html** — produces the citizen-side states: approve / request-info / reject modals.
- **admin-user-new.html** — the emphasized flow; vertical step rail wizard ending in invite-sent.

## 6. Form-template architecture (the core deliverable)

One generic flow drives all services. `apply.html` holds a `SERVICES` map; `applyExample(key)`
toggles step-2 field blocks (`[data-field]`), payment vs free (`[data-when]`), title/org/cost.
The 5 configs and what each surfaces:

| key | service | cost | extra fields | modals shown |
|-----|---------|------|--------------|--------------|
| `family`  | Маълумотнома — ҳайати оила | free | purpose | fix-data |
| `taxdebt` | Маълумотнома — қарзи андоз | paid | purpose, period, recipient | **payment** |
| `archive` | Нусхаи дубораи шаҳодатнома | paid | purpose, **upload** | upload states |
| `zags`    | Ариза ба қайди никоҳ | paid | purpose, **schedule** | **date/slot picker**, **location** |
| `biz`     | Қарзи андоз (шахси ҳуқуқӣ) | paid | entity, purpose, period | payment |

Field types demonstrated: text, segmented, **select**, **date** (modal), **file upload**,
address chips, recipient. Generic modals (all via `.overlay/.modal` + focus-trap in
`blueprint.js`): payment, date/slot, location/pickup, upload, OTP, fix-my-data, success,
share-QR, verify. **The loop closes** in `admin-services.html` → "Конструктори шакл": admin
defines a service's steps/fields, which is exactly what `apply.html` renders.

`blueprint.js` generic hooks (data-attributes): `[data-flow]` + `[data-step]` (+ `.j-prog`
stars and/or `.wz-step` rail) for steppers; `[data-open=id]`/`[data-close]` for any
`.overlay`/`.drawer-ov`; `[data-select]` + `[data-val]` single-select pressed groups (calendar,
slots, methods, locations) with `data-select-enable="#btn"`; `[data-tabs]`/`[data-tab]`/
`[data-panel]` tabs; `[data-upload]` demo upload; `[data-toast]`; `[data-qr]` faux-QR;
`[data-adm-rail data-active=key]` builds the admin nav.

## 7. ICONS — swap procedure & manifest (DONE June 18, 2026)

> **STATUS: complete.** All 25 placeholders were swapped for real Hugeicons via the Hugeicons
> MCP. The MCP is font-only (it returns glyph codepoints, not SVG paths), so to keep the
> inline-SVG sprite consistent with the existing 44 icons, the canonical Hugeicons names below
> were confirmed via the MCP and the matching **stroke-rounded** geometry was pulled from
> `@hugeicons/core-free-icons@4.2.0` (default export = stroke 1.5 / 24×24 / round). Repro:
> `python3 .qa/fetch-icons.py` (re-fetches + rebuilds the symbol bodies), then splice into
> `js/sprite.js`; verify with `node .qa/verify-icons.mjs` (asserts every `<use>` resolves and no
> placeholder body remains). `data-ph="1"` markers are gone. The manifest below is the record.

Originally, no Hugeicons MCP was connected, so **44 real Hugeicons** (already in
`index.html`) were extracted verbatim into `js/sprite.js`, and **25 placeholder symbols** were
added whose **ids are already final**. Each placeholder renders a neutral rounded-square
outline + centered ring, drawn in the 24×24 / 1.5-stroke round-join grammar so it harmonizes
with the real icons and reads as a deliberate icon-slot (not a broken glyph). Markup already
references the final ids — **the swap is only replacing each placeholder symbol's inner paths**.

**Verified swap source** (free package, no auth):
`https://cdn.jsdelivr.net/npm/@hugeicons/core-free-icons@4.2.0/dist/esm/{Name}Icon.js`
returns an array of `["path",{d:"…",stroke,strokeWidth,…}]` — 24×24, stroke 1.5, round caps,
identical grammar to the existing sprite. Convert each `d` into `<path d="…" stroke="currentColor"
stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` inside the matching
`<symbol id="…">` in `js/sprite.js` (replace the `data-ph="1"` body). Once a Hugeicons MCP is
connected, the same id→name map below drives it automatically.

Manifest (id → Hugeicons export · times used). All names below were confirmed against the
Hugeicons MCP / `@hugeicons/core-free-icons@4.2.0` and used **as-is** (no suffix tweaks needed):

| sprite id | Hugeicons export (suggested) | uses |
|-----------|------------------------------|-----:|
| `i-plus`      | Add01Icon (verified)        | 5 |
| `i-user-add`  | UserAdd01Icon               | 3 |
| `i-users`     | UserMultiple02Icon          | 6 |
| `i-filter`    | FilterIcon                  | 3 |
| `i-sort`      | ArrowUpDownIcon             | 4 |
| `i-gear`      | Settings02Icon              | 2 |
| `i-edit`      | PencilEdit01Icon            | 3 |
| `i-trash`     | Delete02Icon                | 0 |
| `i-download`  | Download04Icon              | 3 |
| `i-upload`    | Upload04Icon                | 2 |
| `i-calendar`  | Calendar03Icon              | 2 |
| `i-dash`      | DashboardSquare02Icon       | 3 |
| `i-inbox`     | InboxIcon                   | 3 |
| `i-dots`      | MoreHorizontalIcon          | 14 |
| `i-role`      | UserShield01Icon            | 3 |
| `i-building`  | Building06Icon              | 10 |
| `i-history`   | Time04Icon / ClockIcon      | 0 |
| `i-money`     | Money01Icon                 | 1 |
| `i-arrow-ur`  | ArrowUpRight01Icon          | 15 |
| `i-info`      | InformationCircleIcon       | 9 |
| `i-paperclip` | Attachment01Icon            | 1 |
| `i-card`      | CreditCardIcon              | 1 |
| `i-sign`      | SignatureIcon               | 0 |
| `i-x`         | Cancel01Icon                | 14 |
| `i-refresh`   | RefreshIcon                 | 2 |

(`i-trash`, `i-history`, `i-sign` are defined but currently unused — keep or drop.)

## 8. Porting to Figma

Structure is auto-layout-friendly: each visual block is a flex/grid container = one Figma
auto-layout frame. Responsive breakpoints match the prototype: 1080 / 980 / 880 / 860 / 680 /
560. Recommended export path: screenshot via `.qa/blueprints.mjs` (toolbar auto-hidden), or use
the Figma MCP `mcp__figma__generate_figma_design` per page. Tokens live in `css/tokens.css`
(map to Figma variables: hues `--h-*-bg/fg`, spacing `--s-*`, radii `--r-*`, type `--fs-*`).

## 9. Open TODOs

- [x] **Swap placeholder icons** with real Hugeicons — done June 18, 2026 (see §7; all 25 in `js/sprite.js`).
- [x] **Russian** localisation — done (real, persisted switching across all 17 screens; see §4).
- [ ] **English**: populate `BP_DICT.en` (same source keys) and remove the EN `disabled`/"soon" markers in `blueprint.js`.
- [ ] Optional: push screens into Figma via the Figma MCP.
- [ ] Consider promoting the strongest blueprints into the live `index.html` routing later.

## 10. Operator (in-person service-window) console — MOVED to /OPERATOR (June 22, 2026)

The operator/agent **"тиреза" (service-window)** console — the three screens `op-login`,
`op-queue`, and `op-verify` (the 4-step verify → assisted-fill → e-sign → handover session),
its `css/operator.css`, the amber `.op-tag` provenance/attribution model, and the QA harness —
has been extracted into a **standalone, self-contained bundle** at the repo root: **`/OPERATOR`**.

That folder ships its own copy of the design system, icons, JS engine, fonts, and the full
tg→ru dictionary, so it runs entirely on its own:

```bash
cd OPERATOR && python3 -m http.server 8802 --directory .   # then open index.html
```

Full detail — the flow, the provenance/attribution model, the wiring, and QA — now lives in
**`OPERATOR/docs/HANDOFF.md`**.

**What changed in the shared repo when it moved:**
- The main gallery (`blueprints/index.html`) now links to the bundle via a single
  "Консоли оператор (тиреза) ↗" card (→ `../OPERATOR/index.html`).
- `js/blueprint.js` no longer carries the operator page-nav entries or the `[data-op-rail]`
  / `OP_NAV` rail builder (they were operator-only and are now in `OPERATOR/js/operator.js`).
- `js/blueprint-i18n.js` is **unchanged** — its strings stay, because several "operator"
  entries are in fact reused by admin/citizen screens (e.g. `Навбат`, `Суроға`, `Рад`,
  `Шаҳрванд`, `2 дақ`). They are shared translation data, not operator-only.
