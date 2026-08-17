---
name: polish-page
description: Polish an eKhizmat page to the canonical design standard in docs/design-guide.md. Use when asked to polish, clean up, refine, redesign, or de-clutter any page's UX/UI, or to make a page match services.html.
---

# Polish an eKhizmat page

1. Read `docs/design-guide.md` in full — it is the contract; this skill only sequences it.
2. Identify the target page from the request (`$ARGUMENTS` if given). Open it in the browser next to the reference, `admin/services.html`.
3. Run the guide's §2 procedure pass by pass: inventory → remove competition → converge controls on the §3 canon → typography (§4) → layout and alignment (§5) → states, behavior, accessibility (§6–§9) → motion last (§8).
4. Apply the §10 decision rules mechanically wherever they match; do not restyle by taste.
5. Verify per §11: `npm run lint:design-system`, `npm test`, `npm run test:a11y`, `npm run test:visual`, plus the visual review list, comparing side-by-side with services.html.
6. If the page needed a decision the guide does not cover, add the rule to `docs/design-guide.md` in the same change.
