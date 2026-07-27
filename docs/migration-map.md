# Migration map

The root Git tag `pre-unified-2026-07-27` records the untouched pre-merge state. The former nested `mvp2` repository history is preserved locally under `.history/`. Old applications are archived under `legacy/` and are not part of Vite's build inputs.

| Previous source | Role before unification | Current destination | Status |
| --- | --- | --- | --- |
| `mvp2/` | Citizen/Home reference and nested Git history | `citizen/index.html`, `apps/citizen/`, canonical `design-system/` | Migrated; source archived |
| `ЦОН/ekhizmat-arm/` | ЦОН operator application | `tson/index.html`, `apps/tson/` | Migrated; source archived |
| `Orgs/vedomstvo-arm/` | Ministry specialist application | `ministry/index.html`, `apps/ministry/` | Migrated; source archived |
| `Admin/` | Service administrator prototypes | `admin/*.html`, `apps/admin/` | Migrated; source archived |
| `mvp2/OPERATOR/` and copied operator bundles | Reference variants | Canonical ЦОН route only | Archived, never exposed in launcher |
| Repeated app token/component CSS | Per-app visual foundations | `design-system/tokens/`, `design-system/css/` | Consolidated |
| Repeated fonts, logos, icon sprites | Per-app assets | `design-system/assets/` | Consolidated |
| App modal and preference code | Similar local behaviors | `design-system/js/` | Shared behavior consolidated |
| Old QA screenshots and handoff artifacts | Historical evidence | Git tag and `legacy/` | Archived, not active baselines |

## Active route files

- `index.html` + `apps/launcher.*` — four-card launcher.
- `citizen/index.html` + `apps/citizen/` — Citizen.
- `tson/index.html` + `apps/tson/` — ЦОН.
- `ministry/index.html` + `apps/ministry/` — Ministry.
- `admin/*.html` + `apps/admin/` — Admin registry, wizard, and builder.
- `design-system/styleguide.html` + `apps/styleguide.*` — internal component showcase.

## Recovery

To inspect the original tree without changing current work, use `git show pre-unified-2026-07-27:<path>`. To restore a specific historical file, copy its content from that tag into a new branch; do not reset the unified branch.
