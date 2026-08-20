# Admin portal redesign plan

Status: **ready for execution**. This is the concrete work order for the UX/IA redesign of the Admin portal (Конструктор): `admin/*.html` + `apps/admin/`. Admin is the platform the canon was distilled *from*, so this pass is not "bring it up to canon" — it is fixing the information architecture, layout, and consistency debt that survived the polish passes, plus removing the places where admin now violates its own rules. Every task states change-X-to-Y with file anchors.

**How to use this plan (read this first, agent):**

1. Read [docs/design-guide.md](design-guide.md) in full before touching anything. Every task cites the § or rule it implements; the guide holds the reasoning, this plan holds the target state.
2. Work the phases **in order** (see "Sequencing" — some phases can run in parallel). Phase 0 restructures the stylesheet that everything else edits.
3. One phase = one agent task = one reviewable commit (or small commit series). Do not mix phases in one diff.
4. Definition of done for every phase: `npm run lint:design-system` passes, admin-scoped tests pass (the repo has ~20 pre-existing non-admin test failures — scope your check to what you touched), plus the §11 review of the guide.
5. Where an existing admin pattern turns out to be *better* than a rule here, follow §0 of the guide: change the rule in `design-guide.md` and the code in the same commit, with reasoning. Do not silently deviate.
6. The `bp-bar` blueprint toolbar (`data-dev-only`) is dev chrome — leave it untouched in every phase.

**The codebase in one paragraph:** Admin is seven separate documents sharing one stylesheet and one shell module. Pages: `index.html` (dashboard, rendered by `apps/admin/js/dashboard.js`), `services.html` (registry: static rows + `service-drafts.js` + a hero card from `lowcode.js`), `new-service.html` (4-step wizard, inline script), `builder.html` (full-screen 3-column service editor: pipeline rail / editor panes / phone preview; large inline script + `service-form-binding.js`), `review.html` (queue + detail, fully rendered by `lowcode.js`), `forms.html` + `form-builder.html` (form library and full-screen form editor, `forms.js` + `forms-data.js`). `apps/admin/js/builder.js` builds the shared shell on every page (`.ekh-side` rail via `BLD_NAV`, profile popover, i18n sweep with `builder-i18n.js`). `apps/admin/js/lowcode.js` is the demo workflow state machine (roles, statuses, comments, audit) persisted in `localStorage`. `apps/admin/app.css` (2 732 lines) is layered archaeology: legacy citizen-blueprint blocks, an early admin layer, and successive polish layers that override each other. Reference implementation to preserve: `admin/services.html` reads as the product baseline; `admin/forms.html` is the closest page to target state.

---

## Phase 0 — Stylesheet consolidation: collapse the strata, delete the dead layers

**The problem.** `app.css` contains three successive definitions of the same components, written as override layers instead of edits. `.reg-stats` is defined three times: line 1257 (separate cards, gap `--s-3`), line 1688 (a joined strip: `gap:0`, container border, internal dividers — the pattern §3 explicitly *retires*), and line 2542 (separate bordered cards again — the final canon). `.adm-body` is defined at line 999 (`max-width:1240px; padding:--s-8`) and again at 1587 (`max-width:1360px; padding:--s-6` — the §5 canon values). `.lc-review-grid` at 1792 and 2146; `.lc-actionbar` at 1798 and 2165. A reader (or the next agent) cannot tell which rule wins without simulating the cascade. On top of that, the file still carries whole citizen-blueprint sections that no admin page renders.

**Task 0.1 — One definition per component.** For every class defined more than once in `app.css`, merge into a single definition holding the final computed values, at the position of the *first* declaration; delete the later strata. Known multi-definitions to collapse (verify with `grep -n '^\.<name>' app.css` for each): `.reg-stats` (+ its `.stat` children and the border-juggling responsive rules at 1804–1817 that only made sense for the joined strip), `.adm-body` (999 vs 1587 — keep 1360px / `--s-6`), `.svc-row`, `.lc-review-grid`, `.lc-actionbar`, `.panel`/`.panel-h`. The rendered result must be pixel-identical before/after (screenshot-compare all seven pages, both themes).

**Task 0.2 — Delete dead legacy blocks.** Only the seven admin pages load `app.css` (verified: no other HTML references it). The citizen-blueprint sections — `.hero*`, `.cats`/`.cat`, the standalone `.search` (line 106, not `.at-search`), `.feed-grid`/`.frow`, `.catpage`, `.j-prog`, `.s-list`, `.docs`, `.wallet*`, `.prof*`/`.pane`, `.ft-grid`/`.ft-brand`, `.cert*`, `.cal` — are leftovers from the retired blueprint index. Also `.admin-overview .gx-*` (lines 1594–1603) styles markup `dashboard.js` no longer emits (it renders `.dashboard-head`, not `.gx-hero`); keep `.admin-overview{padding-top:var(--s-8)}` (1593) — that class is live on `index.html:39`. **Caution:** grep each candidate across `admin/*.html`, `apps/admin/js/*.js` *and* string-composed class names before deleting; `legacy/` pages do not load this file, so they are not a consumer.

**Task 0.3 — Audit shared-class redefinitions (§1.10).** `app.css` extends design-system names in places (`.modal.wide{max-width:480px}` at 870, `.opt`, `.seg`, `.tile` sizing). For each: if it is a *composition* tweak scoped to admin, keep it under an admin-scoped selector; if it re-declares properties `design-system/css/components.css`/`patterns.css` already sets for the same name, delete the redeclaration or promote the better value into the design system (rule 21).

**Task 0.4 — Inline styles into classes.** `builder.html`, `services.html`, and `new-service.html` sprinkle `style="width:38px;height:38px"` / `style="width:20px;height:20px"` on every `.tile`, plus one-off margins (`style="margin-top:var(--s-4)"`, `style="max-width:320px"`, `style="margin-bottom:0"` …). Add size modifiers once (`.tile--m` 38/40px, `.tile--s` 30/34px, with the svg size set by the modifier) and named spacing classes in the composition layer; strip every `style="` from the three pages except values computed at runtime.

**Acceptance:** `app.css` reads top-to-bottom with one definition per class; file shrinks substantially (target ≥ 25%); all seven pages pixel-comparable before/after in light+dark; lint passes.

---

## Phase 1 — Shell and navigation IA

**The problem.** Three shell defects repeat across pages. (1) **The demo role switcher renders twice on the dashboard** — once in the top-bar `#adminRoleSlot` (filled by `lowcode.js:267`), once inside the page header (`dashboard.js:92–93,128`) — two controls for one fact (rule 6/7); `review.html` meanwhile has an *empty* `.at-right` and puts its role select inside the page header instead. (2) **"Хизмати нав" is a task parked in permanent navigation** (rule 45): creating a service is an occasional action launched from the registry, yet it owns a sidebar destination, while `forms.html` already models the right pattern (header quiet-pill "Шакли нав", no rail item). (3) **The theme contract splits mid-console:** `services.html:2` and `forms.html:2` are pinned `data-system-theme` (follow the OS), while the other five pages honor `ekh.preferences.theme` — navigating services → form-builder can flip the whole UI from dark to light (observed live). §7 says theme is applied before first paint; it does not say "per page".

**Task 1.1 — One role control, in the top bar, everywhere it applies.**
- `review.html:27`: change `<div class="at-right"></div>` to `<div class="at-right"><div class="adm-role-slot" id="adminRoleSlot"></div></div>` — `lowcode.js renderRoleControl()` already fills any `#adminRoleSlot` it finds.
- `dashboard.js`: delete `roleSelect()` (92–94) and its call in `render()` (128); delete the now-unused `role/author/reviewer/admin` COPY keys. `dashboard-head` keeps only the `h1`.
- `lowcode.js renderReview()` (331): remove `${roleSelect()}` from the `lc-review-head` header markup.
- `builder.html`'s compact role select is handled in Phase 5.1.

**Task 1.2 — Move "New service" from the rail to the registry header.**
- `apps/admin/js/builder.js` `BLD_NAV`: delete the `["new","Хизмати нав","i-plus"]` entry (keep `BLD_HREF.new` — the wizard page still exists).
- `services.html:35`: change `<div class="adm-h"><h1>…</h1></div>` to the `forms.html:32–35` pattern — `<div class="adm-h"><div class="row"><div><h1>Хизматрасониҳо</h1></div><a class="btn services-create-action" href="new-service.html">+ Хизмати нав</a></div></div>` (quiet pill per §3 page header: this is now legitimate because the sidebar no longer carries the destination).
- `new-service.html:27`: change `data-active="new"` to `data-active="services"` — the wizard is a child of the registry, and the rail should show where you are in the IA.
- Localize the new header action in RU/TJ (`builder-i18n.js` sweep covers static text; verify).

**Task 1.3 — One theme contract for the whole console.** Read `docs/decisions.md` first (the pinning was a deliberate decision — understand it before undoing it, and update the decision record in the same commit). Target state: all seven pages use the same pre-paint boot as `index.html:8` (query override → stored `ekh.preferences.theme` → OS), and `data-system-theme` is removed from `services.html:2` and `forms.html:2`. The profile popover's three-state theme control then behaves identically on every page. Acceptance: navigate all seven pages in sequence with a stored theme that differs from the OS — no page flips.

**Task 1.4 — Review page state in the URL (§7).** `lowcode.js` keeps `reviewTab`, `reviewAgency`, `selectedServiceId`, `reviewQuery` in module state only — F5 on a detail view lands back on the list. Sync `?tab=`, `?agency=`, `?service=` via `history.replaceState` and restore on load, allow-listing values against `tabsForRole()` ids and `SERVICE_RECORDS` ids (ASCII slugs — clean under the §7 privacy rule). Leave the free-text query out of the URL, matching services.html.

**Task 1.5 — Live sidebar counts.** `BLD_NAV` hardcodes review "3" and forms "4". Derive them: review = count of records whose workflow status is actionable for the current role (export a selector from `lowcode.js`, see Task 2.2), forms = `getForms().length`. A count that never changes when the state machine moves reads as a bug in a demo.

**Acceptance:** exactly one role control per page; rail has four destinations (Лавҳаи идора / Хизматрасониҳо / Санҷиш ва нашр / Шаклҳо) + counts that track state; theme stable across navigation; review survives reload.

---

## Phase 2 — Dashboard (`index.html` + `dashboard.js`)

**The problem.** The dashboard is chrome-heavy and data-light. "Вазифаҳои баррасии ман" shows exactly **one hardcoded row** while the rail badge says 3 — the panel is mostly air, and its data never reacts to the state machine the rest of the demo runs on. The SLA panel spends full `table` chrome (4 columns, header row) on two rows. Three feed panels sit side by side with **two items each** — three panel heads for six facts. The bottom "Конструктор" quick-actions row duplicates the sidebar (rule 7) and its "Муҳаррири шакл" button even links to the *wrong page* (`builder.html`, the service editor — `dashboard.js:122`). The COPY dict carries a `lead` sentence that `render()` never outputs.

**Task 2.1 — Delete the duplicates.** Remove `quickActions()` (121–123) and its call in `render()`; remove the dead `lead`, `quick`, `registry`, `newService`, `editor` COPY keys. (The role-select duplicate is already gone via 1.1.)

**Task 2.2 — Make "My review tasks" the real queue.** Export from `lowcode.js` a selector `getReviewQueue(role)` returning `SERVICE_RECORDS` + their workflow state filtered by role (reviewer: `in_review`+`resubmitted`; portal-admin: `approved`; agency-author: `changes_requested`). Rewrite `reviewPanel()` to render every returned row (cap 5): `status-icon` + `<strong>` name + small `agency · vN · submittedAt` + chevron, each row an `<a href="review.html?service=<id>">` (works with Task 1.4). Panel-head count = real length. Empty state per §6 (what happened / is it good / next step) using the existing `empty` copy + the role hint moved here from review.html (Task 6.6). Rows follow §5 casebook 2's dashboard-card geometry (island reserved in the box model, hover only paints).

**Task 2.3 — SLA violations as glanceable rows, not a table.** Replace the `data-table` in `slaPanel()` with list rows: bare amber `i-clock` glyph (2px stroke — §6 icon fills: no circle in dashboard-card rows), `<strong>` service — small agency · stage, right-aligned red `tabular-nums` overdue value. Two rows do not earn four columns of table chrome; the row anatomy holds if the demo data grows. Keep the panel-head danger count.

**Task 2.4 — One activity feed instead of three thin panels.** Replace `feedPanels()`'s three-panel grid with **one** panel "Навсозиҳои корӣ": the existing three tabs (`.dashboard-feed-tabs` — today mobile-only, `app.css:1645/1675`) become the visible view switcher at **all** widths, plus an "Ҳама" tab that interleaves all events chronologically (default). Merge the three CONTENT feeds into one typed event list (6–8 demo events): each row = bare glyph by type (`i-history` change / `i-check`·`i-x` test / `i-arrow-ur` publication), title, small meta, timestamp. Delete `.dashboard-feeds` 3-col grid and the per-panel heads. Rationale: §2 frequency map — "what changed recently" is one scanning task, not three; six facts under three headings is header overhead.

**Task 2.5 — Rebalance `dashboard-primary`.** With real rows in the tasks panel, set `grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)` (tasks panel is now the denser one) and re-check the ≤1180px fold.

**Acceptance:** dashboard = header / KPI row / tasks+SLA / activity feed — nothing else; switching the role in the top bar visibly changes the tasks panel; every number on the page is derived from state or named demo data, none hardcoded twice.

---

## Phase 3 — Services registry (`services.html`)

**The problem.** (1) A **hero card for one service** (`lc-service-card`, rendered by `lowcode.js renderRegistry()` into `#lowCodeRegistry`, `services.html:37`) sits between the h1 and the KPI row — a second h2-level composition advertising a single record on a browse page, pushing the actual registry below the fold. (2) The registry rows have **no column headers** while `forms.html` has them — the numbers ("5 майдон", "12,00 смн.") float unlabeled; and the row uses a *nested* grid (`.svc-row` 3 tracks, `.cols` 4 sub-tracks, `app.css:1705–1710`), so a header row *couldn't* align to it. (3) The **audience column is empty on 7 of 8 rows** — only the first row carries a chip; the rest render `<span class="svc-audience" aria-hidden="true"></span>` placeholders (`services.html:78+`), a column that mostly displays nothing.

**Task 3.1 — Demote the hero card to a registry row.** Rewrite `renderRegistry()` to emit a normal `.svc-row` (same anatomy as the static rows: name, `Вазорати адлия · шахси воқеӣ · SVC-JUS-014`, metrics, `status-icon` from `statusBadge()`) with `data-status` mapped from workflow state and `href` = `builder.html` while editable / `review.html?service=ngo-registration` otherwise. Move the `<section id="lowCodeRegistry">` mount point inside `#serviceRegistry`, directly above `#createdServiceRows`, so the demo service is simply the first (live) row of the list and the existing search/status filter script picks it up (`data-status` + text match already work on `.svc-row`). Delete `.lc-service-card` CSS.

**Task 3.2 — Flatten the row grid and add a header row.** Define once on the panel: `#serviceRegistry{--svc-row-columns:minmax(0,1.6fr) 96px 88px 104px 148px 44px}`. `.svc-row` becomes a single grid on `var(--svc-row-columns)` (delete the nested `.cols` wrapper from markup and CSS). Add a header row above `#createdServiceRows` using the same variable (the `forms.html:56–61` `.form-library-head` pattern): `Хизмат / Аудитория / Майдонҳо / Нарх / Таҳрир / Ҳолат` — `--fs-13`, 500, `--ink-3`, sentence case. Identity column left, all other columns **centered** incl. their headers (§5, rule 41); `tabular-nums` already applies platform-wide. Promote the "library list header" pattern into `design-system/` (rule 21 — this is its second consumer after forms) and update `styleguide.html` + `docs/admin-component-map.md`.

**Task 3.3 — Audience for every row.** Add `data-audience` to all rows (the facts exist in each row's `.k` line) and render icon-only audience badges (the `audienceBadges(…, iconOnly=true)` anatomy from `lowcode.js:233`: `role="img"` + localized `aria-label` + `title`) in the audience cell of every row — or, if the cell would repeat "шахси воқеӣ" on 7 of 8 rows, keep icons only where audience differs from the person-only default and leave a quiet "—". Decide by the crowded-screen test (§2.1); do not ship the current empty-placeholder state.

**Task 3.4 — Drafts rows match.** `service-drafts.js` renders created drafts into `#createdServiceRows` — update its row template to the flattened `--svc-row-columns` anatomy in the same commit as 3.2 (two templates, one grid).

**Acceptance:** services.html = h1 + "Хизмати нав" pill / KPI shortcut row / one registry panel with header row where every cell sits under a label; the demo service is a row, not a hero; no empty placeholder cells; status filter + KPI shortcuts + search still work on all rows including the demo and drafts.

---

## Phase 4 — New-service wizard (`new-service.html`)

**The problem.** (1) **Step 4's primary action skips the service builder entirely**: "Сохтани шакл" jumps to `form-builder.html`, and there is no path from the wizard to `builder.html` — the tool the console is named after. The object model this teaches is backwards: the service *process* is the product; the form is a library dependency attached from the builder's "Шакли дархост" step. (2) Step 3 is a flat 9-field column (names, org, category, icon picker, audience, SLA, price) with no internal structure — the longest screen in the flow reads as one undifferentiated list. (3) After "Захира ҳамчун сиёҳнавис" the user stays on the wizard with only a toast — no visible result of the task they just completed.

**Task 4.1 — Re-point the step-4 actions.**
- Primary (`btn-pri`): **"Кушодани конструктор"** → `builder.html?source=<method>&service=<code>&lang=…&theme=…` (builder already consumes `source`/`service` — `builder.html:592–611`).
- Secondary (`btn-sec`): "Захира ҳамчун сиёҳнавис" stays, but on success navigate to `services.html?status=draft` so the new draft row is the visible outcome.
- The form path does not disappear — it moves to where the dependency lives: the builder's "Шакли дархост" pane already offers "Интихоби шакл" and the picker's footer links the form library. Delete `#createServiceForm` from step 4 (and the `setFormHref` wiring that maintains it).
- Update `rvProcess` copy if it referenced the form step.

**Task 4.2 — Section step 3.** Insert three `.edit-sub`-style subheads (13px, sentence case — the builder pane pattern): **"Ном ва идора"** (name TG, name RU, responsible org), **"Намоиш дар феҳрист"** (category, icon+color picker with its help lines), **"Шароит"** (audience, SLA, price+amount). No field changes, no reordering beyond grouping; the step becomes scannable at its crowded state (§2.1).

**Task 4.3 — SLA as a bounded choice.** Replace the free-text `#sla` input (`value="1 рӯзи корӣ"`) with the canon labeled select (§3 filters anatomy without the filter icon): options `2 соат / 1 рӯзи корӣ / 3 рӯзи корӣ / 5 рӯзи корӣ` + "Дигар…" revealing the text input. A duration typed as prose can't be validated or compared; the builder's route pane shows the same value later.

**Acceptance:** wizard ends in the constructor (primary) or in the registry showing the saved draft (secondary); step 3 has three titled groups; copy-method flow and dynamic step renumbering unchanged; RU/TJ pass.

---

## Phase 5 — Service builder (`builder.html`)

**The problem.** (1) **Two stacked toolbars** (~100px of chrome): `.bld-top` (back / name / status / preview / save / send / publish) and the `lowcode.js` collaboration strip (version+Stage / audience checkboxes / comments count / role select / review link). Audience is *service configuration* living in permanent chrome; version and comments are status facts split from the status icon they belong with. (2) After the wizard, **service metadata has no editing home**: name is TG-only in the toolbar input, category/audience/SLA/icon are set once in the wizard and never editable again. (3) The pipeline rail violates rule 22 in the canon's own house — **every one of the 12 `.stg` items carries a subtitle** ("аз феҳристҳо · «як бор»" …), and the rail header says "7 қадам" above 12 items. The `stg-dot warn` on "Баррасӣ ва масъул" is a color-only signal (§9). (4) The page still ships a **dead second field composer**: a hidden `#fbList`/`#addField` block (`builder.html:141`) plus `#paletteModal` (538–558) kept alive only so the inline script's `fields` array can feed the phone preview and the publish checklist — while the visible UI says fields come from the attached library form.

**Task 5.1 — One toolbar.** Delete the `.lc-builder` strip markup from `renderBuilder()` (`lowcode.js:254–260`; keep the function's status-icon/button-state syncing). Redistribute its contents:
- Version + Stage: a quiet metachip `v1.0 · Stage` in `.bld-name`, after the status icon (they are one fact cluster: what am I editing, in what state).
- Comments: a ghost icon-button with count next to the metachip; clicking opens the comment thread as a popover (reuse `commentsMarkup()`, `--raised` + `--shadow-1`, grows from trigger per §8).
- Role select (demo chrome): compact variant at the far right of `.bld-top`, before `.hdr-acts` — the builder has no rail, so the toolbar is its role-slot equivalent.
- "Санҷиш ва нашр" link: delete — `#approveBtn` already routes work into review, and review is one rail-click away on every non-editor page (rule 7).
- Audience checkboxes: move into the new pane (5.2).

**Task 5.2 — New pane "Маълумоти хизмат".** Add a 13th tab, first under "Кабинети хизмат" (icon `i-doc` or `i-building`): an `edit-pane` with name TG (synced two-way with the toolbar input) + name RU, category select, audience checkboxes (dispatching `SET_AUDIENCE` so the registry card and review metadata stay live), SLA display/edit, and the icon+color tile picker from the wizard. This is the post-creation home for everything wizard step 3 set. Admin-mode pane (no phone preview), like rules/templates.

**Task 5.3 — Pipeline rail to titles-only.** Delete the `<span>` subtitle from all 12 `.stg` items (rule 22 — the pane header's kick/h1/p already carries the detail). Replace the `pipe-h` hint "7 қадам" with nothing (the three group labels already structure the rail). Replace `.stg-dot.warn` with a visible count-style badge (`.stg-n` anatomy, amber tint) carrying `title` + `.sr-only` text "талаб мекунад диққат" — state must survive without color (§9).

**Task 5.4 — Single source of truth for fields: the bound form version.** Rewire the citizen preview and the publish gate to read `service-form-binding.js`'s selected version instead of the dead local `fields` array: `#pvFields` renders the bound version's fields (the `previewField()` renderers move to consume that shape), `#stgFieldsCount`/`#pubFields` show its field count, and the checklist item "Майдонҳои шакл пур" becomes "Шакли нашршуда пайваст аст" checking that a binding exists. Then delete: the hidden `#fbList` block (`builder.html:141`), `#paletteModal` (538–558), and the composer half of the inline script (field CRUD, drag-and-drop, palette handler — roughly lines 616–875). The field-composer *code* is not lost: Phase 7.2 ports its features into the form editor, where fields are actually edited now.

**Task 5.5 — Control convergence (§3 / rule 14).** `#dCost` and the "Тартиб" order choice use the retired `.seg` for binary form choices → convert both to `.cost-options` tappable cards (the wizard's pattern, `new-service.html:148`). `#tplChan` (Push/Email/SMS) is view switching → convert to the `.ml-tabs` tab anatomy already used for languages right below it. `#rollMode` (Ҳама/Canary/Хомӯш) → `.cost-options` 3-up. After this, `.seg` should have zero admin consumers — delete its admin CSS layer.

**Acceptance:** one toolbar ≤ 60px; every wizard-step-3 fact editable in "Маълумоти хизмат"; rail items are single-line; preview fields, field counts, and the publish checklist all change when a different form version is bound; no `.seg` on the page; keyboard walk of the new comments popover (open/Escape/focus return) works.

---

## Phase 6 — Review & publish (`review.html` + `lowcode.js` review renderers)

**The problem.** (1) **The detail view stacks three headline compositions**: the page header (h1 "Санҷиш ва нашр" + lead) stays mounted, below it `lc-detail-head` renders the service name as an h1, and directly under that `lc-overview-banner` repeats the *same service name* as an h2 with a decorative gradient and a logo mark (rules 4/6: subtitle restating, two representations). (2) The queue's "Хизматро сохт" cell packs creator + createdAt while the next column is another date (submittedAt) — two near-identical timestamps per row with ambiguous headers. (3) The agency filter is a bare select, not the §3 labeled-dropdown anatomy, and the queue search lives in the panel while every sibling page puts list search in the top bar. (4) The service overview prints **"Майдони ҳатмӣ" under every field unconditionally** (`serviceOverviewMarkup`, `lowcode.js:309`) — including optional ones: displayed misinformation. (5) Sections carry decorative "01"/"02" numbered eyebrows. (6) An always-on role-hint banner (`lc-review-context`) restates what the lead and tabs already say.

**Task 6.1 — One heading per view.** In `renderReview()`: when `reviewView==='detail'`, do not render the `lc-review-head` page header — the view is back-link + detail head. Merge the banner into the detail head: h1 = service name; meta line = `statusBadge` + `vN` + agency; description as the paragraph (replacing the generic "Хизмат пеш аз нашр чунин менамояд…" hint). In `serviceOverviewMarkup()`, delete `lc-overview-banner` entirely (name, description, gradient, `lc-overview-mark` logo) — the overview panel now opens with the `lc-facts` grid.

**Task 6.2 — Queue columns say one thing each.** Rename headers: "Хизматро сохт" → "Муаллиф"; drop the `createdAt` small from the creator cell (`queueRowMarkup`, `lowcode.js:304`) — submission time is the queue-relevant date and has its own column. Hoist the literal grid values (`app.css:2354`, repeated at 2470/2478) into a `--queue-columns` custom property redefined per breakpoint (rule 18 hygiene). Center the non-identity columns and their headers (rule 41) — today they're left-aligned.

**Task 6.3 — Canon filter + top-bar search.** Rebuild the agency select with the labeled-dropdown anatomy (`services.html:51–64` / shared `.ekh-filter`): icon + "Идора" label + bordered field + sprite chevron + `:focus-within` ring; sync to `?agency=` (Task 1.4). Move the queue text search into the top bar: add `.at-search` to `review.html:26` (copy `services.html:28`), wire it to `reviewQuery`; delete the in-panel search field. The panel toolbar keeps: title, result count, agency filter.

**Task 6.4 — Truthful required marks.** Add `required` flags to the `fields` arrays of `land-extract`, `construction-permit`, `family-certificate` in `SERVICE_RECORDS` (`lowcode.js:121,126,131`), and render the `<small>` in `serviceOverviewMarkup` only when `field.required` (optional fields get "ихтиёрӣ" in `--ink-3`, or nothing).

**Task 6.5 — De-decorate section headings.** Remove the "01"/"02" numbered eyebrows from `lc-section-heading` (keep the plain h3 titles); remove the "Workflow"/"Review" English eyebrows in the sidebar/timeline headings — they are labels in a third language on an RU/TJ surface (localize or delete; deleting is cleaner, the h3s name the sections).

**Task 6.6 — Hint into the empty state.** Delete the standing `lc-review-context` row from the list view; `roleHint()` copy becomes the body of the queue's empty state (and the dashboard tasks-panel empty state, Task 2.2). Guidance appears when there is nothing else to look at, not above a full queue.

**Acceptance:** detail view = back / one h1 with meta / overview panel starting at facts / sidebar / timeline / sticky action bar; queue has one date column and one author column; reload restores tab+agency+open detail; search sits in the top bar on all three list pages; a11y pass on the rebuilt filter (keyboard + labels).

---

## Phase 7 — Forms library & form editor (`forms.html`, `form-builder.html`, `forms.js`)

**The problem.** (1) The editor canvas opens with a permanent onboarding block — eyebrow "Муҳаррири мустақили шакл" + h1 "Таҳрири шакл" + lead (`form-builder.html:46–50`) — while the top bar already names the form, code, version, and status; the first ~140px of the workspace orient nobody after the first visit. (2) **Every field card renders fully expanded** (`renderEditorFields`): with 6+ fields the canvas is a wall of repeated inputs, and reordering means scrolling past every card's body. Meanwhile the *deleted* builder composer (Phase 5.4) had the right anatomy — collapsed rows, drag-grip, and richer per-field features (help text, format masks, EN label, conditional visibility) that the library editor lost in the migration. (3) The version rail hides the changelog: `forms-data.js` stores a `note` per version ("Суроғаи почтаи электронӣ илова шуд") that no UI displays. (4) `forms.js:220` calls `setText('previewLive',…)` against an element that doesn't exist in the markup.

**Task 7.1 — Delete the editor intro.** Remove `.form-editor-intro` and its COPY keys (`editorEyebrow`, `createTitle`, `editTitle`, `editorLead`). The canvas begins at the "Маълумоти шакл" panel. The "independence" concept lives where it's actionable: the version rail's help line already states it.

**Task 7.2 — One field composer, collapsible, feature-complete (rule 21).** Extract the builder's composer into `apps/admin/js/field-composer.js` and consume it in `forms.js`, replacing `.independent-field`:
- Collapsed row = number, type glyph (bare, no tile — §6), label `<b>`, meta line (type · ҳатмӣ/ихтиёрӣ · N вариант · шартӣ), actions (↑ ↓ delete) + expand toggle with `aria-expanded`; one card open at a time; newly added field opens focused (the `just-added` flash from the builder script).
- Drag-grip reorder ported (grip-initiated dragstart/over/drop, keyboard ↑↓ as fallback).
- Expanded body gains what the library editor lost: help-text input, format select (`free/num/inn/phone/date/email` masks), a third **EN** label tab with the "заминавӣ" fallback marks, and conditional visibility (show-if field = value) — all lifted from the builder script being deleted in 5.4, adapted to the `{label:{tg,ru,en}, options:{tg,ru}}` data shape of `forms-data.js` (extend the shape; `saveDraft`/`publishDraft` clone whatever is passed).
- Live preview (`previewControl`) renders help text, format placeholder, and the conditional note.

**Task 7.3 — Version rail shows the changelog.** In `renderVersionList` add the version `note` as the row's second line (12px, `--ink-3`, single line ellipsis with full text in `title`); selected version's `vN` at weight 600 (§4: state earns weight — today selection is border-only).

**Task 7.4 — Live badge, wired or gone.** Either add `id="previewLive"` as a green "зинда" metachip in the preview heading, shown only when the open version is the live one (makes the dead `setText` call real and tells the editor they're looking at what citizens see), or delete the call. Prefer wiring it — the read-only/live distinction is the page's central concept.

**Task 7.5 — Library page: no layout change.** `forms.html` is the target state the other pages converge to (header action, KPI shortcuts, header row sharing `--form-row-columns`, version strips per rule 26). Only follow-through here: confirm the header-row pattern promotion from Task 3.2 replaces `.form-library-head` with the shared component.

**Acceptance:** editor canvas = details panel → fields section → (rail | preview); ten-field form is scannable collapsed and reorderable by drag; a field's help/format/condition round-trips through save → publish → service binding preview (builder.html Phase 5.4 view); version notes visible; no dead DOM calls.

---

## Phase 8 — Cross-page sweep and verification

**Task 8.1 — Measure the roles (§11).** `getComputedStyle` on every page: page titles 28/600, pane/step headings 24/600, panel titles 17/500 one line, row titles 14/500, micro-labels 13 sentence case; `h1.getBoundingClientRect().left` identical on index/services/review/forms (the `.adm-body` edge — one number after Phase 0 collapsed the container definitions).

**Task 8.2 — Localization pass.** Every string added by Phases 1–7 exists in TG + RU (module COPY dicts) and is reachable by the `builder-i18n.js` sweep where static; `aria-label`s localized including both states of stateful controls (§9); layouts tested in the longer language.

**Task 8.3 — Docs follow the code.** Update `docs/admin-component-map.md` and `design-system/styleguide.html` for every promoted component (list header row, field composer, any popover work); add new §10 decision rows to `design-guide.md` for anything this redesign settled that the guide lacked (candidates: "demo role switcher lives in the top-bar role slot"; "wizard primary action opens the object's editor"); append the commits to the guide's Appendix evidence table.

**Task 8.4 — Test baselines.** `qa/visual` screenshots will legitimately change on all seven pages — regenerate baselines page by page *after* each phase's review, never wholesale at the end. Add functional coverage for the new invariants: one role control per page, review URL restore, publish gate reading the form binding, wizard step-4 destinations.

---

## Shared-component promotions (tracked across phases)

| Component | Born in | Promoted by | Consumers after |
| --- | --- | --- | --- |
| Library list header row (`--*-columns` shared with rows) | forms.html | Task 3.2 | services, forms (+ review queue head via 6.2 alignment) |
| Field composer (collapsed rows, drag-grip, 3-lang, formats, conditions) | builder.html inline script | Task 7.2 | form-builder (builder consumes its *output* via binding) |
| Glanceable alert/feed row (bare glyph, island-in-box-model hover) | design-guide §5 casebook 2 | Tasks 2.3/2.4 | dashboard tasks, SLA, activity feed |

Rule 21 applies to each: `design-system/` home, `styleguide.html` entry, Figma map row.

## Sequencing and dependencies

```
Phase 0 (stylesheet)  ──►  Phase 1 (shell/IA)  ──►  Phases 2, 3, 4 in parallel
                                                        │
                                        Phase 5 (builder) ──► Phase 7 (needs 5.4's composer hand-off)
                                        Phase 6 (review)  — independent after 1
                                                        │
                                                  Phase 8 (sweep)
```

- 0 before everything: later phases edit classes 0 deduplicates.
- 1 before 2/3/6: they assume the single role control and URL params.
- 5.4 before 7.2: the composer code moves, it must not exist twice.
- 3.1 and 2.2 both touch `lowcode.js` exports — if run in parallel, coordinate the selector signature first.

## Verification (every phase)

```bash
npm run lint:design-system   # §1 — non-negotiable
npm test                     # scope review to admin files; ~20 pre-existing non-admin failures exist
npm run test:a11y
npm run test:visual          # regenerate admin baselines intentionally, per phase
```

Then the §11 designer/engineer review: 1440 (rail expanded + collapsed) / 960 / 620, short viewports, light+dark, RU+TJ; side-by-side with `admin/services.html` — after this plan, every admin page should read as the same product *and* put the user's next action within one glance of the h1.
