# Architecture and product decisions

## One static multi-page application

Vite serves clean HTML routes without iframes. This preserves browser history, deep links, full-screen presentation, keyboard behavior, and reliable screenshots. The launcher contains exactly four agency-facing cards.

## One canonical design system

Home/Citizen supplied the baseline visual language. Proven workstation and back-office primitives from ЦОН, Ministry, and Admin were added as variants. Foundation files, the ALS Hauss Next font, logo, icon sprite, dialog behavior, preferences, and platform switching exist only under `design-system/`.

The action blue is `#0072d6` because it maintains the intended identity while meeting contrast requirements for primary labels. Hairlines, neutral panels, restrained elevation, semantic red, and category hue tiles remain the binding visual rules.

## Density variants are intentional

Citizen is comfortable/mobile; Ministry is compact; ЦОН is workstation-oriented; Admin is editor-oriented. ЦОН has a 1280-pixel minimum because its operational chrome and concurrent information should not collapse into a misleading consumer layout. Admin works at 768 pixels but is best demonstrated at 1280 or wider.

## Privacy on one shared origin

Only `ekh.preferences.*` and approved non-personal, app-namespaced settings may persist. Ministry application fixtures stay in memory. ЦОН uses an explicit storage allow-list and wipes citizen session data when the visit ends or is revoked. Deterministic query parameters affect a visit but do not overwrite saved preferences.

## Presentation and developer separation

Normal and `?present=1` views contain no developer chrome. `?dev=1` deliberately enables reset/debug/material controls. ЦОН's demo controller is not initialized outside developer mode, so its hidden keyboard panel cannot appear during a presentation.

## Stable shared assets

All runtime icon references use `/design-system/assets/icons.svg#…`. Vite copies the sprite to the same stable production path after bundling. This avoids local sprite copies and prevents hashed-asset rewrites from breaking dynamically generated icons.

## Archived originals

The old application folders are retained under `legacy/` for reference but are excluded from build inputs and launcher destinations. The Git tag `pre-unified-2026-07-27` is the authoritative recovery point. Generated dependencies, `.DS_Store` files, and redundant active-route copies are removed rather than carried into the new architecture.
