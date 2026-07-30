# eKhizmat design-system contract

This folder is the single source of truth for shared eKhizmat visuals and interaction behavior. Applications may compose these pieces, but must not copy or redefine them locally.

## Use it

Every page imports:

```html
<link rel="stylesheet" href="/design-system/global.css">
<script type="module" src="/design-system/js/app-shell.js"></script>
```

`global.css` loads the token and shared CSS layers in a stable order. App CSS belongs under `apps/<platform>/` and should contain platform layout or genuinely platform-specific presentation only.

The live catalogue is at `/design-system/styleguide.html`. Open it with `?dev=1` from the launcher materials area.

## Foundations

- `tokens/color.css` — light/dark surfaces, text, action, state, category, and preview colors.
- `tokens/type.css` — Google Sans and the shared type scale.
- `tokens/space.css` — the 4-pixel spacing scale.
- `tokens/shape.css` — approved radii and control sizes.
- `tokens/motion.css` — timing, easing, and reduced-motion behavior.
- `tokens/layout.css` — content widths, gutters, layers, and workspace dimensions.
- `css/` — reset, foundations, reusable components, patterns, and small utilities.
- `assets/` — the only shared font, logo, and SVG icon sprite.
- `js/` — preferences, dialogs, menus, focus handling, toast, platform switching, and developer reset tools.

## Density variants

The products share component anatomy but not identical layouts:

- Citizen: comfortable and touch-friendly.
- Ministry: compact queues and tables.
- ЦОН: workstation density with a deliberate 1280-pixel minimum.
- Admin: editor density for a three-pane builder.

These are documented variants of one system. They still use the same tokens, focus ring, action colors, icons, state language, and interaction helpers.

## Binding rules

1. Use a token for every shared color, size, radius, and motion value. Do not add raw hex, `rgb()`, or `hsl()` colors in app code.
2. Do not copy `tokens/`, the font, `icons.svg`, shared components, or dialog logic into an app.
3. Reference sprite icons as `/design-system/assets/icons.svg#icon-name`; local inline sprite copies are rejected by the design lint.
4. Same task means the same shared component or dialog recipe. Supply app-specific wording as content.
5. Keep touch targets at least 44×44 pixels on Citizen/mobile surfaces.
6. Add visible focus, hover, active, disabled, loading, error, and reduced-motion behavior where relevant.
7. Test Tajik and Russian copy; do not size controls around one language.

## Motion rules

- Keep frequent work actions immediate. Motion explains the arrival or departure of a layer; it does not decorate filtering, searching, or queue redraws.
- Use the shared timing and easing tokens. Raw `cubic-bezier()` curves in application or component CSS are rejected by the design lint.
- Entrances may use `--t-layer`; exits use the faster `--t-exit`. Layer removal must wait for the exit transition to finish.
- Buttons use a short transform-only press response: `scale(.97)` for regular buttons and `scale(.96)` for icon buttons. Do not use spring or bounce easing.
- `prefers-reduced-motion` removes spatial press and layer movement while preserving state and color feedback. Loading spinners remain visible.

## Making a shared change

1. Confirm the need applies to more than one platform. If it does not, keep it in the app stylesheet.
2. Add or adjust the smallest appropriate token/component; retain compatibility aliases until every active app has migrated.
3. Add the state to `styleguide.html` when it changes the public component contract.
4. Run `npm run lint:design-system`, `npm run test:contrast`, `npm test`, `npm run test:a11y`, and `npm run test:visual`.
5. Review visual snapshot changes rather than accepting them blindly.

The lint check permits raw colors only in the canonical color tokens and intentional document-preview artwork. This makes visual drift visible early.
