# Architecture and product decisions

## One static multi-page application

Vite serves clean HTML routes without iframes. This preserves browser history, deep links, full-screen presentation, keyboard behavior, and reliable screenshots. The launcher contains exactly four agency-facing cards.

## One canonical design system

Home/Citizen supplied the baseline visual language. Proven workstation and back-office primitives from ЦОН, Ministry, and Admin were added as variants. Foundation files, the bundled Inter font, logo, icon sprite, dialog behavior, preferences, and platform switching exist only under `design-system/`.

The binding visual rules — action color, typography, surfaces, density variants per platform, and the polish method — live in [docs/design-guide.md](design-guide.md), the canonical design contract.

## Privacy on one shared origin

Only `ekh.preferences.*` and approved non-personal, app-namespaced settings may persist. Ministry application fixtures stay in memory. ЦОН uses an explicit storage allow-list and wipes citizen session data when the visit ends or is revoked. Deterministic query parameters affect a visit but do not overwrite saved preferences.

## Presentation and developer separation

Normal and `?present=1` views contain no developer chrome. `?dev=1` deliberately enables reset/debug/material controls. ЦОН's demo controller is not initialized outside developer mode, so its hidden keyboard panel cannot appear during a presentation.

## Stable shared assets

All runtime icon references use `/design-system/assets/icons.svg#…`. Vite copies the sprite to the same stable production path after bundling. This avoids local sprite copies and prevents hashed-asset rewrites from breaking dynamically generated icons.

## Archived originals

The old application folders are retained under `legacy/` for reference but are excluded from build inputs and launcher destinations. The Git tag `pre-unified-2026-07-27` is the authoritative recovery point. Generated dependencies, `.DS_Store` files, and redundant active-route copies are removed rather than carried into the new architecture.
