# QA evidence

This file records what can be proved automatically and what still needs a human sign-off. Re-run commands before release; the most recent results should be updated here if the code changes.

## Automated coverage

Verified on 2026-07-27 after legacy cleanup:

| Command | Result | Coverage |
| --- | --- | --- |
| `npm test` | 50/50 passed | Design drift, contrast, canonical stroke-icon rendering, route/page errors, key workflows, storage privacy, presentation mode, keyboard shortcuts, and the required viewport matrix |
| `npm run test:visual` | 5/5 tests; 11 snapshots passed | Launcher, Citizen mobile, and four-platform light/Russian plus dark/Tajik screenshot matrix |
| `npm run test:a11y` | 12/12 passed | Axe WCAG A/AA scans in both themes on launcher, all platforms, and styleguide |
| `npm run test:contrast` | 4/4 pairs passed | Token-level foreground/background AA checks; primary action is 4.80:1 |
| `npm run lint:design-system` | Passed across 11 CSS and 8 HTML files | No raw app colors, copied shared foundations, duplicate font/sprite, or local active icon references |
| `npm run build` | Passed | Production multi-page build and stable runtime assets |
| Fresh local clone in `repository with spaces` | `npm ci` and `npm run build` passed; 0 dependency vulnerabilities | Clean-checkout and path-with-spaces reliability gate |

The workflow suite covers Citizen category/profile/wallet/QR/logout, Ministry MFA/queue/detail/decision, ЦОН MFA/shift and privacy teardown, and Admin wizard/builder/publish gate. Responsive checks use every viewport listed in the unification plan, including Citizen at 320 pixels and ЦОН's intentional below-1280 message.

## Manual release checklist

- Keyboard-only: complete one primary flow in each platform; verify visible focus and restored focus after dialogs.
- Screen reader spot check: page title/landmarks, field labels, errors, dialogs, and result announcements in Tajik and Russian.
- Zoom/text: review Citizen at 200% and dense products at their documented minimums.
- Visual review: approve changed baselines in both themes and both representative languages.
- Performance: check Citizen first content on a throttled mobile connection and Ministry table interaction.
- Demo rehearsal: run the exact script from a reset state without developer controls.

## Required sign-off

Automated tests cannot replace organizational approval. The following signatures are intentionally left pending rather than invented:

| Role | Status | Name/date |
| --- | --- | --- |
| Design owner | Pending | — |
| Front-end lead | Pending | — |
| QA owner | Pending | — |
| Product owner | Pending | — |

The technical implementation can be release-ready while these governance approvals remain an explicit final handoff item.
