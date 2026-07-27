# Shared component inventory

The live examples are at `/design-system/styleguide.html`. This inventory distinguishes canonical pieces from product composition.

| Family | Canonical coverage | Main source |
| --- | --- | --- |
| Brand | Logo, wordmark, platform label | `design-system/assets/logo.svg`, shared CSS |
| Actions | Primary, secondary, ghost, danger, icon, loading, disabled | `design-system/css/components.css` |
| Fields | Text, search, phone, password, OTP, textarea, select, checkbox, radio, switch, date, file | `design-system/css/components.css`, app recipes |
| Validation | Help, error, warning, success, source/provenance | `design-system/css/components.css`, `patterns.css` |
| Navigation | Header anatomy, sidebar item, tabs, segmented controls, breadcrumbs, platform switcher | shared CSS, `platform-switcher.js` |
| Data display | Panels, metrics, list rows, tables, status pills, tags, empty/loading states, pagination | shared CSS and product composition |
| Feedback | Dialog/alert dialog, overlay, drawer styling, menus, toast, inline banner | shared CSS, `dialog.js`, `menu.js`, `toast.js` |
| Workflow | Stepper, progress/timeline, SLA state, document preview | `patterns.css` and product composition |
| Identity | Category tile and common SVG wrapper | shared CSS, `assets/icons.svg` |
| Runtime | Theme/language, focus, shortcuts, presentation mode, reset tools | `preferences.js`, `focus.js`, `app-shell.js`, `demo-tools.js` |

## Product variants

The following differences are intentional rather than new design systems:

- Citizen supplies comfortable cards, life-event layouts, mobile navigation, wallet documents, and a focused phone login dialog.
- Ministry supplies compact queue/table composition, application details, SLA information, staff MFA, and four-eyes decisions.
- ЦОН supplies fixed workstation chrome, shift/session state, operator MFA, citizen consent, and privacy-session teardown.
- Admin supplies registry, wizard, three-pane builder, component palette, preview, and publish gate.

When an app invents a control that another app already has, move the common anatomy into the canonical system and leave only layout/content in the app.
