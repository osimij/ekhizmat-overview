# eKhizmat Constructor (BUILDER) — Handoff & Context

> Read this first in a new session. It explains the standalone **`BUILDER/`** bundle: the
> admin console where a government service is **built** — its citizen **form** and its
> back-stage **process/pipeline** — with a **live preview of the citizen's screen**. Built
> June 2026, Tajik-first, in the existing eKhizmat design language, fully self-contained
> (own copy of the design system, icons, JS engine, fonts, and tg→ru dictionary). It does
> not touch the live app or the `blueprints/` set.

---

## 1. What this is & why

The user asked for "a new folder, just like the operator folder," holding the design
guidelines, with **page(s) for an admin to create forms for new services** — "a dropdown or
some way (the best way) to create processes and forms / pipelines for new services, or even
change the current ones."

So this bundle is the **service constructor (Конструктор)**: the no-code workshop where an
administrator builds a service end-to-end. It supersedes the tiny "Конструктори шакл" stub
that lived inside `blueprints/admin-services.html` and turns it into a real composer.

Two things are built per service, and the UI keeps them in one mental model:

- **Form** — what the citizen fills (the fields, per step). Front-stage.
- **Process / pipeline** — how the request is checked, routed, reviewed, and fulfilled.
  Back-stage.

The chosen "best way" is the industry-standard **three-pane builder** (think Stripe / Typeform /
Webflow), adapted to eKhizmat's principles:

```
┌──────────────┬───────────────────────────┬──────────────────────┐
│ ① PIPELINE   │ ② EDITOR                  │ ③ LIVE PREVIEW       │
│ the process  │ the selected stage        │ the citizen's screen │
│ (7 stages,   │ · fields step = composer  │ (apply.html-style),  │
│ front + back)│   with a type PALETTE     │ re-rendered live as  │
│ click a      │ · other stages = config   │ you add/edit fields  │
│ stage →      │   (toggles, selects)      │                      │
└──────────────┴───────────────────────────┴──────────────────────┘
```

**Why three panes:** "create processes **and** forms" → the pipeline column is the process,
the editor column is the form, and the preview column proves the result. Adding a field shows
up in the citizen preview immediately, which is the whole point — the admin sees what they ship.

## 2. File map

```
BUILDER/
  index.html          Gallery launcher (what the constructor is + the 5-step "how it works")
  services.html       REGISTRY — all services (active/draft), KPIs, search, status filter,
                      form-template library. Rows → builder.html; "+ Хизмати нав" → new-service
  new-service.html    CREATE wizard (.wz, 4 steps): method (blank/template/duplicate) → base
                      template → basics (name tg/ru, ведомство, category tile, applicant, price)
                      → review → "Кушодани конструктор" (→ builder.html)
  builder.html        THE BUILDER — 3-pane composer + inline state machine (see §4–§6)
  css/
    tokens|base|components|screens|blueprint.css   copied design system (shared base)
    builder.css       NEW scoped styles: the 3-pane shell, pipeline .stg, field list .fb-item,
                      .palette, the .pv-frame live preview, registry chrome, responsive folds
  js/
    sprite.js         icon sprite (copied verbatim — 69 Hugeicons)
    builder.js        engine, forked from the operator bundle: theme, page-nav, language
                      switcher + tg↔ru engine, toast, overlays/drawers (focus-trap), pressed
                      groups, TABS (= the pipeline-stage switch), wizard flow, upload, faux-QR,
                      and the [data-bld-rail] console-rail builder. Generic; no page state here.
    builder-i18n.js   the full blueprint tg→ru dictionary (copied) + an Object.assign block of
                      ~150 builder-specific RU keys appended at the end. 1281 ru keys total.
  assets/
    logo.svg, fonts/ALSHaussNextVF.ttf
  qa/builder.mjs      Playwright: screenshots every screen × {light,dark} × {desktop,mobile}
                      + drives the builder (palette → add → live edit → stage → paid → publish)
  docs/HANDOFF.md     this file
  README.md           quick start
```

Each page links `tokens → base → components → screens → blueprint → builder` CSS (builder
6th, last), loads `js/sprite.js` right after `<body>`, and `js/builder-i18n.js` +
`js/builder.js` at the end. All paths are **root-relative within the bundle** (`css/…`,
`js/…`, `assets/…`) — nothing escapes `BUILDER/`.

## 3. How to view & QA

```bash
cd BUILDER
python3 -m http.server 8803 --directory .          # fresh port (avoid the 8741/8752 squatters)
# open http://localhost:8803/index.html

node qa/builder.mjs qa/shots http://localhost:8803/  # 16 static + 8 driven shots, error report
```

Verified clean: 4 screens × light/dark × desktop/mobile render with **no JS errors**; the
driven flow (open palette → add a Date field → edit its label live → switch to the Delivery
stage → mark it paid → open routing → publish) runs end-to-end; Russian applies across the
chrome. Gotchas inherited from the repo: park the mouse at 0,0 before shots; the QA script
adds `body.shot` to hide the `.bp-bar` dev toolbar.

Every page keeps the thin **dev toolbar** (`.bp-bar`): a screen-switcher `<select>` and a
theme toggle. Hidden by `body.shot` in exports.

## 4. The builder layout (builder.html)

Unlike the registry/wizard (which use the admin shell `.adm` + the `[data-bld-rail]` console
rail), **builder.html is a focused, chromeless editor** — the way `apply.html` is a focused
citizen flow. A slim sticky `.bld-top` carries identity + actions; the rest is the canvas.

- **`.bld-top`** — back ‹ Реестр · service-name `<input>` (live) · status pill · `Захира`
  (save draft) · `Нашр` (publish, opens confirm) · language dd (auto-injected) · theme.
- **`.bld-work`** — `grid-template-columns: 288px · 1fr · 400px` = pipeline · editor · preview.
- The pipeline (`.bld-pipe`) is a **`[data-tabs]` group**; each `.stg` is a `role="tab"`
  `[data-tab]`; the editor panels and preview panels are `[data-panel]` in the same
  `data-tabs-scope=".bld-work"`. So **one tab click swaps both** the editor and the preview —
  handled entirely by `builder.js`'s generic tabs handler, no custom code.

**Responsive:** ≤1180px the preview folds to a toggle drawer (`.bld-prev-toggle` in the top
bar reveals it); ≤760px the pipeline collapses to a horizontal scroll of stage chips and the
editor stacks full-width.

## 5. The pipeline (process) — 7 stages

Two groups, mirroring the citizen-journey map's front-stage / back-stage split:

**Чашми шаҳрванд (front-stage, the form):**
1. **Тасдиқи маълумот** — once-only: which registry facts to pre-fill & confirm (toggles).
2. **Майдонҳои нав** — *the form composer* (the star; see §6). Default-selected stage.
3. **Расондан ва пардohт** — delivery (digital/paper), document languages, free/paid + amount.
4. **Санҷиш ва имзо** — review & e-sign (auto for every service; only the consent text is edited).

**Дар дохили идора (back-stage, the process):**
5. **Санҷиши худкор** — automated checks (population registry, debt, duplicate, document validity).
6. **Баррасӣ ва масъул** — routing: ведомство, reviewer role, SLA target, sequential/parallel, escalation.
7. **Додани ҳуҷҷат** — issue: document template, e-seal + QR, wallet delivery, paper copy.

For the **back-stage** stages, the preview column shows **what the citizen sees about that
stage** — the transparent tracking view (status rows, the "1 day 4 hours · 3 ahead" ETA, the
wallet card). This is deliberate: radical transparency means the citizen sees the pipeline, so
configuring the back-stage previews the citizen impact.

`+ Илова кардани қадам` is a demo affordance (toast) — the 7 stages are the modelled set.

## 6. The form composer (the "Майдонҳои нав" stage)

This is the interactive heart, a small state machine **inline in builder.html** (the same
pattern the operator session used — generic behaviour in the engine, page-specific state in
the page). A single `fields[]` array is the source of truth; **both** the editor list and the
citizen preview render from it, so every change updates the preview instantly.

- **Add** — `+ Илова кардани майдон` opens the **palette** (`#paletteModal`): a grid of field
  types in two groups. Picking a type appends a field (with sensible defaults), opens its
  inline config, focuses the label, and toasts. This is the "dropdown / best way to add" the
  user asked for, done as a visual type-picker rather than a bare `<select>`.
- **Edit** — each `.fb-item` has an inline collapsible config (`⚙`): label (live), help text,
  required toggle, and — for select/segment — an options textarea (one per line). Editing the
  **label** updates the row title and the preview on every keystroke *without* re-rendering the
  list (so focus is never lost); reorder/delete re-render fully.
- **Reorder / delete** — `▲ ▼` move, `🗑` delete (with empty-state when none remain).

**Field-type catalogue** (`FTYPES` in builder.html; each renders a real citizen primitive in
the preview):

| type | citizen render | notes |
|------|----------------|-------|
| `text` | `.input` | one line |
| `textarea` | `textarea.input` | multi-line |
| `select` | `.select > select` | options editable |
| `segment` | `.seg` segmented radios | 2–4 options |
| `date` | `.opt` date trigger | calendar/slot |
| `file` | `.dropzone` | PDF/JPG ≤10 МБ |
| `address` | `.chip` + `.src-tag` | registry-backed |
| `source` | `.chip` + green `.src-tag` | **once-only** pre-filled fact; editable source label |
| `consent` | `.consent` checkbox | confirmation flag |

`source` is the signature eKhizmat type — it carries the green "аз …" provenance tag, the
visible mark of the "once only" principle.

The fields-stage count badge, the publish modal's field count, and the preview all derive from
`fields.length` — change one thing, everything reflects it.

## 7. Relationship to the rest of the repo

- This bundle is **standalone** like `OPERATOR/`. It ships its own copy of the design system,
  so editing `BUILDER/css/*` does **not** propagate to the live app or `blueprints/`, and vice
  versa. To restyle the constructor, edit the copies under `BUILDER/`.
- Conceptually it is the **authoring side of `blueprints/apply.html`**: the builder composes a
  service config (steps + fields + paid/free + routing), and `apply.html` is what that config
  renders for the citizen. The preview pane is a faithful mini of `apply.html`.
- The engine is a fork of `OPERATOR/js/operator.js` with the operator rail swapped for the
  `[data-bld-rail]` console rail (Хизматрасониҳо · Хизмати нав · Қолабҳои шакл) and the page-nav
  retargeted to the four constructor screens. Everything else (theme, dd, i18n engine, toast,
  overlays, pressed groups, tabs, flow, upload, QR) is identical and battle-tested.

## 8. Design language (binding — do not drift)

Reuses the binding eKhizmat rules verbatim (see the root `design-principles.md` and memory
`ekhizmat-design-language`):

- White panels + **hairline dividers**, never bordered floating cards, never border-color hovers.
  (The `.pv-frame` device chrome and the `.fb-item`/`.ptile` cards are deliberate, hairline-bordered
  *editor surfaces*, not citizen content cards — the citizen preview inside stays panels+hairlines.)
- **Pills** for actions (`#0088FF` / white); **soft-rect** hovers for rows and stages.
- **Hue tiles** (`.t-blue … .t-olive` + `.sh-c/.sh-r/.sh-l`) carry the field-type and category identity.
- **No shadows** except `--veil` on floating layers (modals, the preview frame).
- The green `.src-tag` is the "once only" signature; the girih star (`#i-star8`) is identity-only.
- Dark theme via `html[data-theme]`; 44px targets under `pointer:coarse`; visible focus rings.
- Tajik-first; **Russian fully wired** (runtime tg→ru, persisted in `localStorage["ekh-lang"]`);
  English deferred (switcher shows it disabled).

New scoped classes added in `builder.css` (all token-based): `.bld-top/.bld-work/.bld-pipe/
.bld-edit/.bld-prev`, `.stg` + `.pipe-label/.pipe-add`, `.fb-list/.fb-item/.fb-head/.fb-ic/
.ftype/.fb-acts/.fb-body/.fb-empty`, `.palette/.ptile`, `.pv-frame/.pv-head/.pv-prog/.pv-body/
.pv-foot/.pv-tag`, and the registry `.svc-row/.reg-stats/.start-grid/.tpl-grid`.

## 8А. Admin cabinet — full ТЗ §7В coverage (added July 2026)

The builder's pipeline rail gained a second group, **«Кабинети хизмат»**, that maps the
back-office constructors from ТЗ §7В.1–3 and §6А.3. Clicking one of these tabs flips
`.bld-work[data-mode]` from `journey` (3-pane, live citizen preview) to `admin`
(pipeline + full-width tool, preview hidden) — a tiny JS hook on the tab-click; the generic
`[data-tabs]` handler still swaps the `[data-panel]` editor pane.

| Tab (`data-tab`) | ТЗ ref | What it is |
| --- | --- | --- |
| `rules` | §7В.1 Конструктор правил | **DMN decision table** — editable input(blue)/output(green) columns, add/delete rules, first-hit policy, pre-publish validation note. |
| `templates` | §7В.1 Шаблоны / §6А.3 | **Notification + document templates** — Push/Email/SMS channel switch, тг/ру/en `.ml-tabs` (with «заминавӣ» fallback marks), `{{variable}}` chips that insert at the cursor, a live substitution preview, and a Gotenberg PDF document template. |
| `sandbox` | §7В.3 / §6.2 Песочница | **Reference-scenario test run** — pick UC-A/B/C, «Оғози санҷиш» animates the 6–7 pipeline steps with pass ticks + timings and a verdict. Sets `sbxPassed`. |
| `versions` | §7В.1 Управление услугами/выкаткой | **Lifecycle flow** (сиёҳнавис→дар созиш→нашршуда→аз кор), **version-history `.tbl`** with rollback, and **canary rollout** (feature-flag segment + % range + quick rollback). |
| `access` | §7В.2 Разграничение прав | **Roles×capabilities `.matrix`** (Муаллиф/Мувофиқакунанда/Нашркунанда/Маъмур), segregation-of-duties + access-scope + WORM notes. |

Two cross-cutting additions:

- **Enriched form composer** (§6А.3): each field now carries multilingual label tabs (тг/ру/en),
  a validation **format** select (матн/рақам/ИНН/телефон/сана/email), **conditional show-if**
  logic (renders a «↳ шартӣ» note in the citizen preview), and real **drag-to-reorder** via a
  grip (`.fb-grip`, CSS dot-grid) — ▲▼ stays as the keyboard-accessible fallback.
- **Publish readiness gate** (§7В.3): the «Нашр» modal is now a live **checklist** computed from
  actual builder state (fields, DMN, templates, sandbox-passed, approval). The publish button
  is disabled until all required checks pass. «Ба созиш» in the top bar drives the approval
  step (segregation of duties: an author cannot publish un-approved changes).

All of it is token-based (house rules intact), fully RU-wired (source-keyed `BP_DICT.ru`),
responsive (wide tables/matrix scroll inside `.dmn-scroll`; `.tool-bar` stacks ≤560px), and
theme-aware. New scoped classes live in the `ADMIN CABINET SECTIONS` block of `builder.css`.

## 9. Open TODOs

- [x] ~~Real drag-and-drop reorder~~ — done (grip-initiated HTML5 DnD; `▲ ▼` kept as fallback).
- [ ] Persist the composed config (export the `fields[]` + pipeline settings as the `SERVICES`
      map shape `apply.html` consumes — that literally closes the loop to a working service).
- [ ] Populate `BP_DICT.en` to enable English (same source-keyed approach).
- [ ] Wire `new-service.html`'s template choice to seed the builder's `fields[]` for that template.
- [ ] Push the four screens into Figma via the Figma MCP for the design handoff.
