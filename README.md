# eKhizmat unified platform prototype

This repository presents the four eKhizmat experiences as one project:

- `/citizen/` — Citizen Portal
- `/mobile/` — interactive Citizen mobile-app concept (web prototype)
- `/tson/` — ЦОН Operator workstation
- `/ministry/` — Ministry Specialist workspace
- `/admin/` — Service Administrator

The root route, `/`, is the launcher. All four applications share one design system, one font, one icon sprite, common theme/language preferences, and the same platform switcher.

The July 2026 demo expansion adds:

- a signed-out Guest catalogue and one complete guest appointment flow;
- a 16-item Citizen cabinet grouped into six application categories;
- a children-only Family area, default-on 2FA, and camera-free biometric animation;
- operator, centre-supervisor, and network-leadership ЦОН perspectives;
- a staged Low Code workflow from agency author through review to portal-admin publication;
- Guest audience labels in Admin, Ministry, and ЦОН fixtures.

## Run it

You need Node.js 20 or newer. From this folder, run:

```bash
npm install
npm run dev
```

Open the address printed in the terminal (normally `http://localhost:5173`). One command serves the launcher and every application.

To verify the production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

The repository is configured for Vercel and does not require environment variables.

1. In Vercel, choose **Add New → Project** and import `osimij/ekhizmat-overview`.
2. Keep the detected settings. `vercel.json` selects Vite, runs `npm ci` and `npm run build`, and publishes `dist`.
3. Select **Deploy**.

Before deploying, you can verify the exact production output locally:

```bash
npm run check:vercel
```

This checks every public platform route, all Admin subpages, the style guide, and the stable shared icon asset expected by the deployed applications.

## Presentation and developer modes

Use this deterministic presentation link:

```text
http://localhost:5173/?present=1&theme=light&lang=tg
```

Query parameters do not overwrite saved preferences:

- `?present=1` hides prototype and developer controls.
- `?dev=1` shows reset controls and developer materials.
- `?theme=light` or `?theme=dark` selects a theme for that link.
- `?lang=tg` or `?lang=ru` selects a language for that link.

Keyboard shortcuts work outside form fields: `0` opens the launcher, and `1`–`4` open Citizen, ЦОН, Ministry, and Admin.

In developer mode, “Reset platform” restores only the current application. “Reset all” restores every demo workflow while keeping the user’s theme and language preference. The persisted Low Code fixture uses `ekh.demo.lowcode`; Citizen cabinet edits and operational records stay in page memory. Personal citizen data is never stored in browser storage, cookies, or the URL.

## Demo-only boundaries

This project is an interactive product reference, not a live government system. Guest submissions are not sent, the displayed application number is fictional, biometric scanning never opens a camera, dashboard figures are fixed fixtures, roles are interface simulations rather than real permissions, and “Stage”/“Publish” do not deploy anything. No backend, database, SMS, email, identity service, or production authorization is connected.

Useful direct demo routes include:

- `/citizen/` — Guest flow and Citizen cabinet;
- `/tson/` — operator login, then role switching to both dashboards;
- `/admin/services.html` — service registry and audience filter;
- `/admin/builder.html` — agency-author Stage editor;
- `/admin/review.html` — review queue, comments, approval, and portal-admin publication;
- `/design-system/styleguide.html` — shared audience, category-count, Face Scan, metric, review, comment, and empty/error patterns.

For the guided walkthrough, see [docs/demo-script.md](docs/demo-script.md).

## Quality checks

```bash
npm test
npm run test:visual
npm run test:a11y
npm run test:contrast
npm run lint:design-system
```

The main test command covers route health, important workflows, privacy, presentation mode, and supported viewport sizes. Visual snapshots and accessibility scans are separate so they can be reviewed independently.

Playwright normally uses its installed Chromium. This project can also use the local Chrome installation when the matching Playwright browser is unavailable. If neither exists, run `npx playwright install chromium` once.

## Where things live

- `design-system/` — the only shared tokens, components, runtime helpers, font, logo, and icons.
- `apps/` — application-specific composition, behavior, data fixtures, translations, and artwork.
- `citizen/`, `tson/`, `ministry/`, `admin/` — the clean public HTML entry points.
- `qa/` — functional, privacy, responsive, visual, presentation, accessibility, contrast, and design-drift checks.
- `docs/` — migration decisions, component inventory, demo guide, and QA evidence.
- `legacy/` — archived pre-unification sources; not built or served.

The untouched starting point is recoverable from Git tag `pre-unified-2026-07-27`. The original nested `mvp2` history is also preserved in `.history/` (intentionally ignored by Git because it is a local recovery bundle).

## Troubleshooting

- If a page looks stale, stop the server, delete only `dist/`, and run `npm run dev` again.
- If port 5173 is busy, Vite prints another local address; use that address.
- ЦОН intentionally needs at least 1280 pixels of width and explains this below that size.
- The Admin builder is desktop-oriented. It remains usable from 768 pixels, but 1280 pixels or wider is best for a live demo.
- A build warning notes the Citizen service catalogue's large raw JavaScript chunk. Its compressed size remains modest for this prototype; production data should move behind an API or lazy loading.

Please read [design-system/README.md](design-system/README.md) before changing shared visuals.
