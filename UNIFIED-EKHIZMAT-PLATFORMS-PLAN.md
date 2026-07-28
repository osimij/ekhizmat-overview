# eKhizmat Unified Platforms — Implementation & QA Plan

Status: team handoff plan  
Prepared: 27 July 2026  
Scope: Citizen Portal, ЦОН Operator, Ministry Specialist, Service Administrator

## 1. Outcome

Build one presentation-ready eKhizmat project that starts with one command and provides one clear launcher for all four platforms:

1. **Citizen Portal** — current `mvp2/index.html`
2. **ЦОН Operator** — current `ЦОН/ekhizmat-arm/index.html`
3. **Ministry Specialist** — current `Orgs/vedomstvo-arm/index.html`
4. **Service Administrator** — current `Admin/index.html`

The four platforms must keep their different jobs and information density, but must feel like one product family. They will consume one source of truth for typography, spacing, colors, icons, controls, dialogs, motion, themes, and accessibility behavior.

The finished project must support this agency-demo flow:

`Launch once → see all 4 platforms → choose a platform → demonstrate its flow → switch to another platform without restarting anything.`

## 2. Scope boundary

This work is a controlled consolidation, not a full product rewrite.

Included:

- One repository and one local start command.
- One launcher matching the supplied “Платформы eKhizmat” reference.
- Clean routes for the four platforms.
- One canonical design-system folder and asset library.
- Migration of every platform to shared foundations and reusable primitives.
- Shared dialog/modal behavior and shared auth primitives.
- Global theme and language preferences.
- Platform-specific layouts built from shared layout rules.
- Automated functional, visual, accessibility, responsive, and presentation-flow tests.
- Removal or archival of obsolete duplicate prototypes after parity is proven.

Not included unless separately approved:

- A backend, real identity provider, real registry integrations, or production data.
- Redesigning the business workflows or changing the meaning of screens.
- Migrating all four apps to React/Vue or another framework. The current static HTML/CSS/JS architecture can meet this goal with much less risk.
- Merging all interfaces into one giant single-page DOM. They should share one project and system, while remaining cleanly separated by routes.

## 3. Current-state findings

### 3.1 Project structure

The current workspace is not one project yet:

- The workspace root has no launcher, root package, or root Git repository.
- `mvp2` contains the only nested `.git` directory.
- Each platform has its own start location and asset assumptions.
- The current ЦОН path contains Cyrillic characters, producing encoded demo URLs.
- `mvp2/OPERATOR` is an older/alternative operator bundle and overlaps with the richer `ЦОН/ekhizmat-arm` application.

The four authoritative destinations for the consolidation should be the four listed in Section 1. Treat `mvp2/OPERATOR` and the blueprint/admin duplicates as reference material until the new four-route build reaches parity; then archive them rather than exposing them in the agency launcher.

### 3.2 There are multiple design systems

There is not one design-system source today:

- `Orgs/design-system-ekhizmat` and `ЦОН/design-system-ekhizmat` are duplicate copies.
- `mvp2/css` is a different core generation.
- most of `Admin/css` is based on the `mvp2` generation, with additional forks.
- `ЦОН/ekhizmat-arm/css` starts from the Orgs/ЦОН generation and then diverges.
- `mvp2/OPERATOR/css` carries another self-contained copy.

The token values are related, but the component APIs are not. For example, the codebase currently has both `.btn-pri` and `.btn--primary`, different input heights, different modal implementations, and different motion values.

### 3.3 Visual and behavioral drift

| Before | After | Why |
| --- | --- | --- |
| Several copied `tokens.css`, `base.css`, and `components.css` files | One versioned core under `/design-system` | A design-system change must propagate everywhere by default |
| Platforms used inconsistent or missing font assets | One shared, preloaded Google Sans asset and one font stack | Prevents typography, wrapping, and vertical-alignment differences |
| Inline icon sprite in Home and Orgs, JS-injected sprite in Admin, external sprite in ЦОН | One shared external icon sprite and one icon component pattern | Removes duplicated geometry and inconsistent delivery |
| Home/Admin use `ekh-theme`; Orgs uses `varm-theme`; ЦОН uses `arm.theme` | One global `ekh.preferences.theme` and `ekh.preferences.lang` | Theme and language should follow the presenter between platforms |
| Orgs uses many standalone bordered KPI cards and a visually heavier table shell | Shared metric strip, panel, and data-table primitives with a compact density option | Keeps back-office density without looking like a separate brand |
| Admin shows striped prototype/developer navigation during normal viewing | Hide development chrome by default; show only with `?dev=1` | Agency presentations must look like the product, not an internal mockup |
| ЦОН uses a separate workstation vocabulary and a very sparse idle canvas | Shared shell/header/control primitives plus purposeful workstation-specific content | Preserve operational focus while improving family resemblance |
| Four separate modal/focus implementations | One shared dialog manager and dialog component | Guarantees the same layering, focus, keyboard, motion, and scroll behavior |
| Home phone sign-in, Orgs MFA, and ЦОН MFA share little implementation | Shared auth card, field, OTP, error, loading, and action primitives; flow layouts remain different | Same task looks the same; genuinely different identity flows remain understandable |
| `#0088FF` with white text is used for primary actions (3.52:1) | Keep `#0088FF` as brand accent; use an AA action fill such as `#0072D6` with white text (4.8:1) | Primary button labels must meet WCAG AA, not rely on appearance alone |
| `transition: all` and differing focus/outline rules remain in shared code | Explicit properties, one focus-visible ring, reduced-motion rules | More predictable motion and keyboard accessibility |
| App-specific hardcoded dimensions and one-off states | Shared size, density, layout, state, and motion tokens | Consistency becomes enforceable rather than subjective |

### 3.4 What is already strong and should be preserved

- Home is the visual baseline: neutral canvas, white panels, one action blue, hue tiles, soft rectangles, restrained shadows, Tajik identity, and clear citizen language.
- ЦОН has the strongest operational behavior and privacy-oriented state handling.
- Orgs has a complete, useful back-office workflow with SLA, batch operations, and application review.
- Admin has a valuable three-pane builder and live citizen preview.
- All four already support light/dark thinking and at least Tajik/Russian concepts.
- All four are static and same-origin friendly, which makes a low-risk one-project consolidation possible.

## 4. Target project architecture

Recommended structure:

```text
eKhizmat/
  index.html                      # four-platform launcher
  package.json                    # one set of commands
  vite.config.js                  # static multi-page dev/build config
  README.md                       # start and demo instructions
  design-system/
    README.md                     # binding rules and contribution process
    tokens/
      color.css
      type.css
      space.css
      shape.css
      motion.css
      layout.css
    css/
      reset.css
      foundations.css
      components.css
      patterns.css
      utilities.css
    js/
      preferences.js              # shared theme/language
      dialog.js                   # modal/drawer layer manager
      toast.js
      menu.js
      focus.js
    assets/
      logo.svg
      icons.svg
      fonts/GoogleSans.woff2
    styleguide.html               # live component states and rules
  apps/
    citizen/
      index.html
      app.css                     # composition only
      js/
      assets/                     # citizen-only artwork
    tson/
      index.html
      app.css                     # workstation composition only
      js/
      i18n/
    ministry/
      index.html
      app.css                     # ministry composition only
      js/
    admin/
      index.html
      app.css                     # builder composition only
      js/
  qa/
    fixtures/
    functional/
    accessibility/
    visual/
    presentation/
  docs/
    migration-map.md
    component-inventory.md
    demo-script.md
    decisions.md
```

Public routes:

- `/` — platform launcher
- `/citizen/` — Citizen Portal
- `/tson/` — ЦОН Operator
- `/ministry/` — Ministry Specialist
- `/admin/` — Service Administrator
- `/design-system/styleguide.html` — internal component showcase; linked only in developer mode

Do not use iframes for the main experience. Clean routes give correct browser history, keyboard behavior, deep links, screenshots, and full-screen presentation. The launcher may use static preview thumbnails, but the actual platform opens as its own page.

## 5. Canonical design-system contract

### 5.1 Source of truth

Use Home’s visual language as the baseline, then add the workstation and back-office needs already proven in ЦОН and Orgs. Do not simply choose one copied folder and discard useful primitives from the other generation.

The binding principles remain:

- Neutral canvas and white/dark panels.
- Hairline separation instead of decorative borders and shadows.
- One action color family.
- Hue tiles provide category identity.
- Shadows only for floating layers.
- Red only for destructive/error/emergency meaning.
- Tajik identity is purposeful, not decorative noise.
- Both themes are first-class.
- Tajik, Russian, and future English strings must survive expansion.

### 5.2 Token model

The team must define and document these token groups before migrating screens:

- **Color:** canvas, panel, raised layer, text levels, hairlines, interactive states, semantic states, brand accent, accessible action fill, category hue pairs.
- **Typography:** one font family; display, H1–H3, body, label, caption, numeric/table styles; line heights and weights.
- **Spacing:** 4px base scale only (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`).
- **Shape:** `10, 14, 18, 24px`, plus full pill; no unapproved radii.
- **Controls:** compact, default, and large heights; touch targets never below 44px on citizen/mobile surfaces.
- **Layout:** consumer content width, workspace width, gutters, header heights, sidebar widths, modal widths, drawer widths.
- **Motion:** fast interaction, layer enter/exit, theme transition, and shared easing curves.
- **Z-index/layers:** content, sticky chrome, popover, drawer, modal, toast, lock screen.

App styles may use tokens and compose layouts. They may not redefine foundation values or introduce raw colors. Add a CI check that rejects raw hex/rgb values outside approved token and document-preview files.

### 5.3 Density is a variant, not a separate design system

The four platforms do not need identical layouts:

- Citizen uses **comfortable** density and supports mobile.
- Ministry uses **compact** density for queues and tables.
- ЦОН uses **workstation** density with a 1280px minimum and fixed operational chrome.
- Admin uses **editor** density for the three-pane builder.

All density modes must use the same type scale, spacing scale, control anatomy, focus ring, icons, colors, and state language.

### 5.4 Shared component inventory

At minimum, the canonical system must ship and showcase:

- Logo/brand lockup and platform label.
- Buttons: primary, secondary, ghost, danger, icon; loading and disabled states.
- Inputs: text, search, phone, password, OTP, textarea, select, checkbox, radio, switch, date, file.
- Validation: help, error, warning, success, source/provenance tag.
- Navigation: header, sidebar item, tabs, segmented control, breadcrumbs, platform switcher.
- Data display: panel, metric, list row, data table, status pill, tag, empty state, skeleton, pagination.
- Feedback: dialog, alert dialog, drawer, popover, tooltip, toast, inline banner.
- Workflow: stepper, progress/timeline, SLA state, document preview.
- Category icon tile and shared icon wrapper.

Every component must be shown in light/dark, comfortable/compact where relevant, default/hover/active/focus/disabled/loading/error states, and Tajik/Russian long-copy examples.

## 6. Dialog, modal, and auth standard

### 6.1 One dialog manager

All four platforms must use the same `dialog.js` behavior. It must provide:

- `role="dialog"` or `role="alertdialog"`, `aria-modal="true"`, labelled title, and optional description.
- Initial focus on the safest meaningful control.
- Focus trapped inside the active layer.
- Focus restored to the trigger on close.
- Escape behavior, backdrop behavior, and explicit close button rules.
- Background made inert while a modal is open.
- Body scroll locked without layout jump.
- Support for one modal above a drawer where the workflow needs it.
- Consistent width variants: default, wide, and full-height drawer.
- Same overlay, radius, spacing, actions, close icon, and responsive behavior.
- Enter in roughly 180–220ms with ease-out; faster exit; transform/opacity only.
- `prefers-reduced-motion` behavior.
- Destructive actions require confirmation or a safe undo path.

### 6.2 Same task, same dialog

Create shared recipes, not just a shared white box:

- Confirm/cancel.
- Destructive confirmation.
- Request more information.
- OTP verification.
- Payment/appointment/location picker.
- Document share/QR.
- Session expiry/extension.
- Success result.

If two platforms perform the same task, they must use the same recipe and wording structure. Platform-specific content is passed as data.

### 6.3 Auth rule

Do not force all auth screens into one identical flow:

- Citizen phone sign-in can remain a focused modal.
- Ministry and ЦОН staff MFA can remain full-page/shift-start cards because the operational context is different.
- Admin auth should use the staff pattern when added.

However, all flows must share field anatomy, password reveal, OTP cells, error placement, loading state, primary action, spacing, type, focus, and recovery behavior.

## 7. Launcher and presentation mode

Build the root launcher to match the supplied reference:

- eKhizmat header with global language and theme controls.
- Title “Платформы eKhizmat” (localized).
- Four large cards in a 2×2 desktop layout and one-column small-screen layout.
- Each card has one consistent icon tile, platform name, one-line purpose, and a clear hover/focus/active state.
- Cards are real links, so Cmd/Ctrl-click and opening in a new tab work.
- Optional static screenshot preview appears on hover/focus only if it remains calm and accessible.
- A materials area links to the design-system showcase and project documentation only in developer mode.

Add a small, consistent **Platforms** menu to each app header. It returns to the launcher and switches directly among the four routes.

Presentation helpers:

- `?present=1` hides all developer/prototype controls.
- `?dev=1` shows screen switchers, reset tools, styleguide links, and debug controls.
- `?lang=ru` and `?theme=light` can create a deterministic agency-demo link without permanently changing the user’s preference.
- Keyboard shortcuts: `0` launcher, `1` Citizen, `2` ЦОН, `3` Ministry, `4` Admin, disabled while typing in a field.
- A documented 8–12 minute demo script with exact starting state and reset steps.

## 8. Storage, privacy, and shared-origin rules

Moving the apps under one origin changes browser-storage behavior and must be handled deliberately.

Use these namespaces:

- `ekh.preferences.*` — global theme/language only.
- `ekh.citizen.*` — citizen demo state.
- `ekh.tson.*` — ЦОН workstation settings only.
- `ekh.ministry.*` — ministry demo settings only.
- `ekh.admin.*` — builder demo settings only.

Rules:

- Never store citizen personal data in `localStorage`, `sessionStorage`, cookies, or the URL.
- Move Orgs’ persisted application records out of `localStorage`; keep demo records in memory and reset them predictably on reload, or persist only anonymous fixture identifiers.
- Keep ЦОН’s storage allow-list and privacy audit. Extend it only for the global preference namespace and explicitly approved non-personal settings.
- Provide “Reset this platform” and “Reset all demo state” actions in developer mode.
- Add tests that scan storage, URL, and DOM after ending/revoking a ЦОН session.

## 9. Implementation phases

### Phase 0 — Freeze, inventory, and decisions (1–2 days)

Tasks:

- Create a new root Git repository or import the `mvp2` history using `git subtree`/documented archive.
- Tag or archive the untouched pre-merge state.
- Record every current entry point, screen, modal, component class, icon, storage key, and automated QA script.
- Confirm the four authoritative apps listed in Section 1.
- Mark `mvp2/OPERATOR`, blueprint admin screens, and copied design-system folders as legacy/reference, not launcher destinations.
- Approve the accessible primary action color and the canonical component naming convention.

Exit gate:

- `docs/migration-map.md` maps every current file to keep, migrate, archive, or remove.
- No source is deleted.
- Design/product/engineering sign the small decision list.

### Phase 1 — Build the canonical design-system core (3–5 days)

Tasks:

- Create `/design-system` and consolidate foundations.
- Load one Google Sans font file from one path and verify Tajik Cyrillic glyphs.
- Consolidate the largest complete icon set into one external sprite.
- Implement shared buttons, fields, selectors, navigation primitives, panels, tables, status states, dialogs, toasts, and empty states.
- Create the live styleguide and component state matrix.
- Add CSS linting and raw-value checks.

Exit gate:

- The styleguide passes both themes, keyboard navigation, contrast, reduced motion, and long Tajik/Russian strings.
- There is one token source, one font asset, and one icon source.
- No app migration starts by copying a new local version of core CSS.

### Phase 2 — Create the unified shell and launcher (2–3 days)

Tasks:

- Add root package, Vite multi-page configuration, and one start/build command.
- Create `/`, `/citizen/`, `/tson/`, `/ministry/`, `/admin/`.
- Build the four-card launcher and shared platform switcher.
- Add global preference handling and presentation/developer modes.
- Set up shared QA configuration.

Exit gate:

- A clean checkout runs with `npm install && npm run dev`.
- All four routes open from the launcher with no 404s, missing assets, or console errors.
- Theme/language selection follows the presenter across routes.

### Phase 3 — Migrate the baseline: Citizen (2–3 days)

Tasks:

- Move Home/Citizen into `/apps/citizen` without changing its business flow.
- Replace local foundation/component CSS with shared imports.
- Replace the inline sprite and duplicate font assets.
- Move phone auth and QR dialogs to the shared dialog manager.
- Correct `transition: all`, focus behavior, modal background inertness, scroll locking, input names/autocomplete, and accessible primary color.
- Preserve the hero artwork and citizen-specific composition in `app.css`.

Exit gate:

- Visual parity is approved, except intentional system fixes.
- All citizen routes/flows work in Tajik and Russian, light and dark, mobile and desktop.
- No citizen foundation tokens are redefined locally.

### Phase 4 — Migrate Ministry Specialist (4–6 days)

Tasks:

- Move Orgs to `/apps/ministry` and point it to the shared core.
- Convert `.btn--*`, fields, pills, dialogs, toasts, tabs, and table parts to canonical primitives.
- Replace border-heavy KPI cards with the canonical metrics/panel pattern.
- Keep compact data density and SLA clarity.
- Move demo application persistence out of shared local storage.
- Replace manual date formatting with locale-aware `Intl.DateTimeFormat`.
- Keep all existing queue, batch, review, decision, document, reporting, and MFA flows.

Exit gate:

- Every existing ministry demo action still works.
- All modal recipes come from the shared layer system.
- Table content remains readable at supported widths and handles long names without overlap.
- Refresh/reset behavior is deterministic.

### Phase 5 — Migrate ЦОН Operator (4–6 days)

Tasks:

- Move the richer `ЦОН/ekhizmat-arm` app to `/apps/tson`.
- Preserve the state machine, session privacy, fixed workstation shell, demo panel, and 1280px minimum behavior.
- Map workstation buttons, fields, panels, steps, dialogs, drawers, toasts, and icons to shared primitives.
- Retain workstation-only layout tokens as documented extensions, not duplicate foundations.
- Unify auth/OTP visual primitives with Ministry while preserving shift binding and re-auth behavior.
- Update the privacy audit for the approved global preference namespace.

Exit gate:

- The documented complete ЦОН scenario passes end-to-end.
- Lock, TTL, consent revoke, storage wipe, progressive scopes, offline/error, and language-switch tests remain green.
- No personal data remains in browser storage or URL after a session ends.

### Phase 6 — Migrate Service Administrator (4–6 days)

Tasks:

- Move Admin to `/apps/admin`.
- Hide prototype toolbar and screen switcher outside developer mode.
- Replace copied foundations, sprite, dialogs, form controls, navigation, and feedback with shared components.
- Keep the three-pane builder as an approved editor layout variant.
- Standardize builder field labels, names, autocomplete behavior, keyboard reorder, drag behavior, focus, validation, and unsaved-change warning.
- Preserve the live Citizen preview while making it consume the same shared tokens/components as the actual Citizen platform.

Exit gate:

- Registry → new service → builder → field edit → preview → validation → publish demo works end-to-end.
- The preview and actual Citizen controls use the same component source.
- Developer chrome is absent from agency presentation screenshots.

### Phase 7 — Cross-platform consistency pass (3–5 days)

Tasks:

- Compare headers, logo sizing, platform labels, language/theme controls, page titles, content gutters, focus rings, control heights, empty/loading/error states, and dialogs side by side.
- Replace same-purpose one-offs with shared recipes.
- Verify all interactive elements have hover, active, focus-visible, disabled, and loading states.
- Review motion at normal speed and slow motion; remove animation from frequently repeated keyboard actions.
- Verify long Tajik strings and Russian translations.
- Remove unused compatibility aliases only after all apps have migrated.

Exit gate:

- Design owner approves the screenshot matrix.
- No unexplained visual differences remain for same-purpose components.
- Platform-specific differences are documented in `docs/decisions.md`.

### Phase 8 — Full QA, cleanup, and handoff (4–6 days)

Tasks:

- Run the full test matrix in Section 10.
- Fix every P0/P1 issue and all design-system drift.
- Archive old duplicate bundles after side-by-side parity proof.
- Remove `.DS_Store`, duplicate fonts/sprites, obsolete CSS copies, unused scripts, and committed generated artifacts.
- Write the final README, demo script, design-system contribution guide, and troubleshooting notes.
- Produce a clean agency-demo build.

Exit gate:

- The Definition of Done in Section 11 is fully evidenced.
- Another team member can clone, run, reset, test, and present the project using only the repository documentation.

## 10. QA and test matrix

### 10.1 Required commands

Recommended root commands:

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:visual
npm run test:a11y
npm run test:contrast
npm run lint:design-system
```

### 10.2 Functional smoke paths

- Launcher: open all four cards, platform switcher, browser back/forward, direct deep links.
- Citizen: search, category, journey, login, language, theme, QR/document modal, profile/wallet, logout.
- Ministry: MFA, queue filters/sort, application detail tabs, Smart Bridge request, return for clarification, decision/four-eyes, batch flow, reporting, reset.
- ЦОН: login/MFA/bind, start visit, identify, consent, catalog, scope, form, documents, result, end, lock/unlock, revoke, TTL, offline, reset.
- Admin: registry, search/filter, new-service wizard, field add/edit/reorder/delete, pipeline tabs, preview, rules/templates/sandbox/versions/access, publish gate.

### 10.3 Viewport coverage

- Launcher: 360×800, 768×1024, 1440×1000, 1920×1080.
- Citizen: 320, 360, 390, 768, 1024, 1440 widths.
- Admin: 768, 1024, 1280, 1440, 1920 widths; document intended minimums.
- Ministry: 1024, 1280, 1440, 1920 widths; test table overflow and dense content.
- ЦОН: 1280×720, 1366×768, 1440×900, 1920×1080, plus the intentional below-1280 “expand window” state.

### 10.4 Visual regression matrix

For every representative screen and important modal:

- light and dark;
- Tajik and Russian;
- default, loading, empty, error, success, destructive confirmation;
- supported desktop/mobile sizes;
- presentation mode with no developer controls.

Use stable fixtures, freeze the clock, disable random IDs in screenshots, park the mouse, and mask genuinely changing values. Store approved baselines in Git LFS or the team’s artifact system, not as uncontrolled duplicate QA folders.

### 10.5 Accessibility gates

- WCAG 2.2 AA color contrast in both themes.
- Keyboard-only completion of each main flow.
- Visible `:focus-visible` ring on every interactive control.
- Icon-only buttons have localized accessible names.
- Form controls have real labels, meaningful names, correct input types/modes, and autocomplete.
- Dialog focus, Escape, restore-focus, inert background, and scroll lock are tested.
- Async validation/toasts use polite live regions; urgent destructive/session states use appropriate alerts.
- Headings remain hierarchical and every page has a skip link.
- 200% zoom and browser text enlargement do not lose content.
- Reduced motion removes spatial motion while preserving useful state feedback.

Use `@axe-core/playwright` in CI, but keep manual keyboard and screen-reader spot checks because automated tools do not prove full accessibility.

### 10.6 Performance and reliability gates

- No missing assets or JavaScript errors on any route.
- Shared font and critical assets preload correctly; no duplicate font downloads.
- No cumulative layout shift from icons/images/fonts on initial screens.
- Citizen first content remains fast on a throttled mobile connection.
- Large ministry tables remain responsive; virtualize only if real lists exceed roughly 50 rows.
- Build works from a directory whose path includes spaces and from a clean checkout.
- All assets use relative/base-safe URLs so preview and deployed subpaths behave identically.

## 11. Definition of Done

The project is finished only when all of the following are true:

- [ ] One root command starts the launcher and all four platforms.
- [ ] The launcher contains exactly four clear platform cards and matches the approved reference direction.
- [ ] Each platform has a clean route and can switch to every other platform without restarting.
- [ ] Only one canonical token, font, icon, component, and dialog source exists.
- [ ] Same-purpose controls and dialogs are visually and behaviorally identical across apps.
- [ ] Legitimate platform differences use documented variants of the same system.
- [ ] Theme and language are consistent across platform navigation.
- [ ] Presentation mode hides prototype and developer chrome.
- [ ] No personal data is stored in local/session storage, cookies, or URLs.
- [ ] All required functional flows pass with no console/page errors.
- [ ] Visual regression passes for both themes, required languages, and supported sizes.
- [ ] Accessibility and contrast gates pass; primary action labels meet AA.
- [ ] Reduced-motion, keyboard, focus, loading, empty, error, success, and destructive states are verified.
- [ ] The build has no duplicated design-system CSS, font files, icon sprites, or obsolete launcher destinations.
- [ ] README and demo script allow a new teammate to run and present the system without verbal help.
- [ ] Design owner, front-end lead, QA, and product owner sign the final evidence report.

“Looks similar” is not completion. The evidence is the shared source structure, passing automated tests, approved screenshot matrix, keyboard/manual checks, and an uninterrupted agency-demo rehearsal.

## 12. Team and realistic schedule

Recommended team:

- 1 design-system/design owner (full during foundations and reviews).
- 2 front-end engineers (one foundations/launcher, one app migrations; then parallel migrations).
- 1 QA engineer from Phase 1 onward.
- Product owner available for terminology, demo scope, and acceptance.

Expected duration:

- **2 front-end engineers + QA + design:** approximately 4–6 weeks.
- **1 front-end engineer:** approximately 8–11 weeks.

Do not run four independent “make it look similar” streams before Phase 1 is approved. After the core and migration recipe are stable, Ministry, ЦОН, and Admin can migrate in parallel with daily screenshot comparison and one design-system owner reviewing shared changes.

## 13. First-week checklist

Day 1:

- Confirm the four authoritative apps and legacy folders.
- Approve the action-blue accessibility decision.
- Approve canonical component naming and route structure.
- Create the root repository and untouched archive tag.

Day 2:

- Complete component/icon/storage/modal inventory.
- Create the migration map and initial screenshot baselines.
- Create root dev/build/test setup.

Days 3–5:

- Build foundations, shared font/icon paths, buttons, fields, panels, dialog manager, preferences, and styleguide.
- Build the first launcher iteration.
- Add contrast, raw-color, accessibility, and screenshot test scaffolding.

End-of-week review:

- Run the styleguide and launcher from a clean checkout.
- Approve the first shared-component visual matrix.
- Select Citizen as the migration proof before parallelizing the remaining apps.
