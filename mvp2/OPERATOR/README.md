# OPERATOR — eKhizmat service-window console (standalone)

The complete **operator / agent "тиреза"** workflow, self-contained. Open it, review it,
port it to Figma, or ship it on its own — every dependency (design system, icons, JS engine,
fonts, full tg→ru dictionary) lives inside this folder. Nothing here links outside `OPERATOR/`.

## Quick start

```bash
# from inside this folder:
python3 -m http.server 8802 --directory .
# then open:
#   http://localhost:8802/index.html      ← operator gallery (start here)
#   http://localhost:8802/op-login.html   ← shift sign-in + window select
#   http://localhost:8802/op-queue.html   ← live queue, call-next, KPIs, walk-in lookup
#   http://localhost:8802/op-verify.html  ← the 4-step service session
```

Toggle **theme** (sun/moon, top-right) and **language** (globe — Тоҷикӣ / Русский; English
is deferred). Both persist across pages.

## The three screens

| Screen | What it is |
| --- | --- |
| `op-login.html` | Operator sign-in, pick office + window (Тиреза), open the shift. |
| `op-queue.html` | The operator's home: "now serving" / call-next, today's KPIs, the waiting queue (priority / appointment / walk-in), and a passport/phone lookup to start an off-ticket session. |
| `op-verify.html` | **The session** — one page, 4 steps: verify identity (scan → registry record + 3 checks) → review & assisted-fill behind a **consent gate** (operator-filled fields get the amber `.op-tag`) → approve & e-sign → issue/handover. |

## QA (optional)

Needs [Playwright](https://playwright.dev): `npm i -D playwright && npx playwright install chromium`.

```bash
node qa/operator.mjs            # screenshots all screens × light/dark × desktop/mobile + drives the session
```

## Full context

See [`docs/HANDOFF.md`](docs/HANDOFF.md) for the file map, the provenance/attribution model,
the wiring, and the binding design-language rules.
