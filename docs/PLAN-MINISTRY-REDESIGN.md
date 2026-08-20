# Ministry redesign plan

Status: **executed** (phases 0–8 landed as commits `6ca9076` → `c3f42d1`; see the closing note at the end of this file). This is the concrete work order for bringing the Ministry workstation (`ministry/index.html` + `apps/ministry/`) up to the canon in [docs/design-guide.md](design-guide.md). It implements §12 of the guide ("Platform handoff — Ministry") as specific change-X-to-Y tasks.

**How to use this plan (read this first, agent):**

1. Read [docs/design-guide.md](design-guide.md) in full before touching anything. Every task below cites the § it implements; the guide holds the reasoning, this plan holds the target state.
2. Work the phases **in order**. Phase 0 restructures the stylesheet everything else edits — starting a later phase first means restyling code Phase 0 deletes.
3. One phase = one agent task = one reviewable commit (or small commit series). Do not mix phases in one diff.
4. Definition of done for every phase: `npm run lint:design-system` passes, the Ministry-scoped tests pass (see "Verification" at the end — the repo has ~20 pre-existing non-Ministry test failures; scope your check to what you touched), plus the §11 review of the guide.
5. Where a Ministry pattern turns out to be *better* than the canon, follow §0 of the guide: change the rule in `design-guide.md` and the code in the same commit, with reasoning. Do not silently deviate.

**The codebase in one paragraph:** Ministry is a single-document SPA. `ministry/index.html` (22 lines) loads `design-system/global.css`, then `apps/ministry/app.css` (~2 900 lines), then `apps/ministry/js/app.js` (~1 940 lines, plain DOM + event delegation, all screens rendered as template strings) and `apps/ministry/js/data.js` (demo data + RU/TJ i18n dictionary). Views: login → queue / all / overdue (one renderer `viewQueue`), application card `viewCard`, interop journal `viewInterop`, reports `viewReports`, forms library `viewForms`, form builder `viewFormBuilder`, plus a lock screen (`doLock`), notification popover (`openNotif`), user popover (`openUser`), and modals (decide / return / request / batch). Reference implementations to converge toward: `admin/services.html` (+ `apps/admin/`) and the TSON workstation (`apps/tson/js/shell.js`, `apps/tson/js/screens/locked.js`).

---

## Phase 0 — Stylesheet foundation: delete the forked component library

**The problem.** `apps/ministry/app.css` is two files glued together. Lines ~1–1857 are a **copied component library from the ЦОН-era codebase** (its own header literally says "components.css — библиотека компонентов"). It re-defines classes the design system already owns — `.btn`, `.field`, `.otp`, `.modal`, `.overlay`, `.popover`, `.menu`, `.banner`, `.toast`, `.seg`, `.chip`, `.panel`, `.tabs`, `.empty`, `.def`, `.check__input`, `.radio__input`, `.sw`/`.knob`, `.ring`, `.doc-thumb`/`.doc-page`, `.stepper`, `.meter` — on top of `design-system/css/components.css` and `patterns.css`, which define the same names. This is exactly the §1.6 ("no copied foundations") and §1.10 ("one definition per class name") failure the guide warns spreads silently: the two rule sets interleave, and whatever the fork forgets leaks in. The Ministry-specific composition layer only starts at line ~1859 ("app.css — прикладной слой").

**Task 0.1 — Converge every shared class.** For each class defined in both `apps/ministry/app.css` and `design-system/css/*.css`: diff the two definitions; delete the Ministry copy and consume the shared one; where the Ministry version is genuinely better, promote that improvement into `design-system/` (with a `styleguide.html` entry, per §1.9 / rule 21) and still delete the copy. Verify each converged component visually in both themes before moving on — the fork currently masks whatever the shared definition would paint.

**Task 0.2 — Delete dead ЦОН screens.** The copied block contains entire screens Ministry never renders: `.qr*`, `.s-catalog__*`, `.s-consent__*`, `.s-data*`, `.s-docs*`, `.drawer*`, `.interstitial`, `.check-list`/`.check-item*`, `.demo__*`, scanner/session-bar/watermark blocks, `.end__list`, `.field__picker`/`.field__unlock`/`.field--locked`, `.kbd`. Delete them. **Caution:** many class names are composed at runtime — `filter-select--{name}`, `form-status--{tone}`, `notif--{kind}`, `sla--{state}`, `stat--{mod}`, `ring--warn/--danger`, `toast--{kind}`, `modal--{type}`, `hue-*` (from `data.js` service records), `is-pending`/`is-received` — so "not found by grep in app.js" is not proof of death. Check `data.js` and string concatenations before deleting anything.

**Task 0.3 — Remove token forks.** The `:root` block at the top of `app.css` re-declares `--font`, `--fs-10`, `--fs-11`, `--fs-28` — all of which already exist in `design-system/tokens/type.css`, and the Ministry values for `--fs-10`/`--fs-11` *differ* from the token file (10px/11px vs the system's 11px/11.5px). Delete all four re-declarations and let markup take the system values. `--fs-22` exists nowhere in the token scale — §4 forbids reintroducing neighbors — so replace its two usages (`.form-preview__body h2`, `.mfb-editor__head h1` at 620px) with `--fs-20` and delete it.

**Task 0.4 — Remove the letter-spacing hammer.** Delete `body[data-platform="ministry"], body[data-platform="ministry"] * { letter-spacing: … !important }`. The token contract (`--tracking: 0`, §1.2) already covers this, and the hammer forces `patterns.css` to fight back with `html body … !important` for the logotype exception.

**Task 0.5 — Fix the typography role map (§4 table).** Measure with `getComputedStyle`, then fix the Ministry typography layer so that:
- Page titles (`<h1 class="h2">` on every view) paint **28px / 600**. Today `.h2` is mapped to `--fs-24`, so every Ministry page title is one step too small.
- Panel titles (`.h3`, `.panel__title`) paint **17px / 500** — today the blanket "headings are 600" rule forces them to 600, against the §4 table.
- Modal titles stay 20px / 600 (already correct).
- Keep numeric 550 for the in-between emphasis step, but where a value sits on the token ladder write `var(--weight-regular|medium|semibold)` (§4).

**Task 0.6 — Inline styles into classes.** `app.js` sprinkles `style="margin-bottom:var(--s-4)"`, `style="max-width:52ch"`, `style="color:var(--red-ink)"`, `style="width:100%"`, `style="padding:0"` etc. Move each into a named class in the composition layer. (Search `style="` in `app.js` — about a dozen hits.)

**Acceptance:** app.css contains only Ministry composition (target: roughly the current lines 1859+, minus what later phases delete); no class defined in `design-system/css/` is re-declared in `apps/ministry/app.css`; screenshots before/after are pixel-comparable except where a converged shared component intentionally differs; lint + Ministry tests pass.

---

## Phase 1 — Shell: top bar, preferences, profile

**The problem.** The top bar currently holds: nav toggle, brand, app title + agency, centered search, then **notification bell + language globe button + theme moon/sun button + avatar button**. §3 "Top bar" retires per-page theme toggles, language controls in the bar, and the avatar in the top bar; §3 "Global preferences" and §12 item 6 require language + three-state theme to live in the profile popover anchored to the **sidebar user card**. Theme today is a binary light/dark stored value applied in JS after boot — `ministry/index.html` hardcodes `data-theme="light"`, so a dark-theme user gets a light flash (§7: theme must be applied on `<html>` before first paint).

**Task 1.1 — Strip the top bar** (in `renderApp()`):
- Delete the language button (`data-act="lang"`), theme button (`data-act="theme"`), and avatar button (`data-act="user-open"`) from `.topbar__actions`.
- Keep: nav toggle, brand + quiet title cluster (`.topbar__bind` — brand strong, "АРМ ведомства · Минюст" in `--ink-2`; no role badge, Ministry has one role), centered search (already `min(460px, 37vw)` — correct), and the **notification bell only** on the right.
- The bell is a deliberate extension of the §3 "role slot only" rule: escalation notifications (§7Б.3) are global and per-page-relevant, which is the stated test for permanent chrome. Per §0, add one sentence to `design-guide.md` §3 Top bar row documenting the workstation notification-bell exception **in the same commit**.

**Task 1.2 — Make the sidebar user card the profile trigger.** `renderApp()` currently renders `.ekh-side__user` as a `<div>`. Make it a `<button type="button">` with `aria-haspopup` / `aria-expanded` / `aria-controls`, exactly like admin does it (`apps/admin/js/builder.js:641`). Clicking opens the profile popover (Task 1.3) anchored to the card; collapsed rail keeps the avatar as the trigger.

**Task 1.3 — Build the canon profile popover** (replaces `openUser()`):
- Anatomy per §3 "Global preferences" / §6 "Profile popover": identity card on top (name, role · agency), hairline `rule`, preferences group — **language row** = label "Язык" + current value + chevron opening a flyout with ru / тоҷикӣ as `menuitemradio` + check (NO globe icon — the label names the control), **theme row** = label + three `aria-pressed` icon choices (system `i-theme-system` / light `i-sun` / dark `i-moon`) — then hairline, then actions: **Заблокировать** (lock), **Сбросить демо** (reset), **Завершить смену** (logout).
- Reference implementations: `apps/tson/js/shell.js` — `preferencesGroup()`, `themeRow()`, `openLangFlyout()`, `openOperatorMenu()`; admin's `.adm-profile-pop` rows (`apps/admin/js/builder.js:278–297`).
- This is now the **third** hand-rolled preferences popover in the codebase (admin, TSON, Ministry). Rule 21 applies: promote the popover pattern (menu container, `menu__row`, language flyout, `menu__choices` theme triple) into `design-system/css/` + a small `design-system/js/` helper, add it to `styleguide.html`, and consume the shared version in Ministry. Refitting admin/TSON onto the promoted component is a stretch goal — flag it, don't block on it.
- Behavior contract (§6): trigger toggles open/closed, click-outside dismisses, Escape closes top layer and returns focus, flyout positions with `dd-right`, `--shadow-1` on `--raised`, grows from its trigger (`transform-origin`).

**Task 1.4 — Three-state theme through the shared preferences module.** Delete Ministry's own theme code (`S.theme`, `toggleTheme()`, the `pref('theme')` read) and adopt `design-system/js/preferences.js` (`getThemeChoice` / `setTheme` / `setLang` — it already handles system/light/dark, persistence to `ekh.preferences.theme`, storage events, and OS-change tracking). Add the pre-paint boot to `ministry/index.html` `<head>` the same way admin/TSON pages do (copy their `<head>` wiring), and remove the hardcoded `data-theme="light"` from `<html>`. Acceptance: no theme flash on reload with dark stored; "system" follows the OS live.

**Task 1.5 — Pre-login preferences gear (rule 31, §9).** The login gate currently has **no** language or theme control, but §9 requires switching language before sign-in. Add one quiet `--ink-2` icon-button (gear) at the top-right of the login canvas, `top: var(--login-chrome-inset)`, opening the same preferences group (language flyout + theme triple, no identity card). Reference: `apps/tson/js/shell.js` `preferencesButton()` + `openPreferencesMenu()`. No blue, no ghost styling (a blue gear reads as a second primary on the gate).

**Acceptance:** top bar right side = bell only; every preference reachable from sidebar user card and from the pre-login gear; theme has three states and pre-paints; language switch re-renders in place; keyboard walk (Tab / arrows / Escape) through the popover works; RU/TJ labels on every row.

---

## Phase 2 — Lock screen (rule 42)

**The problem.** `doLock()` builds its own centered card: `--r-xl`, uniform `--s-8` padding, an `h2` at page-title size, a bare unlabeled password input, and an `color-mix(ink 30%)` scrim. Rule 42 retires exactly this. Worse, **the blur is broken**: `app.js` toggles `is-blurred` on `#app` (classes `app ekh-side-shell`), but the only blur rule in app.css is `.shell.is-blurred` — a selector that matches nothing in Ministry. The workstation never actually blurs.

**Task 2.1 — Converge to the TSON lock composition.** Reference: `apps/tson/js/screens/locked.js` + §3 "Workstation lock". Concretely:
- Overlay: shell stays mounted, blurs (fix the selector — style `.app.is-blurred`), scrim uses `--overlay`; brand (logo + eKhizmat) sits top-left **on the overlay**, same position as the login gate.
- Card: `--panel`, `--r-lock` (32px), padding `--s-8` with `--s-10` on top, `role="dialog"` `aria-modal` with focus trapped inside (today Tab escapes under the blur — the lock is bypassable by keyboard).
- Contents: lock icon → one-line title at `--fs-24` / `--weight-medium` + regular-weight hint (`--s-2` between them) → the S0 floating-label password field + full-width Unlock button, both presented at `--login-scale` so they match login's painted size (Figma lock values are @2× — halve them).
- Unlock requires a non-empty password (mock-auth like TSON's `auth.reauth`); wrong/empty shows the shared `field__error` pattern. Escape must NOT dismiss the lock.

**Acceptance:** side-by-side with TSON's lock, the two read as the same component; focus cannot leave the dialog; blur visibly applies; reduced motion honored.

---

## Phase 3 — Queue / All / Overdue (`viewQueue`)

The operator's main screen. Structure is sound (KPI cards → toolbar → table → contextual batch bar); the work is convergence and de-duplication.

**Task 3.1 — Kill the duplicate search (rule 7).** The screen shows two search inputs bound to the same `S.filters.q` (top bar + toolbar). Keep the **top-bar search only** (it's the canon centered slot); delete the toolbar search field and the `renderMainKeepFocus` dual-sync logic. `/` already focuses the top search — keep that.

**Task 3.2 — SLA segmented control → labeled dropdown (rule 9).** Replace the `.seg` three-button row (Все / Приближается / Просрочен) with a third `.filter-select` ("Срок") identical in anatomy to the service and status filters. Ministry's `.filter-select` is canon-compliant (§12) — reuse it as-is. Delete the seg-click handler for `data-filter="sla"`.

**Task 3.3 — Filter state into the URL (§7).** Sync `svc`, `status`, `sla` to query params via `history.replaceState` and restore them on load from an explicit allow-list (service keys, status keys, `all|warn|breach`). **The search string `q` must never enter the URL** — it can contain an applicant's name, and the workstation privacy contract (§7 platform exception) forbids personal data in the address bar. Guard the restore path the same way TSON's router does.

**Task 3.4 — KPI cards become filter shortcuts (§3 KPI canon).** The four `statTile`s (в работе / просрочено / ждёт ответа / приоритет) are static `<div>`s. Make each a `<button class="stat">` with `aria-pressed`, wired to the state it names: просрочено → `sla=breach`; ждёт ответа → `status=info_requested`; приоритет → add a `priority` filter key (allow-listed in the URL); в работе → clears filters. `button.stat` hover/active styles already exist in the CSS — they were built for this and never wired.

**Task 3.5 — Table column alignment (rule 41, §12 item 7).** Columns today: checkbox · № · услуга · заявитель · подана · статус · SLA, all left-aligned. Keep №/услуга/заявитель left (they are read as identity text); center **подана, статус, SLA** — and make each header cell follow its column. `--q-columns` is already a single shared definition for head and rows (rule 18 satisfied — keep it that way).

**Task 3.6 — Sort affordance.** The sort chevron never flips: `is-sorted` only changes opacity/color. Rotate the chevron 180° for ascending; direction is already announced via `aria-label` — make the drawing match the announcement (§9).

**Task 3.7 — Row cleanup.** `rowQueue()` adds the service hue class (`q-row hue-indigo` …) but no rule in the row consumes hue variables — a dead decoration hook on a dense comparison row (§5 semantic colors). Remove it. Also remove the dead `.q-status__label` CSS.

**Task 3.8 — Overdue banner style (rule 40).** Keep the overdue banner (its text — "уже эскалировано руководителю" — is real information the title doesn't carry), but it must render as the outlined note canon: transparent background, `1px` border mixed from the semantic color, semantic ink, bare icon. This lands automatically if Phase 6 (banner convergence) is done; otherwise style locally and reconcile later.

**Task 3.9 — Batch bar polish.** The contextual reveal is correct (rule 45) — keep it. Replace the raw `box-shadow: 0 8px 24px -8px …` with `--shadow-1`, and add `aria-live="polite"` to the list-count element in the toolbar so filter changes are announced (§7).

**Acceptance:** reload restores svc/status/sla from URL and never shows `q` in it; one search input on screen; KPI buttons toggle with `aria-pressed` and match the URL; header cells and body cells align per column; RU/TJ, both themes, 1440/960/620.

---

## Phase 4 — Application card (`viewCard`)

**Task 4.1 — Status into the header, once (rule 6, §3).** The current card head has glyph, number, service name, category, guest/four-eyes chips — but the **status** hides as an icon-only row in the right-hand def list. Per §3 ("pills stay valid in detail headers where the status is the primary content"): add a text status pill to `card-head__meta`, and **delete the status def row** from the side panel. One representation, in the place the eye looks first.

**Task 4.2 — De-duplicate the SLA caption (rule 6).** The ring center shows remaining time; `slaCaption()` prints "Осталось <same duration> · до <datetime>". Drop the duration from the caption — caption becomes "до 21.08.2026, 14:00" (and the overdue variant keeps its red "просрочено на X"). Update `tick()` accordingly.

**Task 4.3 — Remove dead hue on the ring panel.** `viewCard` puts the service hue class on the SLA panel; nothing inside consumes it. Remove.

**Task 4.4 — Documents tab rows (rules 5, 6).** Each `doc-row` has an identical filled doc-icon tile (decoration in a dense repeated row → delete the tile, keep a bare `i-doc` glyph at most), plus the checked-state written **twice** (meta text "Проверен/Не проверен" AND a trailing status icon). Keep the trailing `.status-icon` as the single status carrier; meta line shows page count only.

**Task 4.5 — Interop tab rows (rule 6, §6 icon fills).** Each row currently has a **leading 36px tinted circle** (clock/check) AND a **trailing** status icon or spinner — two representations of one fact. Target: leading slot becomes a bare glyph (or nothing), trailing slot is the single status element — `.status-icon` for received, `.spin` for pending. Apply the identical fix to `viewInterop` (Phase 5) and the notifications popover (Phase 8) so all three converge on one row anatomy.

**Task 4.6 — Result panel (rule 40).** `banner--ok` / `banner--error` in `resultPanel` are solid tint blocks; converge to outlined notes (Phase 6 dependency). The document thumbnail (`resultDoc`) is good — keep it. Replace the inline `style="width:100%"` on the download button with a class (Phase 0.6 may already have caught it).

**Task 4.7 — Modals.** Decision radio-cards are a sanctioned tappable-card pattern (§3 form controls) — keep, but ensure the underlying inputs are the shared custom-drawn radios after Phase 0 convergence (rule 14). Selects in the request modal must show the sprite chevron + `appearance:none` via the shared field styles — verify after the fork deletion, both themes.

**Acceptance:** status appears exactly once on the card; the ring caption no longer repeats the ring value; docs/interop rows carry one status element each; all four modals keyboard-complete (already implemented — re-verify after CSS convergence).

---

## Phase 5 — Interop journal (`viewInterop`)

**The problem.** The journal is one flat panel: every request across all applications sorted by time, pending mixed with received, no summary, no filtering. The operator's actual job on this screen is "find what's stuck" — the layout should serve it.

**Task 5.1 — Add the summary layer.** Above the panel, a KPI row of `stat` buttons (§3 canon): **Ожидают ответа** (pending count, `warn` mod when >0, filters the list, `aria-pressed`), **Получено сегодня**, **Средний срок ответа** (computed or mock — mark as demo data in `data.js`). Value first, label second, `tabular-nums`.

**Task 5.2 — Add a status filter.** One `.filter-select` ("Состояние": Все / Ожидает ответа / Получено), synced to the URL as `?io=pending|received` (closed ASCII list — allowed by §7). The pending KPI card sets the same state.

**Task 5.3 — Row anatomy.** Same convergence as Task 4.5: bare leading glyph or none; single trailing status element; title = request type; meta = agency · application № · relative time. Rows keep navigating to the card (already implemented, keyboard-reachable — keep). Panel title gets the count; title-to-first-row gap equals the row rhythm (casebook 4).

**Task 5.4 — Empty state** stays but per casebook 6 gets generous vertical padding (`--s-10`+) — verify, don't assume.

**Acceptance:** an operator can isolate stuck requests in one click from the KPI card or the filter; reload restores the filter; the list region announces changes (`aria-live="polite"`).

---

## Phase 6 — Reports (`viewReports`) + shared banner convergence

**Task 6.1 — Banner canon, design-system-wide (rule 40).** `design-system/css/components.css` still paints `.banner` as a solid tint block — the pattern §3 explicitly retires. Restyle the shared `.banner` to the canon: transparent background, `1px` border `color-mix(in srgb, var(--semantic) 20%, var(--line))`, semantic ink text, bare icon. **Blast radius: every platform.** Do this as its own commit; run the full visual/contrast suites and update snapshots deliberately; check citizen/TSON/admin banner call-sites in both themes. Every Ministry banner (overdue, four-eyes, batch hint, lock note, result, locked panel, comments note) inherits the fix.

**Task 6.2 — Honest numbers.** `viewReports` hardcodes 428 total and "94%" / "2,4 дн" while computing breach count live. Compute what is computable from `S.apps` (total, decided, breach); keep period-scoped fictional numbers in `data.js` as named demo constants, not inline literals in the view.

**Task 6.3 — Specialists table alignment (rule 41).** Name column left; всего / просрочено / % columns **centered**, headers following. Extract the grid into a `--report-columns` custom property (rule 18 hygiene — head and rows already share `.report-row`, keep the single definition when you touch it).

**Task 6.4 — Per-service breakdown panel.** Add a second panel "По услугам": one row per service — название (left) · всего · просрочено · % в срок with the same meter treatment. Data from `D.SERVICE` + seeded apps (extend `data.js` with per-service period totals as demo constants). This answers the management question the page currently can't ("which *service* is late"), not just "which specialist".

**Task 6.5 — Week-load rows (rule 44).** Add a "Поступление за неделю" panel using the canon dashboard form: **full-width horizontal day rows, calendar week Monday–Sunday, value on every row** — the exact pattern TSON's dashboards use (see `apps/tson/js/screens/dashboard-center.js` and rule 44's reasoning; no splines, no thin floating columns, no rolling "today−6" window). Demo values live in `data.js`. If the TSON row implementation is directly liftable, promote it to `design-system/` per rule 21 instead of building a third copy.

**Task 6.6 — Period control.** The subtitle bakes in "период: июль 2026". Replace with a labeled `.filter-select` ("Период": июль 2026 / июнь 2026 / II квартал — demo options), URL-synced (`?period=2026-07`). The subtitle then loses the period suffix.

**Acceptance:** reports reads as summary → by-service → by-specialist → intake rhythm; no hardcoded numbers in view code; centered metric columns; banners across all platforms are outlined and pass the contrast suite.

---

## Phase 7 — Forms library + form builder

### 7A. Library (`viewForms`)

**Task 7A.1 — Header action becomes a quiet pill (§3 Page header, rule 15).** "Создать форму" is currently `btn--primary`. The sidebar has no create destination, so the button stays — but as the quiet pill: border, transparent background, `--ink-2`. Blue is reserved for the flow's decisive action (Send for review, in the builder).

**Task 7A.2 — De-duplicate the catalog head (rule 4).** The panel head has an `h2` "Реестр форм" + a hint that restates what the stat tiles just said + a permanent "Автор ведомства" role badge. Keep the panel title (at §4 panel-title size/weight, one line); delete the hint; delete the role badge (identity lives in the profile popover — Phase 1).

**Task 7A.3 — Stat tiles filter (§3).** Drop the "Всего форм" tile (the list is right below and short); make the remaining three (Черновики / На проверке / Опубликовано) `<button class="stat">` filters with `aria-pressed` filtering the row list.

**Task 7A.4 — Converge rows to the versioned-row canon (rule 26).** Current row: hue icon tile + name + "Версия 2.1 · обновлено…" + audience badges + status pill wrapping a status icon (a pill+icon double, rule 6) + chevron. Target, per rule 26 and its reference implementation (admin forms library, commit `ec39b20`): keep the per-service hue tile (catalogue recognition is its sanctioned home), title, then a compact **`vN` strip whose background carries status** (green published / amber draft-review / neutral archived), slight corner radius not a pill, status text in `title` + `.sr-only`; audience badges stay (they are distinct facts); "обновлено…" meta stays; the separate status pill and its inner status icon are deleted. If admin's `.svc-row` CSS is liftable, promote it to `design-system/` (rule 21) and consume in both.

**Task 7A.5 — Comments note.** The "N комментариев ждут ответа" banner at the page bottom is far from its object. Replace with a quiet comments chip on the affected row ("2 комментария") — errors and follow-ups sit next to the decision they affect (§6).

### 7B. Builder (`viewFormBuilder`)

**Task 7B.1 — One status placement (rule 6).** Status currently renders in the title row AND again in the meta bar. Keep the title-row status; the meta bar keeps env chip (Stage), version, comments count. Delete the meta-bar status and the meta-bar "Автор ведомства" role chip.

**Task 7B.2 — Title-only pipeline (rule 22).** Every `.mfb-step` renders title + subtitle. Delete the subtitles (`step.sub` and `.mfb-step__text span`) — the selected pane's header already prints the step's intro sentence. Also delete the unexplained amber `.mfb-step__dot` on the route step (a signal with no accessible meaning), and the "7 шагов" counter in the pipeline head.

**Task 7B.3 — Eyebrow/label typography (§4).** `.mfb-editor__head > span` (eyebrow) and `.mfb-section-label` are 14px/600; `.mfb-pipeline__label` is 13px/600. All three are micro-labels: **13px sentence case / 500**.

**Task 7B.4 — Phone preview convergence (§6 device previews, rule 21).** The preview phone fakes an OS status bar ("9:41 ● ◒") — canon forbids fake OS status content — and uses its own geometry (`border-radius: 40px`, padding 9px). Admin's `.pv-phone` (`apps/admin/app.css:1852`) already implements the canonical iPhone 17 Pro Max geometry (440×956pt screen, 62pt display radius, Dynamic Island as percentages — see the `.pv-phone` comment). **Promote `.pv-phone` to `design-system/`** (styleguide entry + `docs/admin-component-map.md` note), consume it in both admin and Ministry, delete `.mfb-phone`/`.mfb-phone__status`. Caption ("Как видит гражданин") moves **below** the device in small regular text.

**Task 7B.5 — Live badge → static caption (rule 23).** `.mfb-live` is a blue pill with a green dot on always-visible chrome. Replace with a quiet static caption ("Предпросмотр · вид гражданина") in `--ink-3`; no pill, no dot.

**Task 7B.6 — Cost control (rule 14, §3 form controls).** The Бесплатно/Платно `.seg` with native radios is a filter-control used as a form input. Replace with the tappable-card pattern (`.cost-options` anatomy from the admin wizard) or shared `.ekh-radio` rows — cards preferred for a binary choice.

**Task 7B.7 — Remove the fake drag grip.** `.mfb-field-grip` draws a drag handle but nothing is draggable (reordering is the up/down buttons). Delete the grip — an affordance that doesn't work is a lie. (Alternative per §0: implement drag; not required.)

**Task 7B.8 — Comments placement.** Reviewer comments currently render as a full-width banner between the meta bar and the three-pane workspace, pushing the editor down. Move them behind the meta-bar comments counter: make it a button opening a popover/dialog listing the comment cards. The read-only lock note stays inline (it explains why editing is disabled — context the whole workspace needs).

**Task 7B.9 — Audience checkboxes.** The meta-bar audience toggles are opacity-0 native inputs styled as chips with visible focus — acceptable as tappable chips, but verify the full §6 state set after Phase 0 (hover, focus-visible, disabled) and that the guard toast ("нужна хотя бы одна аудитория") still fires.

**Acceptance:** builder head shows status once; pipeline is one-line steps; preview is the shared phone with no fake status bar; all micro-labels 13/500; lint + `qa/functional/workflows.spec.js` forms scenarios pass.

---

## Phase 8 — Notifications, dead code, final sweep

**Task 8.1 — Notification rows (§6 icon fills).** `openNotif()` rows use 32px tinted icon circles. A popover feed is a glanceable dashboard-card context: replace fills with **bare colored glyphs** (2px stroke compensating for the lost circle), matching the alert-row canon. Rest state text-aligned; hover paints the pre-reserved island (casebook 2, third context).

**Task 8.2 — Delete the batch view.** `viewBatch()` is unreachable — no nav item or action calls `go('batch')` (the batch flow correctly lives in the contextual batch bar, rule 45). Delete: `viewBatch`, the `'batch'` branch in `renderMain`, `batch` from `ARM_VIEWS`, the `batch-svc` / `sel-all-batch` handlers, `S.batchSvc`, unused i18n keys (`batch_title`, `batch_sub`, `pick_service`, `batch_no_batchable` — verify each is unused first), and orphaned CSS (`.chips-row` if nothing else uses it). Keep `batchStatus`/`modalBatch`/`doBatchConfirm` — the batch bar uses them.

**Task 8.3 — Live-region coverage (§7).** Queue list, interop list, and forms list get `aria-live="polite"` on their count/container so filter results are announced.

**Task 8.4 — Final §11 verification pass** across every view: 1440 (rail expanded AND collapsed), 960, 620, <700px tall; light/dark; RU/TJ; measure type roles numerically (`getComputedStyle`: h1 28/600, panel titles 17/500, row titles 14/500, micro-labels 13/500); `getBoundingClientRect().left` of `h1` identical across queue/all/overdue/interop/reports/forms (the `.view` container is the single content container — 1360px, matching admin); side-by-side with `admin/services.html` — same product?; hunt the classic defects list in §11.

---

## Shared-component promotions (tracked across phases)

| What | From | To | Phase | Rule |
| --- | --- | --- | --- | --- |
| Preferences/profile popover (menu rows, lang flyout, theme triple) | `apps/tson/js/shell.js` + `apps/admin/js/builder.js` | `design-system/` | 1 | 21 |
| Outlined note/banner | canon (`.lc-review-context`) | restyle shared `.banner` | 6 | 40, 21 |
| Phone preview `.pv-phone` | `apps/admin/app.css:1852` | `design-system/` | 7B | 21, §6 |
| Versioned form row `.svc-row` | admin forms library | `design-system/` (if liftable) | 7A | 26, 21 |
| Week-load day rows | `apps/tson/js/screens/dashboard-*.js` | `design-system/` (if liftable) | 6 | 44, 21 |

Every promotion: entry in `design-system/styleguide.html`, note in `docs/admin-component-map.md` where admin consumes it, and delete the app-local copy in the same change.

## Sequencing and dependencies

```
Phase 0 (CSS foundation)          ← blocks everything
  ├─ Phase 1 (shell/preferences)  ← blocks 2 (lock reuses popover-free shell) — can run parallel with 3
  ├─ Phase 2 (lock)               ← needs 1 only for the menu entry point
  ├─ Phase 3 (queue)              ← independent after 0
  ├─ Phase 4 (card)               ← independent after 0; banner styling final after 6.1
  ├─ Phase 5 (interop)            ← shares row anatomy with 4.5 — same agent or coordinate
  ├─ Phase 6 (reports + banner)   ← 6.1 (banner) affects 3.8/4.6/7 — land 6.1 early if possible
  └─ Phase 7 (forms/builder)      ← independent after 0
Phase 8 (cleanup + final sweep)   ← last
```

## Verification (every phase)

```bash
npm run lint:design-system
npm test            # ~20 pre-existing non-Ministry failures exist; judge only Ministry-scoped specs:
                    # qa/functional/ministry-sidebar.spec.js, workflows.spec.js (ministry cases),
                    # screen-layouts.spec.js, routes.spec.js
npm run test:a11y
npm run test:visual # Ministry snapshots WILL change — update them deliberately, per-phase, never blindly
```

Then the §11 designer review. A phase is done when the operator works faster and misreads less — and the diff is mostly deletion and convergence, which is what §2 predicts for this codebase.

---

## Closing note — what was executed, and what deviated

Every phase landed as its own commit. Three things went differently from the plan,
each per §0 (change the rule/plan and the code together, with the reasoning):

1. **Phase 1, Task 1.3.** The plan called for promoting a preferences popover.
   By the time this ran, `.ekh-profile-pop` already existed in
   `design-system/css/components.css` (promoted out of admin), so Ministry
   consumes it rather than adding a third implementation. It gained one variant,
   `__row--action`, for a leading-glyph action row.
2. **Phase 5, Task 5.3.** The plan asked for the request count in a panel title.
   The page's `h1` already carries that title and the panel is the only one on
   the screen, so a panel title would restate it (rule 4). The count sits in the
   toolbar, where the queue puts it.
3. **Phase 7A.4.** The versioned-row reference in admin is `.form-mini-version`,
   not `.svc-row`; that is what was promoted.

Beyond the plan's promotion table, this pass also moved into `design-system/`:
the workstation field skin (`.field__*`, `.otp`, `.src`), `.panel--pad`, the
stacked toast region, the workstation lock (`.s-locked*` + `.is-blurred`),
`.btn--quiet` and `.cost-options`.

Two fixes outside the plan were needed to make its own acceptance criteria
reachable: "Создать форму" dispatched the shared `RESET`, which restores the demo
state «на рассмотрении», so a new form opened locked (the low-code process gained
`NEW_DRAFT`); and Tajik dates printed `07/26/2026` because browsers have no
Tajik in ICU.
