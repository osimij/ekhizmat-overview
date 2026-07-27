# BUILDER — eKhizmat service constructor (standalone)

The **admin's no-code workshop** for eKhizmat services, self-contained. An administrator
builds a new government service here — its **form** (what the citizen fills) and its
**process / pipeline** (how it is reviewed and fulfilled) — with a **live preview of the
citizen's screen** updating as they work. Open it, review it, port it to Figma, or ship it
on its own: every dependency (design system, icons, JS engine, fonts, full tg→ru dictionary)
lives inside this folder. Nothing here links outside `BUILDER/`.

## Quick start

```bash
# from inside this folder:
python3 -m http.server 8803 --directory .
# then open:
#   http://localhost:8803/index.html        ← constructor gallery (start here)
#   http://localhost:8803/services.html      ← registry: all services, search, status
#   http://localhost:8803/new-service.html   ← create: blank / template / duplicate + basics
#   http://localhost:8803/builder.html       ← THE builder: pipeline · fields · live preview
```

Toggle **theme** (sun/moon, top-right) and **language** (globe — Тоҷикӣ / Русский; English
is deferred). Both persist across pages.

## The four screens

| Screen | What it is |
| --- | --- |
| `index.html` | Gallery: what the constructor is, and how one template builds every service. |
| `services.html` | The registry — every service (active + draft), KPIs, search/filter, and a reusable form-template library. Entry point to **edit** an existing service or **create** a new one. |
| `new-service.html` | A 4-step starter: pick a start method (blank / template / duplicate), then the basics (name tg+ru, owning ведомство, category tile, applicant type, price) → opens the builder. |
| `builder.html` | **The builder.** Three panes: **① pipeline** (the 7-stage process, front-stage citizen steps + back-stage office steps) · **② editor** (the field composer with a type **palette**, plus per-stage config) · **③ live preview** (the citizen's `apply.html` screen, re-rendering as you add/edit fields). Add a field → it appears in the preview instantly. |

The headline idea: the builder **composes the same config that drives the citizen
`apply.html`** in the main app — so what the admin builds here is literally what the citizen
fills. The loop is closed and made visible.

## QA (optional)

Needs [Playwright](https://playwright.dev): `npm i -D playwright && npx playwright install chromium`.

```bash
node qa/builder.mjs            # screenshots all screens × light/dark × desktop/mobile
                              # + drives the builder: palette → add field → live edit →
                              #   stage switch → paid toggle → publish
```

## Full context

See [`docs/HANDOFF.md`](docs/HANDOFF.md) for the file map, the form/pipeline model, the
field-type catalogue, the live-preview wiring, and the binding design-language rules.
