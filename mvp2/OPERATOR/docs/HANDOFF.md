# eKhizmat — Operator (service-window) console · Standalone bundle

A self-contained copy of the **operator / agent "тиреза" (service-window)** workflow,
extracted from the main eKhizmat blueprint repo so it can be opened, reviewed, ported to
Figma, or shipped on its own. Everything it needs — the design system, icons, JS engine,
fonts, and the full tg→ru dictionary — lives inside this folder. No file here reaches
outside `OPERATOR/`.

> This is the **operator/agent** role: someone who sits at a counter and serves citizens who
> walk in (the ЦОН / one-stop-shop role). It is distinct from the **admin** panel, which is
> async back-office review. The operator works a **live queue, face to face**, and is
> empowered to do the whole thing — verify → review → approve & e-sign → hand over the document.

---

## 1. What's inside

```
OPERATOR/
├── index.html            Operator gallery / landing — links the three screens
├── op-login.html         Operator sign-in + office/window (Тиреза) selection
├── op-queue.html         Live service-window queue: call-next, "now serving", day KPIs, walk-in lookup
├── op-verify.html        THE session — 4-step .wz wizard (verify → review/fill → e-sign → handover)
│                         + 5 modals (OTP, approve, request-info, reject, identity-mismatch) + inline session script
├── css/
│   ├── tokens.css        Design tokens — spacing, radii, type scale, color (light + dark)
│   ├── base.css          Reset + element defaults + fonts
│   ├── components.css    Shared primitives (buttons, fields, switch, check/radio, dropzone…)
│   ├── screens.css       Screen/layout styles (incl. the .adm shell the operator screens use)
│   ├── blueprint.css     Blueprint chrome (.bp-bar, gallery .gx-*, .dd language switcher, rails…)
│   └── operator.css      Operator-only components: .op-tag (amber attribution), .tkt, .op-now,
│                         .q-list/.q-item, .idc identity card, .scanbox, .vrow checks, .consent, .win-chip
├── js/
│   ├── sprite.js         Injects the inline icon sprite (Hugeicons) at <body> top
│   ├── operator.js       The interaction engine (extracted from the shared blueprint.js):
│   │                     theme toggle, page-nav, language switcher + tg↔ru engine, toast,
│   │                     modals (focus-trap), pressed groups, tabs, the wizard, faux-QR,
│   │                     and the [data-op-rail] builder. No admin/citizen code.
│   └── operator-i18n.js  Complete source-keyed tg→ru dictionary (window.BP_DICT). The full dict
│                         travels with the bundle because the operator modals reuse some shared
│                         strings (the reject / request-info modals mirror admin-review).
├── assets/
│   ├── logo.svg          Favicon / brand mark
│   ├── hero.webp         (carried with the design system; not used by operator screens)
│   ├── hero-dark.webp    (carried with the design system; not used by operator screens)
│   └── fonts/ALSHaussNextVF.ttf   Variable brand font (referenced by tokens.css)
├── qa/
│   └── operator.mjs      Playwright screenshot + driven-session harness
└── docs/
    └── HANDOFF.md        This file
```

Every page links `tokens → base → components → screens → blueprint → operator` CSS, loads
`js/sprite.js` right after `<body>` opens, and `js/operator-i18n.js` + `js/operator.js` at the end.

---

## 2. How to view & QA

```bash
# from inside the OPERATOR/ folder — serve the bundle root
python3 -m http.server 8802 --directory .
# open http://localhost:8802/index.html   (the operator gallery)

# screenshots (all three screens × light/dark × desktop+mobile) + a driven session walk-through:
node qa/operator.mjs                 # → qa/shots/ , reports JS errors
node qa/operator.mjs qa/shots http://localhost:8802/
```

The harness adds `body.shot` to hide the `.bp-bar` dev toolbar in exports, drives op-verify
end-to-end (scan → 3 checks → consent → e-sign → handover), and prints `no JS errors` when clean.

**Language:** Tajik is the default and source-of-truth; **Russian is fully wired** (real,
persisted switching via the globe switcher). English is deferred (the switcher shows it
disabled with a "soon" tag — add a `BP_DICT.en` map to enable).

---

## 3. The flow (op-verify — the core deliverable)

One page, a 4-step `.wz` wizard (`data-flow`):

- **1 · Identity** — a `.scanbox` scan reveals the registry record (`.idc`: photo + name/DOB/
  ID, green `.src-tag`), then **3 checks** (`.vrow` in a `.led`): doc↔registry (auto on scan),
  face match (operator confirms), SMS code (opens the `.otp` modal). All three → an `.idok`
  green banner and the "continue" button enables. A **mismatch** path opens a modal that halts
  the session without touching any data.
- **2 · Review + assisted-fill** — once-only registry data is read-only (green `.src-tag`).
  Below it a **consent gate** (`.consent` + `.sw` switch): the assisted-fill block
  (`#assistBlock[aria-disabled]`) is locked until the operator records the citizen's consent.
  Once unlocked, every field the operator fills shows the **amber `.op-tag`**
  ("пуркардаи оператор · бо иҷозати шаҳрванд").
- **3 · Approve & e-sign** — a `.review` summary (operator-entered fields flagged with `✎`
  `.op-mini`), a note explaining the provenance propagates to the citizen's profile, and the
  decision actions (approve / request-info / reject modals).
- **4 · Issue/handover** — `.success`: document created with QR + e-sign, pushed to the
  citizen's wallet, printed + receipt, **and the operator-entered fields logged as such**.
  "Finish & next" returns to the queue.

---

## 4. Provenance / attribution model (the key idea)

Three data origins are visually distinct and never confusable:

- green **`.src-tag`** = the state already knew it (once-only, registry-sourced, read-only);
- amber **`.op-tag`** = an **operator typed it on the citizen's behalf, with consent** — the
  model is that the citizen's own profile shows these fields marked "пуркардаи оператор";
- (unmarked) = the citizen entered it themselves in the portal.

`.op-tag` lives in `css/operator.css` and deliberately mirrors `.src-tag`'s shape so the two
read as one family of provenance labels. The consent switch gates visibility of the tags AND
the fields (`.assist[aria-disabled="true"]` greys the block + hides its `.op-tag`s).

---

## 5. Wiring

Operator pages use the `.adm` shell with the **`[data-op-rail]`** builder in `operator.js`
(`OP_NAV`; foot shows operator + window + sign-out → op-login). The page-nav dropdown (`PAGES`
in operator.js) lists the gallery + the three operator screens. `op-verify.html` has a small
**inline script** for the session-only bits (check toggles, consent gate, advancing the wizard
on e-sign); everything else is declarative (`data-open` / `data-flow` / `data-step` / `data-toast`).

---

## 6. Design language (binding — do not drift)

- White panels + hairline dividers — **never** bordered floating cards or border-color hovers.
- `#0088FF` pill primaries; gray **rectangular** row hovers.
- Hue + shape icon tiles; **no shadows** except the soft veil on floating layers.
- Flat gray inputs; `--ink-faint` is for **decorative glyphs only**, never text.
- AA contrast is binding.

---

*Extracted from the eKhizmat blueprint repo on 2026-06-22. Self-contained as of extraction;
if the shared design system changes upstream, re-sync the `css/`, `js/sprite.js`, and
`js/operator-i18n.js` copies.*
