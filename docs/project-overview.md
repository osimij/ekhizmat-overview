# eKhizmat project overview

## What this project is

eKhizmat is a unified digital public-services platform concept for citizens, businesses, service centres, government ministries, and service administrators. The idea is similar to a national public-services gateway: people can discover services, submit requests, book visits, follow application progress, pay fees, and receive digital results in one recognizable environment.

This repository is an interactive product prototype and demonstration environment. It brings several related workspaces together so they can be opened, shown, and tested from one project. It is not a live government service and does not connect to real citizen records, government registries, payments, identity providers, SMS, email, or production permissions.

## The main experiences

The root page (`/`) is a launcher for four primary platform experiences:

| Route | Main user | What it demonstrates |
| --- | --- | --- |
| `/citizen/` | Citizen or business user | Finding services, using guest mode, signing in, managing applications, payments, documents, family members, profile settings, and account security |
| `/tson/` | ЦОН service-centre operator | Signing in, binding to a service centre, identifying a visitor, requesting consent, using registry data, completing a service session, and safely ending or locking the visit |
| `/ministry/` | Ministry or agency specialist | Working an application queue, sorting by urgency and SLA, opening application details, checking inter-agency requests, reviewing reports, and managing service forms |
| `/admin/` | Service administrator or service owner | Viewing service metrics, managing the service registry, creating services, composing forms, previewing the citizen experience, and handling review and publication |

The launcher carries the selected language and theme into the destination platform. Keyboard shortcuts are also provided for the demo: `0` returns to the launcher and `1`–`4` open the four main platforms.

## What a user can do in each area

### Citizen Portal

The Citizen Portal has both signed-out and signed-in states.

In guest mode, a visitor can browse a smaller catalogue of services that do not require personal data. The complete guest example is an appointment flow: choose a centre and date, enter an email address, accept the demo consent text, and receive a fictional confirmation number.

After signing in, the citizen experience includes:

- a service catalogue with search, categories, and life-situation entry points;
- a cabinet with applications grouped into categories and filterable by status or agency;
- application details with a transparent processing timeline and next-action states;
- payment records, pending-payment actions, and a demo electronic receipt;
- a digital wallet for documents and certificates, including QR-style previews;
- a Family area that accepts only children under 18 in the demo;
- profile, notification, language, and theme controls;
- security settings with default-on 2FA and a simulated face-scan setup;
- an emergency flow for reporting lost documents and revoking them in the prototype.

### ЦОН Operator

ЦОН is the Russian abbreviation for a public service centre. This workspace is designed as an operator workstation rather than a citizen-facing portal.

The operator flow includes credentials and six-digit MFA, workstation or centre binding, an idle shift screen, citizen identification, registration of a new citizen, consent for accessing existing registry data, and a guided service session. The session can show a catalogue, citizen data, an application form, document capture, and a result screen.

The prototype also includes three demo perspectives:

- **Operator** — handles an individual service visit.
- **Centre Supervisor** — sees centre-level queue, visit, waiting-time, and service-window metrics.
- **Leadership** — sees network-level centre comparisons, trends, filters, and alerts.

The workstation includes session timing, lock and unlock behavior, consent revocation, and explicit cleanup of citizen data when a visit ends. It intentionally asks for at least 1280 pixels of width because it represents a dense desktop workstation.

### Ministry Specialist

The Ministry workspace is an internal case-management console. A specialist signs in with credentials and MFA, then works from several related views:

- assigned queue, all applications, and overdue work;
- application filtering by service, status, SLA, priority, and other supported criteria;
- an application detail view with data, history, actions, and decision dialogs;
- inter-agency data exchange requests and their statuses;
- reports with period filters and downloadable demo actions;
- a forms library and form builder for agency-owned application forms;
- notifications and a profile/preferences area;
- a compact, collapsible navigation rail with responsive mobile behavior.

Ministry application records are generated from fixtures and kept in memory. The queue still behaves like a working console: filters can be reflected in the URL, records can be selected, and actions update the current demo state.

### Service Administrator and Low Code workflow

The Admin area represents the people who create and operate public services rather than consume them. Its pages are:

- `/admin/` — dashboard with business metrics, tasks, SLA information, and activity;
- `/admin/services.html` — service registry with audience and status filters;
- `/admin/new-service.html` — wizard for starting a service from blank, a copy, or a template;
- `/admin/builder.html` — staged service editor with citizen-facing and internal workflow sections;
- `/admin/forms.html` — separate form library with live, draft, archived, and unused versions;
- `/admin/form-builder.html` — form editor with field composition, validation formats, versions, and a citizen preview;
- `/admin/review.html` — review queue, comments, approval, and publication actions.

The main Low Code demonstration moves through a controlled lifecycle:

`Draft → Stage → Review → Changes requested or Approved → Published`

The demo uses role switching to show the separation of responsibilities between an agency author, a reviewer, and a portal administrator. Authors can prepare and resubmit changes, reviewers can comment or approve, and only the portal administrator can publish an approved version.

## Mobile concept

`/mobile/` is a separate interactive mobile-app concept. It is not one of the four primary launcher destinations. It presents a phone-sized experience with Home, Services, Applications, Documents, and Profile tabs, plus a focused three-step passport-renewal flow, application detail, notifications, and a QR document view.

It is useful for demonstrating how the Citizen experience could be adapted to a phone, but it should be understood as a concept surface rather than a separate production platform.

## Technical shape

The project uses a deliberately simple architecture:

- **Vite** serves and builds the application.
- **Static multi-page HTML** provides clean routes and independent entry pages.
- **Vanilla JavaScript** handles rendering, interaction, state, routing, and demo fixtures.
- **CSS** provides platform composition on top of shared design-system foundations.
- There is no React, Vue, server-side application, database, or API layer in this repository.

Each main platform has a public HTML entry point in its own top-level folder. Platform-specific behavior and data live under `apps/`, while shared visual and interaction foundations live under `design-system/`.

The build is configured as a Vite multi-page application in [`vite.config.js`](../vite.config.js). It includes the launcher, four platforms, the Admin subpages, and the design-system style guide as build inputs. A small build plugin copies the shared SVG icon sprite and selected demo documentation to stable paths in `dist/`.

## Shared design system

The `design-system/` directory is the common visual and interaction source of truth. It contains:

- color, typography, spacing, shape, motion, and layout tokens;
- reset, foundation, component, pattern, sidebar, and utility CSS;
- the shared eKhizmat logo, icon sprite, and font asset;
- preference handling for theme and language;
- shared dialogs, menus, focus behavior, toasts, shell helpers, and platform switching;
- [`styleguide.html`](../design-system/styleguide.html), which shows the reusable component states and patterns.

The platforms intentionally have different density levels: Citizen is more comfortable and touch-friendly, Ministry is compact, ЦОН is workstation-oriented, and Admin is optimized for a three-pane editor. They still use the same tokens, interaction rules, icon system, focus treatment, and state vocabulary.

The binding rules for future UI work are in [`docs/design-guide.md`](design-guide.md). In short, shared values should come from tokens, app styles should compose rather than copy foundations, the canonical icon sprite should be used, and important states such as focus, loading, error, disabled, and reduced motion must be represented.

## State, storage, and privacy boundaries

The prototype uses fixed fixtures and browser state to make demos repeatable.

- Theme and language preferences can persist across routes.
- Some non-personal demo settings, such as the Admin rail state, Low Code state, service drafts, and form drafts, use browser storage.
- Ministry application records remain in memory and are regenerated when the page is reloaded.
- ЦОН citizen data exists only during the active visit and is wiped when the visit ends, is revoked, expires, or is otherwise reset.
- Operator sign-in state may survive a normal refresh for the current browser tab, but citizen fields are not stored in that session state.
- Query parameters can select presentation settings and approved filters, but sensitive citizen information is deliberately kept out of URLs.

These rules make the prototype safer to demonstrate, but they do not make it suitable for real personal data or production use.

## Presentation and developer modes

For a clean presentation, use:

```text
http://localhost:5173/?present=1&theme=light&lang=tg
```

Presentation mode hides prototype and developer controls. Developer mode (`?dev=1`) exposes reset and demo-material controls. Resetting the current platform or all platforms returns the fixtures to their starting state without changing the saved theme or language preference.

The guided walkthrough is documented in [`docs/demo-script.md`](demo-script.md). It covers five repeatable scenarios: a guest appointment, the citizen cabinet, family and security settings, ЦОН management dashboards, and the Admin author-review-publication loop.

## What is and is not real

This repository is best treated as a high-fidelity product reference and interaction prototype. The following are simulated:

- authentication, MFA, consent, and roles;
- service and application records;
- queue and dashboard figures;
- payments, receipts, downloads, and QR graphics;
- biometric scanning, which never opens a camera;
- service staging, review, approval, and publication.

The “Publish” action changes the local demo workflow only. It does not deploy a service or make anything available to real citizens.

Older pre-unification sources are retained under [`legacy/`](../legacy/) for reference. They are not included in the active build or launcher. The active project is the unified structure described above.

## Running the project

Use Node.js 22.x, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

Useful checks are:

```bash
npm run build
npm test
npm run test:visual
npm run test:a11y
npm run check:vercel
```

The test suite covers route health, workflows, privacy and storage rules, presentation mode, responsive behavior, accessibility, contrast, visual snapshots, and design-system drift. The project can also be deployed as a static Vite output to Vercel using [`vercel.json`](../vercel.json).

## Where to look next

- [`README.md`](../README.md) — quick start, routes, demo controls, deployment, and troubleshooting.
- [`docs/demo-script.md`](demo-script.md) — the recommended 10–12 minute walkthrough.
- [`docs/decisions.md`](decisions.md) — architecture and privacy decisions.
- [`docs/design-guide.md`](design-guide.md) — canonical UI and interaction contract.
- [`UNIFIED-EKHIZMAT-PLATFORMS-PLAN.md`](../UNIFIED-EKHIZMAT-PLATFORMS-PLAN.md) — implementation, migration, and QA plan.
