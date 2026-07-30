# eKhizmat interface polish guide

Status: reusable design and implementation guide

Reference implementation: Ministry specialist workspace

Primary evidence: commits `e0c8385` and `c5967ca`, plus the 30 July 2026 collapsible-sidebar refinement
Last reviewed: 30 July 2026

## Purpose

This guide captures why the Ministry workspace feels more deliberate than a merely functional interface, and turns those decisions into a repeatable method for polishing Citizen, TSON, Admin, and future eKhizmat products.

It is not a replacement for the shared design-system contract. Shared tokens, components, icons, focus behavior, dialogs, and themes still come from [`design-system/`](design-system/). This guide explains how to compose them well, what to remove, and how to review the result.

The central lesson from the Ministry work is:

> Polish is not the number of visual elements. It is the quality of hierarchy, alignment, restraint, state feedback, and edge-case handling.

## Evidence reviewed

The guide is based on the live Ministry screens, the existing motion audit in [`docs/PLAN-MINISTRY-POLISH.md`](docs/PLAN-MINISTRY-POLISH.md), the shared design-system documentation, visual snapshots, and the following Git changes:

| Commit | What changed | What it teaches |
| --- | --- | --- |
| `83d530b` | Baseline immediately before the focused Ministry polish | A useful product can still contain duplicated components, inconsistent hierarchy, partial localization, and abrupt state changes |
| `e0c8385` — `feat: polish ministry workflows and shared UI` | 17 files; workflow cleanup, filters, localization, responsive fixes, press feedback, dialogs, popovers, and toasts | Polish begins with behavior and information architecture, not decoration |
| `c5967ca` — `Polish Ministry typography and table layout` | 5 files; typography, icon weight, table geometry, truncation, and visual hierarchy | A final type-and-alignment pass can materially improve calmness and scan speed without changing the workflow |
| Working tree, 30 July 2026 — collapsible Ministry sidebar | Desktop sidebar becomes a `66px` icon rail; section names become dividers; toggle/profile alignment, ARIA, localization, motion, and mobile drawer behavior are completed | Collapsing navigation is a coordinated shell state, not merely hiding text or changing one width |

The implementation references are primarily:

- [`apps/ministry/app.css`](apps/ministry/app.css)
- [`apps/ministry/js/app.js`](apps/ministry/js/app.js)
- [`apps/ministry/js/data.js`](apps/ministry/js/data.js)
- [`design-system/tokens/`](design-system/tokens/)
- [`design-system/css/components.css`](design-system/css/components.css)
- [`design-system/css/patterns.css`](design-system/css/patterns.css)
- [`design-system/js/dialog.js`](design-system/js/dialog.js)
- [`qa/functional/ministry-sidebar.spec.js`](qa/functional/ministry-sidebar.spec.js)

## What actually changed, and why

The following is the reusable decision record from the Ministry diffs.

| Before | After | Why |
| --- | --- | --- |
| “Batch processing” was a permanent sidebar destination | Batch actions appear contextually after selecting rows | A temporary mode should not compete with permanent destinations; reveal tools when they become relevant |
| Desktop navigation was always `264px` wide | A labeled `264px` sidebar can collapse into a `66px` icon rail | Frequent operators can reclaim workspace without losing access to permanent destinations |
| Hiding sidebar labels would have left tall, empty group-heading slots | Group names such as “Аналитика” contract from `44px` headings into `17px` divider lines | A collapsed state must be recomposed, not cropped; every remaining gap must still communicate structure |
| The identity block retained off-centre text geometry when labels disappeared | The avatar is optically centred with the navigation icons and identity text becomes non-interactive while hidden | A compact rail should read as one intentional vertical axis from first control to last |
| One menu button only opened the narrow-screen drawer | The same control collapses the desktop rail and opens the mobile drawer, with viewport-correct iconography, labels, and `aria-expanded` | A shared trigger may control two responsive presentations, but its meaning and accessible state must follow the active presentation |
| Ministry carried its own duplicate tab styling | The duplicate CSS was removed and the shared tab component is used | Same task should have the same anatomy and behavior across products |
| Dense queue rows included a category tile, guest icon, shield icon, status dot, and SLA clock | Decorative/redundant queue icons were removed; text, tint, placement, and accessible labels carry the meaning | Every repeated symbol consumes attention. Dense work surfaces need a higher signal-to-noise threshold than catalogues or onboarding |
| Native selects gave limited selected/open-state clarity | Filters became compact listboxes with a checkmark, trigger state, focus behavior, arrow-key navigation, Home/End, and Escape | Custom controls are justified only when they improve the whole interaction, including keyboard and screen-reader behavior |
| Uppercase 11–12px navigation/table labels were used broadly | Most shell and table labels moved to 13–14px sentence case | Sentence case is faster to scan and feels less bureaucratically “loud”; uppercase is reserved for short structural eyebrows |
| Font weights drifted through `620`, `650`, `700`, and `720` | Ministry uses a controlled `500 / 550 / 600` hierarchy | A narrow weight range produces calm hierarchy and prevents every label from competing for attention |
| Repeated rows often looked equally bold | Repeated titles use `550`; only active, selected, or open content moves to `600` | Weight should communicate state and hierarchy, not decorate every item |
| Queue header and rows repeated similar but independent grid values | A shared `--q-columns` definition controls both; gaps and optical offsets are explicit | Headers and cells must remain mathematically aligned; “nearly aligned” reads as unfinished |
| Long status, service, and applicant text could force or collide with columns | Grid children use `min-width: 0`, controlled column tracks, and intentional ellipsis | Truncation is a layout decision, not an emergency patch; the full value must remain available in detail or accessible text |
| Top search grew in the remaining flex space | Search is optically centered at `50%`, capped at `460px`/`37vw`; utilities remain right-aligned | A major global action should feel anchored even when left and right chrome have unequal widths |
| Button press changed only color; danger/chip hover used `filter: brightness()` | Press uses subtle transform feedback; semantic hover/press colors use tokens | The interface should physically acknowledge input, and states should be predictable, themeable, and cheap to render |
| Modals, drawers, popovers, and toasts animated in but disappeared instantly | Entrances and exits use shared transitions; exits are slightly faster; DOM removal waits for the exit | Objects should leave through the same spatial logic by which they arrived; teleporting layers make an interface feel cheap |
| Toasts had one fixed timer and neighboring items jumped after removal | Timers pause on hover and hidden tabs; toasts can be closed; the stack collapses smoothly | Edge cases users rarely describe are often what make a component feel trustworthy |
| Login labels animated `font-size` | The label uses `transform: translateY(...) scale(...)` | Transform avoids repeated layout work and keeps the first interaction visually stable |
| Tablet layout used a bare `1fr` track | It uses `minmax(0, 1fr)` and children use `min-width: 0` | CSS grid’s intrinsic minimum can make a page wider than the viewport even when overflow appears controlled |
| Many visible and accessible strings were hard-coded in Russian | Data, dates, durations, labels, notifications, actions, and ARIA names are localized for Russian and Tajik | Localization is part of layout and accessibility, not a final translation pass |

## 1. Start with the product’s working character

Before changing CSS, write one sentence describing how the product should feel in use.

For Ministry, that sentence is:

> Calm, immediate, official, and dense enough for a specialist who uses it throughout a shift.

Each product may have a different density, but it should still belong to eKhizmat:

| Product | Working character | Density implication |
| --- | --- | --- |
| Citizen | Reassuring, comfortable, touch-friendly | Larger targets, more explanation, more vertical space |
| Ministry | Calm, immediate, official | Compact queues, restrained motion, strong scanning hierarchy |
| TSON | Fast workstation with persistent session context | Dense operational chrome, fixed critical state, predictable keyboard flow |
| Admin | Focused construction/editor tool | Multi-pane layout, compact controls, persistent preview and workflow state |

Do not force all four products into identical layouts. Share anatomy, tokens, state language, and interaction behavior; vary density and composition according to the job.

## 2. Polish information architecture before styling

The first pass should remove conceptual competition.

### Keep permanent navigation permanent

Sidebar items should represent destinations a user can return to. A temporary mode such as batch selection belongs near the selected objects, not in the global navigation.

“Permanent” means the destination remains available, not that its text label must always consume space. A collapsible desktop rail is appropriate when icons are familiar, labels remain available as native titles/tooltips, and expanded navigation is one action away. Do not remove or reorder destinations between the two states.

### Reveal tools in context

- Show the batch action bar only after one or more rows are selected.
- Show destructive or approval actions in the record context, not in the global shell.
- Keep advanced controls hidden until their prerequisite state exists.
- Put a page’s primary action in a consistent location: the page header, sticky action area, or modal footer.

### Remove duplicate representations

One fact usually needs one strong representation.

- A status pill already contains text and semantic tint; it usually does not need another dot.
- A time-to-deadline value with an accessible status does not also need a clock icon in every row.
- A service category icon can help in a catalogue, but repeated icon tiles can become noise in a dense queue.
- Do not repeat the same action in the sidebar, toolbar, card, and floating button.

Use decorative category tiles where recognition matters. Remove them where comparison and scanning matter more.

## 3. Use a restrained typography system

The Ministry pass works because hierarchy comes from a small, repeatable set rather than one-off font values.

### Ministry reference scale

| Role | Size | Weight | Notes |
| --- | ---: | ---: | --- |
| Page title | `24px` | `600` | One clear title per view |
| Modal title | `20px` | `600` | Strong, but subordinate to a full page |
| Section/empty-state title | `17px` | `600` | Use for meaningful subsections, not every card |
| Body/default UI | `15px` | `500` | The operational baseline |
| Primary row title/name | `14px` | `550` | Service name, applicant, report owner |
| Table header/metadata/action hint | `13px` | `500–550` | Quiet but readable |
| Secondary row metadata | `12px` | `500` | Category, identifier, timestamp |
| Compact badge only | `10–11px` | `550–600` | Counts and highly constrained preview UI, not body copy |

Ministry also applies `-0.01em` tracking to make the compact interface feel tighter and more deliberate. Numeric identifiers, dates, money, counters, and SLA values use `font-variant-numeric: tabular-nums` so columns do not visually wobble.

### Weight rules

- `500` is normal text, not “light” text.
- `550` is medium emphasis: labels, row titles, tabs, badges, and repeated navigation.
- `600` is the ceiling for headings, key values, primary/danger buttons, and active/open items.
- Only the current/open item should gain the strongest weight in a repeated list.
- Avoid isolated values such as `620`, `650`, `700`, or `720` unless the shared type system explicitly adopts them.

### Case rules

- Use sentence case for navigation, table headers, statuses, and common actions.
- Reserve uppercase for very short structural labels such as a builder eyebrow or field label when it materially helps grouping.
- Never use uppercase merely to make quiet content feel important; fix hierarchy instead.

### Font portability caveat

The current Ministry stylesheet requests `Inter`, while the repository’s canonical bundled font and design-system contract specify Google Sans. Inter is not currently bundled in this repository. Do not copy that override to another platform until the team resolves the font source-of-truth. A reusable rule must render consistently on a clean device, not only on a designer’s computer.

## 4. Build spacing from relationships

Use the shared 4px scale from [`design-system/tokens/space.css`](design-system/tokens/space.css):

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

Do not choose spacing by asking “what looks good here?” Ask “what relationship is this spacing expressing?”

| Relationship | Reference spacing | Typical use |
| --- | ---: | --- |
| Icon to label / title to metadata | `4–8px` | Tight internal relationship |
| Controls in one toolbar / sibling buttons | `8–12px` | Same task group |
| Content within a row | `12–20px` | Separate columns while preserving scan rhythm |
| Panel interior | `16–24px` | One semantic container |
| Major form or page sections | `24–32px` | Different tasks or information groups |
| Large empty/hero separation | `40–64px` | Rare, low-density focus screens |

### Ministry reference measurements

- Page padding: `24px` desktop, `16px` on narrow screens.
- View header to next major region: `20px`.
- Queue row: `12px 16px` padding.
- Queue desktop column gap: `20px`, shared by header and rows.
- Sidebar item: `8px 12px` padding, `12px` icon-to-label gap.
- Sidebar: `264px` expanded, `66px` collapsed; group heading: `44px` expanded, `17px` divider when collapsed.
- Standard panel/modal padding: `24px`.
- Toolbar controls: `36px` high with `8px` gaps.
- Main buttons/fields: shared `44px`; large authentication controls: `52px`.

An optical adjustment of one 4px step is acceptable when dense content needs breathing room, but comment the reason in code. Optical tweaks must not break the shared alignment grid.

## 5. Make alignment a system, not a coincidence

### Tables and queues

Define the columns once and reuse them for header and body:

```css
.queue {
  --queue-columns: 24px 124px minmax(0, 1.15fr)
                   minmax(0, 1fr) 84px 128px 96px;
  --queue-gap: var(--s-5);
}

.queue-head,
.queue-row {
  display: grid;
  grid-template-columns: var(--queue-columns);
  column-gap: var(--queue-gap);
}
```

Rules:

- Checkbox and utility columns are fixed.
- Identity/content columns are flexible.
- Dates, status, and SLA get enough fixed width to remain comparable.
- Add `min-width: 0` to every flexible grid/flex child that may truncate.
- Use ellipsis only where a nearby detail view exposes the full value.
- Keep header and row padding identical; if a border creates a 1px inset, compensate deliberately.
- Keep numeric content tabular and consistently aligned.

### Shell alignment

The Ministry reference uses:

- `60px` top bar.
- `264px` expanded desktop sidebar and `66px` compact rail.
- `1360px` maximum content view.
- `340px` detail context column.
- A globally centered search capped at `460px`.

These numbers are not universal. The reusable rule is that shell anchors remain stable between screens and within each deliberate shell state. Ordinary content changes must not resize navigation or move global search. If the user explicitly collapses navigation, the content region may expand, but the navigation icons must keep their horizontal axis and the top-bar utilities must not jump independently.

### Forms and builders

- Keep labels, fields, helper text, and validation aligned to the same left edge.
- In multi-pane builders, constrain the editor’s reading width even if the overall workspace is wide.
- Make preview width stable; do not let form content push the editor or pipeline tracks.
- Use sticky context/actions only when they remain relevant during the whole scroll.
- Avoid nested panels that repeat borders without adding a new semantic level.

## 6. Establish a clear surface and color hierarchy

Use semantic tokens, never raw colors in application code.

### Surface order

1. `--bg`: page/workspace background.
2. `--panel`: primary readable container.
3. `--field` / `--field-on-panel`: inputs and quiet control groups.
4. `--raised` plus `--shadow-layer`: menus, popovers, dialogs.

Borders are quiet separators, not decoration. Prefer one hairline around a coherent group instead of putting every row or field in its own card.

### Action color

- Blue is for interactive emphasis: primary action, selected state, focus, and links.
- Do not use action blue for ordinary headings or decoration.
- Keep one primary action per page region or modal decision.
- Use explicit hover and pressed tokens rather than `filter: brightness()`.

### Semantic states

- Green: completed/valid/available.
- Amber: waiting/approaching/degraded.
- Red: error/breach/destructive/denied.
- Neutral: draft/inactive/secondary.

State must survive without color. Pair tint with visible text, placement, accessible names, or an icon only when the icon adds information.

### Category hues

Category hues help recognition in catalogues, cards, and previews. They should remain background/foreground token pairs. In high-density tables, remove hue tiles if they compete with the fields users compare most often.

## 7. Components must expose complete states

Every interactive component should be reviewed in these states:

`default → hover → active → focus-visible → selected/open → disabled → loading → error/success → reduced motion`

### Buttons

- Pill shape is the shared action language.
- Regular press: `scale(.97)`.
- Icon-button press: `scale(.96)`.
- Press transition: `120ms` using the shared curve.
- Disabled buttons do not move and cannot be clicked.
- Primary and danger labels use `600`; ordinary controls usually use `550`.
- In a stacked mobile/modal layout, preserve action order and make buttons full width where helpful.

### Navigation

- Use an 18px outline icon in compact desktop navigation.
- Default icon stroke: about `1.5`; active may increase subtly, as Ministry does with `1.8`.
- The active item receives tint, ink, and moderate weight together.
- Counts remain secondary; an urgent count may use semantic red tint.
- Group labels are readable sentence case, not tiny decorative captions.

#### Collapsible desktop sidebar pattern

Treat collapse as two designed compositions, not one layout with clipped text:

| Expanded | Collapsed | Why |
| --- | --- | --- |
| `264px` labeled navigation | `66px` icon rail | The rail saves meaningful workspace while keeping targets comfortably clickable |
| Group title occupies `44px` | Group title becomes a `17px` hairline divider | Structure remains visible without leaving a label-shaped hole |
| Label, count, and identity text are visible | Text fades out, ignores pointer input, and no longer contributes visible clutter | Hidden content must not leave accidental interaction zones or compete with icons |
| Profile avatar sits beside the user name/division | Avatar shares the navigation-icon centre line | The footer belongs to the same visual axis as the rail above it |
| Chevron points toward collapse | Chevron rotates toward expansion | Direction communicates the result of the next action |

Implementation rules:

- Keep the icon centre fixed between expanded and collapsed states; users should not have to reacquire every target after toggling.
- Centre the footer/avatar optically against that same axis. Small `1–2px` optical corrections are valid when mathematical centring looks off, but protect them with a geometry test.
- Hide horizontal overflow on the sidebar and use `minmax(0, 1fr)` for the content track so long content cannot force a page-wide jump or scrollbar.
- Give each icon-only destination its full localized label through `title` or the project tooltip component; keep the button’s accessible name intact.
- Put the sidebar toggle in the stable top-bar chrome, associate it with the sidebar using `aria-controls`, and update `aria-expanded`, `aria-label`, and `title` for the actual viewport/state.
- Preserve the current destination, scroll context, and page state when collapsing. Collapse changes available space, not navigation history.
- Do not show the desktop collapse affordance where the shell is intentionally replaced, such as the Ministry form-builder.

### Filters

Prefer native controls unless a custom control materially improves the experience. A custom filter must include:

- A real button trigger.
- `aria-haspopup`, `aria-expanded`, and `aria-controls`.
- A listbox/option relationship with `aria-selected`.
- A visible selected marker.
- Arrow-key navigation, Home/End, Enter/Space, and Escape.
- Focus return to the trigger on close.
- A bounded menu height and usable scrollbar.
- Trigger-aware transform origin.

Visual polish without keyboard completeness is unfinished work.

### Statuses and badges

- Keep labels short and localized.
- Use one semantic tint/ink pair.
- Avoid stacking a dot, icon, colored border, bold text, and tint for the same state.
- Allow controlled truncation in dense rows; keep full text available through detail context or accessible naming.

### Empty, loading, and error states

- Empty states answer: what happened, whether it is good/bad, and what the user can do next.
- Loading skeletons must approximate the final geometry to prevent layout shift.
- Validation should change ring/message state without shifting surrounding layout unexpectedly.
- Error messages must be specific and located next to the decision required.

## 8. Motion should explain, not decorate

The Ministry motion character is calm, immediate, and official. It uses no bounce or spring.

### Frequency decides how much motion is allowed

| Frequency | Guidance | Ministry example |
| --- | --- | --- |
| Hundreds of times per day | No spatial animation | Search, filtering, sorting, queue redraw, keyboard navigation |
| Tens of times per day | Instant or extremely short | Tabs, segmented filters, utility menus |
| Occasional | Standard transition | Dialog, drawer, toast, notification popover |
| Rare/first entry | Small amount of warmth | Login step, first dashboard metric appearance, success mark |

### Shared timing reference

| Token | Duration | Use |
| --- | ---: | --- |
| `--t-fast` | `120ms` | Hover/press/color response |
| `--t-popover` | `150ms` | Small anchored layer entrance |
| `--t-exit` | `160ms` | Layer exit; slightly faster than entry |
| `--t-step` | `180ms` | Small workflow step change |
| `--t-layer` | `200ms` | Dialog/drawer entrance |
| `--t-draw` | `400ms` | Rare explanatory stroke draw |

Use the shared curves:

- `--ease-out` for entrances and immediate response.
- `--ease-layer` for dialogs/drawers.
- `--ease` for color and ordinary state change.

### Spatial rules

- A popover grows from its trigger; set the correct `transform-origin`.
- A modal remains centered because it is not spatially attached to one trigger.
- A drawer exits in the direction from which it entered.
- A toast exits toward its entry edge and its stack closes the gap smoothly.
- Start scale entrances around `.98–.985`, never `scale(0)`.
- Prefer transitions for UI that may be interrupted or reversed.
- Remove the DOM node only after the exit has completed.

### Performance rules

- Animate `transform` and `opacity` whenever possible.
- Do not animate `font-size`, padding, width, or general page layout.
- A user-invoked shell collapse is a bounded exception: Ministry transitions one top-level grid track for `200ms` to prevent the main workspace from snapping. Keep descendants out of layout animation, hide overflow during the transition, and test it under realistic table load before reusing the exception.
- The toast-stack collapse is a justified rare exception because preventing a jump is more valuable than avoiding that small layout animation.
- Never use `transition: all`.
- Do not animate page changes in an operational workstation.

### Reduced motion and touch

- Reduced motion removes spatial transforms while preserving color/state feedback.
- Loading indicators remain understandable.
- Gate hover-only behavior with `@media (hover: hover) and (pointer: fine)`.
- Never rely on hover to expose the only path to an action; retain focus and touch access.

## 9. Responsive design should preserve task order

Responsive work is not “make everything narrower.” Preserve the order in which a user understands and completes the task.

### Ministry reference behavior

- At `1080px`, the detail context column moves below the main record, keeping data before actions.
- Above `960px`, the user can switch between the `264px` labeled sidebar and `66px` icon rail without changing destinations or page state.
- At `960px`, the compact-rail model stops: the sidebar becomes an off-canvas drawer and the queue changes from a table to readable cards.
- At `620px`, page padding reduces, top search/platform binding hides, side panels stack, and batch/report layouts recompose.
- The queue header disappears only when rows stop behaving like aligned table rows.
- A bare grid `1fr` becomes `minmax(0, 1fr)` to prevent intrinsic content overflow.

### Reusable rules

- Change the component’s information layout at the same breakpoint where alignment stops being useful.
- Do not squeeze a seven-column table into a phone viewport.
- Preserve DOM/reading order when moving visual columns.
- Maintain full-value access when desktop ellipsis becomes mobile wrapping.
- Keep primary action reachable without covering content.
- Test short viewport heights, not only narrow widths.
- Touch-first Citizen screens retain at least 44px targets even if Ministry uses 36px compact desktop controls.
- Re-evaluate the toggle on resize: desktop `aria-expanded` describes expanded/collapsed navigation, while mobile `aria-expanded` describes whether the drawer is currently open.

## 10. Localization is a layout rule

Russian and Tajik must be designed together.

- Localize application data, not only navigation chrome.
- Localize duration abbreviations, relative dates, money formats, notifications, status text, and generated documents.
- Localize `aria-label`, dialog names, sorting descriptions, and form instructions.
- Localize both outcomes of a stateful control, including “Collapse sidebar” and “Expand sidebar”; do not leave icon-only controls with a generic “Menu” name on desktop.
- Size flexible controls around the longer real translation.
- Use `min-width: 0`, wrapping, and ellipsis intentionally; do not shrink type to make one translation fit.
- Verify Tajik glyph coverage in the actual bundled font.
- Keep language changes from silently rewriting saved user preferences unless the user explicitly changes them.

If a component cannot survive the longer language, the component is not finished.

## 11. Accessibility is part of the visual polish

An interface feels polished when it responds consistently regardless of input method.

- Every visible control has a programmatic name.
- Focus is visible and never clipped by rounded containers or overflow.
- Dialog focus is trapped, Escape closes, and focus returns to the trigger.
- A row that behaves like a button is keyboard reachable and has a useful accessible name.
- Selection controls have individual labels and a “select all” label.
- Sorting communicates the active direction, not only a rotated chevron.
- Color is never the only status channel.
- Reduced motion is tested, not assumed from token definitions.
- Hover-only affordances remain available through `:focus-visible` and touch.
- Stateful shell controls expose `aria-controls` and truthful `aria-expanded`; their accessible name describes the next action.

## 12. What not to copy from Ministry

Reuse the reasoning, not every visual decision.

| Ministry choice | Why it exists | Adaptation rule |
| --- | --- | --- |
| 15px/500 body and 36px toolbar controls | Dense specialist workflow | Citizen/mobile should remain more comfortable and touch-friendly |
| `264px` / `66px` collapsible sidebar | Desktop operational navigation with familiar destinations | Use bottom/mobile navigation where the product task calls for it; do not force an icon rail onto unfamiliar or infrequent navigation |
| Seven-column queue | Comparison-heavy specialist task | Prefer cards or progressive disclosure for public-facing services |
| Minimal queue iconography | Scan speed is more important than category discovery | Catalogues may keep expressive category tiles |
| Almost no page-level motion | Operators repeat actions all day | Rare Citizen onboarding/success moments may use slightly more warmth |
| Inter override in local CSS | Current Ministry-specific experiment | Do not propagate until the canonical bundled-font decision is resolved |
| App-local redefinitions of shared component classes | Historical migration residue | Move a reusable improvement into `design-system/`; do not copy the duplicate CSS into another app |

## 13. Repeatable redesign workflow

### Step 1 — capture the real interface

Collect screenshots and interaction recordings for:

- Default screen.
- Longest/most crowded screen.
- Empty, loading, error, and success states.
- Open modal, menu, and notification state.
- Light/dark and Russian/Tajik.
- Desktop, tablet, phone, and short-height desktop.

Do not begin from the cleanest screen only.

### Step 2 — map tasks by frequency

List the user’s permanent destinations, repeated actions, occasional decisions, and rare moments. This decides navigation, what remains visible, and how much motion is appropriate.

### Step 3 — remove competition

- Remove duplicate destinations and repeated actions.
- Collapse redundant icons/status indicators.
- Move temporary tools into contextual modes.
- Ensure one clear page title and one primary action.
- Combine borders/cards that do not add a semantic level.

### Step 4 — normalize foundations

- Replace raw values with shared tokens.
- Establish one type scale and a narrow weight hierarchy.
- Apply the 4px spacing system by relationship.
- Align shared shell anchors and content widths.
- Confirm light/dark semantic token pairs.

### Step 5 — fix high-density geometry

- Define table grids once.
- Add `min-width: 0` to flexible children.
- Decide where content wraps, truncates, or moves to detail.
- Use tabular numbers.
- Test real long translations and identifiers.

### Step 6 — complete component states

Add hover, active, focus, selected/open, disabled, loading, error, and reduced-motion behavior. If creating a custom control, implement its full keyboard and ARIA model before visual refinement.

### Step 7 — add motion last

Animate only where motion explains state or space. Use shared durations/curves, implement the exit, wait before removing the DOM, and verify reduced motion.

### Step 8 — recompose responsively

Choose breakpoints from content failure, not from device labels. Preserve task and reading order. Convert comparison tables to cards when column alignment is no longer useful.

For collapsible navigation, specify a small state model before styling: expanded desktop, collapsed desktop, closed mobile drawer, and open mobile drawer. Define what the toggle means, which icon it uses, and what `aria-expanded` reports in each state.

### Step 9 — review the diff as a design artifact

For each significant addition, deletion, or selector change, record:

- What user problem changed?
- What visual/behavioral rule now applies?
- Is it shared or product-specific?
- What was removed because the new element replaces it?
- Which test protects the decision?

This prevents “polish” from becoming an unexplained pile of CSS.

## 14. Review and QA protocol

### Visual review

Review at minimum:

- `1440px` desktop.
- `1440px` desktop with the sidebar both expanded and collapsed.
- `960px` sidebar/table transition.
- `620px` narrow phone behavior.
- A viewport shorter than `700px`.
- Russian and Tajik.
- Light and dark themes.
- Normal and 200% text zoom where practical.

Look specifically for:

- Header/body column drift.
- Inconsistent left edges.
- Repeated bold text with no hierarchy.
- Tiny uppercase labels.
- Unexpected wrapping or clipped focus rings.
- Statuses that depend on color alone.
- Menus growing from the wrong origin.
- Layers whose exit is cut off by DOM removal.
- Hover behavior that sticks on touch.
- Collapsed group labels leaving empty vertical space instead of becoming dividers.
- Navigation icons, toggle, or profile avatar shifting onto different horizontal axes.
- Main content jumping, clipping, or producing horizontal overflow during sidebar collapse.

### Motion review

1. Play every new transition at 10% speed in browser developer tools.
2. Verify opacity and transform start/end together.
3. Confirm the transform origin points to the trigger.
4. Interrupt or reverse the interaction mid-transition.
5. Enable system Reduce Motion and repeat.
6. Recheck the next day with fresh eyes.

### Automated checks

Run:

```bash
npm run lint:design-system
npm run test:contrast
npm test
npm run test:a11y
npm run test:visual
```

Visual snapshots should disable animations to avoid flaky captures, but motion must still be reviewed manually.

For a collapsible sidebar, add a focused functional test that verifies:

- `264px → 66px → 264px` geometry and restored icon position.
- `44px → 17px` section-heading geometry and visible divider treatment.
- Stable navigation-icon centre, centred footer/avatar, and any intentional optical offset of the top toggle.
- Truthful `aria-expanded` in desktop and mobile modes.
- No document-level horizontal overflow.
- The existing mobile drawer still opens, closes through its backdrop, and remains in the viewport.

## 15. Definition of polished

A page is ready to use as a reference when:

- Its permanent navigation reflects permanent destinations.
- Collapsed navigation is a complete composition with aligned icons, compact dividers, discoverable labels, and no empty label-shaped gaps.
- Its primary action is obvious without making every action prominent.
- Typography uses a deliberate, small hierarchy.
- Spacing follows relationships and the 4px scale.
- Repeated content aligns mathematically.
- Dense rows contain only signals needed for comparison.
- All interactive components expose complete states.
- Entrances and exits follow coherent spatial logic.
- Frequent actions feel immediate.
- Reduced motion, touch, keyboard, and focus behavior are complete.
- Russian and Tajik content both fit and remain understandable.
- Light/dark states use semantic tokens rather than one-theme patches.
- Responsive layouts preserve task and reading order.
- The design diff can explain every meaningful addition and deletion.
- Relevant automated and visual checks pass.

The best final test is simple: a user should be able to work faster and make fewer interpretation mistakes, while being only vaguely aware that the interface feels “cleaner.” That is the kind of polish worth reusing.
