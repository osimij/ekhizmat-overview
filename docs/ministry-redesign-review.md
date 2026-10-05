# Ministry platform redesign — verification record

Scope: the entire `/ministry` workstation on `codex/design-updates`, including every navigation destination, application tab, seven form-editor steps, overlays, and authentication states. The reference is `docs/design-guide.md` and `admin/services.html`.

Ministry-specific functional, accessibility and screenshot checks pass. Repository-wide acceptance remains **not fully green**: three functional failures and ten older screenshot failures were reproduced on the starting commit `3224d7e` before this expansion. Their reference images have not been overwritten.

## Platform coverage

| Area | Before | After | Guide |
| --- | --- | --- | --- |
| My applications, all applications, overdue | Cut-off numbers, competing columns, detached filters, oversized deadline treatment. | One identity column, aligned full-width rows, equal summary cards, labeled filters, search count, reset/empty states, independent selection and partial-selection indicator. | §3–§7, §9 |
| Application overview | Repeated facts and large deadline ornament pushed actions down. | Compact deadline and date, actions above metadata, independently scrolling side panel, readable provenance and explicit missing values. | §4–§6 |
| Documents and issued results | Inert eye/download controls and a tiny unopenable result. | Document information dialogs identify the source record and verification state; completed results open at readable size. Unavailable original files are stated explicitly. | §6, §7, §9 |
| Interagency information and history | Repeated request icons, perpetual pending spinner, duplicate request action. | Static pending/received states, one request action, direct journal-to-request-tab navigation, aligned history and source details. | §4–§7 |
| Forms catalogue | Decorative category tiles, colored audience pills, no search or complete filter reset. | Flat records, quiet audience metadata, version strips, scoped search, URL-backed status filter, reset and empty state. Read-only forms show their own version, status and bilingual name. | §3–§7 |
| Form editor — confirmation and fields | Settings reset between steps; two `h1` elements; selected field retained a neutral tile. | Saved confirmation settings, one page heading, 24px pane headings, shared 13px field labels, blue selected field icon, stable focus and canonical checkboxes. Empty field lists stay empty after saving. | §3–§6, §9 |
| Form editor — delivery, review, checks and routing | Switches, radios, consent and routing inputs had no state binding. | Settings are retained across steps and saved with the shared draft. Fee, delivery-method and SLA validation return focus to the relevant input. Review submission checks both language names. | §6, §7, §9 |
| Form editor — issuance and previews | Inert template button; every step showed the same phone form. | Editable document title and delivery destination, document artifact preview, step-specific citizen previews and separate agency-processing summaries. Narrow-screen preview traps focus, closes with Escape and restores its trigger. | §3, §5–§9 |
| Reports | Period totals mixed historical fixtures with the current queue; specialist figures did not follow the selected period. | Summary figures reconcile with service rows; specialist data changes with the period; full-width rows, responsive secondary panels, labeled phone figures, working CSV download. | §4–§7 |
| Notifications, preferences and dialogs | Dense notification prose, no visible unread label, toast could cover editor actions; legacy adapter exposed a second unnamed dialog. | Distinct title/body/time, readable unread state, bottom toast placement, one named dialog with inert background and focus return. Shared profile language/theme controls retain their responsive placement. | §3, §6–§9 |
| Sign-in, MFA and workstation lock | Existing shared login foundation. Lock legend lost contrast over the scrim. | Shared sign-in/MFA retained and verified, lock background made inert, shared lock-caption contrast corrected with a styleguide note. | §3, §9, §12 |

The shared checkbox's indeterminate state and lock-caption contrast are implemented in the design system, with styleguide coverage. The small `apps/admin/js/lowcode.js` change retains Ministry configuration in the existing shared draft/review handoff; it does not create another persistence mechanism.

## Measured and visual review

The expanded matrix captured 316 states across Russian/Tajik and light/dark, at 1440px, 960px, 620px, 390px, and 1440×640. An additional 24 captures covered every registry/report view with the desktop sidebar collapsed. Settled dialog captures covered requests, returns, decisions, completed results, notifications and preferences. The earlier queue review also covered 1280px and 1024px.

- No horizontal workspace overflow in the 340 measured expanded/collapsed states. The narrow editor step strip intentionally scrolls horizontally and reveals the selected step.
- Registry/report headings: 28px / 600; desktop left edge 288px expanded and 97px collapsed. The collapsed edge includes centering of the shared 1360px content container within the wider available space.
- Editor pane heading: 24px / 600. The full-screen editor retains a compact title in its toolbar and its own pane layout.
- Panel heading: 17px / 500; repeated row title: 14px / 500; secondary row metadata: 12px / 400; table labels and editor field labels: 13px / 500.
- Sidebar: 264px expanded / 66px collapsed. Top bar: 60px.
- Header and row columns share their definitions; phone figures retain their labels; touch targets and focus indicators were checked.
- 23 reviewed Ministry reference images cover queue, application overview, documents, forms, reports, interagency registry, notifications, fields editor, issuance editor and mobile certificate/editor states. The final comparison run passed without updating those references.

## Checks

| Check | Result |
| --- | --- |
| `npm run lint:design-system` | Pass |
| `npm run build` | Pass; existing bundle-size advisory remains |
| `npm test -- --workers=2` | 186 pass, 3 pre-existing failures |
| `npm run test:a11y -- --workers=2` | 28 pass, including expanded Ministry states and dialogs |
| Ministry functional and sidebar tests | 11 pass in the final combined run |
| Existing Ministry workflows and layout checks | 7 pass after the final changes |
| Ministry visual tests | 4 pass, comparing 23 reference images without updates |
| Existing visual suite | 1 pass, 10 pre-existing failures |
| `git diff --check` | Pass |

Browser runs reused the local Vite server with `PLAYWRIGHT_PORT=5173`. Review measurements and temporary screenshots are under `/tmp/ministry-platform/`; tests and reference images are under `qa/`.

The three full-suite failures reproduced on the starting commit are:

1. `routes.spec.js`: expects Google Sans although the canonical guide and tokens specify Inter.
2. `screen-layouts.spec.js`: ЦОН shift-home recent-list padding fails its existing symmetry assertion.
3. `workflows.spec.js`: ЦОН dashboard expects a transparent status icon although the current table renders a tinted status circle.

The ten older visual failures affect launcher/citizen/ЦОН/admin and combined-platform references. The same failures were reproduced on the starting commit. Resolving those existing discrepancies is required before the guide's repository-wide acceptance can be called fully green.

## Prototype boundary

This remains the existing frontend prototype. Original uploaded document files are absent, so their controls expose accurate metadata and an explicit unavailable-file note. Configuration, report export and the existing shared review workflow work within the prototype; no backend integration or deployment was introduced.
