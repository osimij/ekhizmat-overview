# ЦОН (TSON) redesign plan — operator workstation

Status: **ready for execution**. Written 2026-08-19 after a full read of `apps/tson/` (all 13 screens + shell + CSS) and a live walkthrough of every screen in both themes and both languages (RU/TJ).

**Read [docs/design-guide.md](design-guide.md) before starting any package.** Every item below cites the guide rule it applies (§N = guide section, rule N = §10 decision rule). `admin/services.html` is the reference implementation to compare against. Definition of done for every package: `npm run lint:design-system` passes, the tson-scoped tests pass (see "Verification" at the bottom), plus the §11 review.

**What the tson app is:** a hash-routed SPA served from `tson/index.html`, source in `apps/tson/`. Screens live in `apps/tson/js/screens/*.js`, all styling in `apps/tson/app.css`, shell (topbar / session bar / stepper) in `js/shell.js`, layer system (modal/drawer/popover/toast) in `js/ui.js`, form controls in `js/fields.js`, dictionaries in `i18n/ru.json` + `i18n/tg.json`. The state machine (`store.js`), router privacy guards (`router.js`), and wipe-on-end privacy architecture are **excellent — do not touch them**. This plan is a UX/UI convergence layer only. Never put citizen data (ФИО, ИНН, phone, doc numbers) into URLs, localStorage, or logs; the router will evict you if you try (`router.js` PII guard), and `qa/privacy` must stay green.

---

## ⛔ Scope guards — read first

1. **S0 (login) and S2b (enroll) are being reworked in a parallel workstream right now** (uncommitted changes in `apps/tson/js/screens/login.js`, `enroll.js`, `fields.js`, `app.css`, both i18n files, and a new shared `.login` pattern in `design-system/css/patterns.css`; the guide gained the "Workstation login" canon row and rule 27 in the same change). **Do not edit these two screens or the `.login` pattern.** If your package touches `app.css` or the i18n files, rebase on that work after it lands — do not start `app.css`-heavy packages until the working tree is clean.
2. During my walkthrough the confirm modals (S7 "Отправить заявление?", S9b "Завершить приём?", S4 scope request) rendered with a **fully transparent card** — page content bled through the modal text. This may be a temporary artifact of the in-flight CSS edits. Item T0.3 makes it a hard acceptance check either way.
3. The demo panel (`js/demo.js`, `?dev=1`, toggled with `` ` ``) is your testing tool: it plays the citizen (confirm/deny consent, grant scopes), toggles the §7 fault matrix, and speeds timers ×10/×60. Use it to reach every state.

---

## Package T0 — platform enablers (land first; everything else depends on it)

### T0.1 Fix the root font-size so `--fs-*` tokens compute correctly
- **Where:** `apps/tson/app.css` (the `html { font-size: 15px }` rule near the top, and `body { font-size: 15px }`).
- **Now:** the app pins `html` to 15px. Every `--fs-*` token is rem-based (`design-system/tokens/type.css`), so any token used in tson renders 6.25% small: `--fs-28` → 26.25px, `--fs-14` → 13.125px. The dashboards already use `--fs-14`/`--fs-28` and are silently wrong; the enroll screen had to hardcode `28px` with an apology comment to match the admin's page-title role.
- **Change to:** delete the `html { font-size: 15px }` override entirely (root returns to the browser's 16px). Set `body { font-size: var(--fs-15) }`. Space tokens are px-based (`--s-1: 4px` …), so spacing does not move; only token-based font sizes snap to their true values.
- **Then** sweep `app.css` replacing hardcoded px font sizes with tokens: 12→`var(--fs-12)`, 13→`var(--fs-13)`, 15→`var(--fs-15)`, 16→`var(--fs-16)`, 17→`var(--fs-17)`, 24→`var(--fs-24)`, 28→`var(--fs-28)`. Exception: `.doc-page*` (the rendered A4 sheet in S8) imitates a printed document, not UI — leave its px values and 720 weight alone, add a comment saying so.
- **Verify:** in the browser, `getComputedStyle` on an admin page title and a tson page title returns the same 28px after T2 lands. No layout shift beyond ~1px text metrics anywhere (screenshot before/after at 1280 and 1440).
- Guide: §4 (roles are shared numbers), §1 rule 6 (don't fork foundations).

### T0.2 Three-state theme with pre-paint, no flash
- **Where:** `tson/index.html`, `apps/tson/js/shell.js` (`initTheme`, `toggleTheme`).
- **Now:** `index.html` hardcodes `data-theme="light"`; the theme is applied in `boot()` *after* awaiting the i18n fetch — dark-theme users get a light flash on every load. The model is binary light/dark; there is no "system" option (§3 canon requires system / light / dark).
- **Change to:** add an inline pre-paint script in `<head>` (before the stylesheets), same shape as `admin/services.html:8`: read `ekh.preferences.theme`; values `light`/`dark` apply directly; `system` (and absence) resolves via `matchMedia('(prefers-color-scheme: dark)')`. Extend `design-system/js/preferences.js` to understand the `system` value if it doesn't (it is the shared owner of `ekh.preferences.*` — do not build a tson-local variant). Delete `initTheme`/`toggleTheme` from `shell.js`; the control itself moves in T1.1.
- **Verify:** hard reload with saved dark theme shows zero light flash; `?theme=dark` demo param still works (see `docs/decisions.md` — demo params must not overwrite saved preferences).
- Guide: §7 (theme before first paint), §3 "Global preferences".

### T0.3 One modal/overlay system, opaque in both themes
- **Where:** `apps/tson/app.css` (`.overlay`, `.modal` — §5.3 block), `design-system/css/components.css:246-261` (legacy compact `.overlay`/`.modal`), `apps/tson/js/ui.js` (`modal()`).
- **Now:** two competing `.modal`/`.overlay` definitions load on the same page (design-system global.css first, app.css second). During the walkthrough all three confirm dialogs rendered with transparent cards (text overlapping the page behind). Separately, tson's scrim is `color-mix(in srgb, var(--ink) 40%, transparent)` — in dark theme `--ink` is near-white, so opening a modal *lightens* the screen (confirmed on the S4 scope-request modal: the whole workspace goes milky).
- **Change to:** (a) root-cause and fix the transparent card — the tson `.modal` must have a solid `var(--panel)` background that survives cascade order; (b) replace the ink-based scrim with the existing `--alpha-overlay` token (already used by the design-system overlay) so the scrim darkens in both themes; (c) rename tson's classes or the legacy ones so exactly one `.modal` definition applies — preferred: rename the design-system legacy compact modal (only styleguide/citizen consumers) or namespace tson's as `.tson-modal` is NOT allowed (rule: promote, don't fork) — reconcile with the design-system owner and leave one definition per class name.
- **Verify:** open S7 submit confirm, S9b end-visit confirm, S4 scope request in light+dark: card fully opaque, scrim darkens, content behind unreadable. Screenshot each.
- Guide: §5 surfaces, §1 rule 6.

### T0.4 Text-safe amber/green everywhere text sits on a tint
- **Where:** `design-system/tokens/color.css`, then `apps/tson/app.css` usages.
- **Now:** `--green-ink` exists only inside the `[data-platform='admin']` scope; tson text uses raw `--amber` on `--amber-tint` (`.banner--warn`, `.sessionbar--warn`, `.field__hint--warn`, `.s-enroll__page-state--warn`) and raw `--green` on `--green-tint` — the same pair the admin re-tune already declared not text-safe.
- **Change to:** promote `--green-ink` to `:root` (light + dark values) and add `--amber-ink` the same way; raw values live only in `color.css` (§1 rule 1). Swap every tson text-on-tint usage: `.banner--warn { color: var(--amber-ink) }`, `.sessionbar--warn`, `.sessionbar--danger` (already uses `--red-ink` — good), `.field__hint--warn`, `.green-ink` utility → `var(--green-ink)`. Icon fills inside status-icons keep the raw pair (they're glyphs, not text).
- **Verify:** `npm run test:contrast` passes; manually check the amber session bar text at 1280 in light theme reaches 4.5:1.
- Guide: §9 (contrast), §5 semantic state colors.

---

## Package T1 — shell chrome (after T0)

### T1.1 Retire theme + language buttons from the top bar; preferences move into the operator popover
- **Where:** `apps/tson/js/shell.js` (`renderTopbar` — `themeBtn` lines ~38-44, `langBtn` ~46-49; `openOperatorMenu` ~97-142), `apps/tson/app.css` (`.menu*`).
- **Now:** a moon/sun toggle and a `RU/TG` globe button sit in permanent chrome — exactly the retired pattern in §3 ("Per-page moon/sun theme toggle; language dropdown in the bar", rule 12). The operator popover already exists (identity head, demo-role radio, lock/end-shift/logout) but has no preferences.
- **Change to:** delete both buttons from the top bar. In `openOperatorMenu`, after the identity head + hairline, add a preferences group copying the `.adm-profile-pop` anatomy (§3 "Global preferences", §6 "Profile popover"): a **language flyout** (Русский / Тоҷикӣ, current one checked, calls the existing `setLang`) and a **three-state theme row** (system / light / dark, `i-theme-system` / `i-sun` / `i-moon` icons — all three exist in the sprite) calling the shared `preferences.js` setter from T0.2. Flyout submenus position with the `dd-right`/`dd-up` + hover aim-bridge behavior the admin popover already implements — reuse `design-system/js/menu.js`, don't rebuild.
- **Login screen exception:** before login there is no operator card. Keep exactly one quiet icon-button on the right of the top bar on `#/login` only (opens the same popover with just the preferences group), since the operator cannot otherwise switch language before signing in — localization is a §9 requirement, not décor.
- **Also:** the current-role "✓" is passed as a fake `kbd` hint (`shell.js:125-127`). Give role items `role="menuitemradio"` + `aria-checked`, and render a real 16px `check` icon instead of the text hint.
- **Verify:** top bar right side contains only the bind button, spacer, and operator button. Language switch mid-session still preserves the session (regression: `onLangChange` path). Popover grows from its trigger (see T6.3).
- Guide: §3 top bar + global preferences, rule 12.

### T1.2 Top bar content order and quietness
- **Where:** `apps/tson/js/shell.js` `renderTopbar`.
- **Now:** brand + "АРМ" + role badge cluster left; bind button floats next to them; alignment is ad-hoc.
- **Change to:** keep left cluster = logo, product name (600), "· АРМ" (ink-2), role badge (only when not plain operator — the "Оператор" badge on every screen is a label restating the default; render the badge only for supervisor/leadership roles, rule 4/6). Bind button stays (it carries real state: window + center). Right side after T1.1 = operator button only.
- **Verify:** operator role shows no badge; supervisor/leadership do.

---

## Package T2 — typography convergence (after T0.1; before T3/T4 land their CSS)

One pass over `apps/tson/app.css` + the class names screens use. The §4 rule: size = role, weight = state; 600 is the ceiling; ≥620 only for display numerals.

### T2.1 Role classes in app.css
| Class | Now | Change to | Why |
| --- | --- | --- | --- |
| `.h1` | 44px / 720 | delete the class after T2.2 removes its last use | no 44px role exists in §4 |
| `.h2` | 24px / 720 | `var(--fs-24)` / `var(--weight-semibold)` | 720 breaches the 600 ceiling; 24 stays for pane/step headings |
| `.h3` | 17px / 550 | `var(--fs-17)` / `var(--weight-medium)` | panel/section title role is 17/500 |
| `.label` | 15px / 550 | `var(--fs-13)` / `var(--weight-medium)`, keep `--ink-3`, sentence case | micro-label/section caption role (§4 table) |
| `.def__key` | 15px / 550, 200px col | `var(--fs-13)` / `var(--weight-medium)`, `--ink-2` | key is a label; value is the content |
| `.field__label` | 15 / 550 | `var(--fs-13)` / `var(--weight-medium)`, `--ink-2` | the enroll pass already did exactly this locally (`.s-enroll .field__label`) — promote it to the base class and delete the local override |
| `.btn` | 550 default | `var(--weight-medium)`→ no: **500** (`--weight-regular` is 400; use numeric 500) for ordinary buttons; 600 for `.btn--primary` and `.btn--danger` labels | §4 weight ladder, §6 buttons |
| `.srv-row__name` | 15 / 550 | 15 / 500 | row titles are 500; only active/selected earns 600 (rule 3) |
| `.queue-card__name` | weight 680 | 500 | 680 is for display numerals only |
| `.queue-card strong` (the count) | `--fs-28` | keep size, set weight 620, `tabular-nums` | display numeral |
| `.data-table th` | `--fs-14` / 650 | `var(--fs-13)` / `var(--weight-medium)` | table header = micro-label role |
| `.metric__value` (dashboards) | clamp 24–34px | `var(--fs-28)` / 620 / `tabular-nums` | one display-numeral size, no viewport-dependent type |
| `.s-idle__stat` | 17 / 550 | replaced by T5.1 stat cards | — |
| `.doc-page__title` and all `.doc-page*` | 17 / 720 etc. | **leave** (printed-document artifact, add exemption comment) | §6 device/document previews imitate the target medium |

### T2.2 One page-title role on every screen — 28/600
- **Now:** page titles are `.h2` (24/720) everywhere, and S8 uses `.h1` (44/720). The admin measures 28/600 (`--fs-28`).
- **Change to:** add to `app.css`: `.page-title { font-size: var(--fs-28); line-height: var(--leading-tight); font-weight: var(--weight-semibold); }` (this is the same recipe `.s-enroll__title` already carries — after this lands, `.s-enroll__title` becomes `composes`-style duplicate: delete it and put `page-title` on the enroll h1 too, *after* the enroll workstream merges).
- Swap the class on each screen's `h1`:
  - `screens/idle.js:26` — greeting `h1 class 'h2'` → `'page-title'`
  - `screens/catalog.js:64` and `:70` — "Каталог услуг" / "Выбор услуги"
  - `screens/data.js:29` — "Данные гражданина"
  - `screens/form.js:82` — service name
  - `screens/result.js:33` — "Заявление принято": `'h1 s-result__title'` → `'page-title s-result__title'` (the 96px hero-mark carries the moment; a 44px headline was double emphasis, rule 6)
  - `screens/dashboard-center.js:77`, `screens/dashboard-leadership.js:27` — dashboard titles
  - Gate screens (S2 `identify.js:48`, S3 card title) keep their own scale: S2's `h1 class 'h2'` → `'page-title'`; S3's card headline `h1 class 'h3 s-consent__title'` → `--fs-20`/600 (modal-title role — it titles a card, not a page).
- **Verify (numeric, §11):** on every route, `getComputedStyle(document.querySelector('h1'))` returns 28px/600 (gates excepted as listed); compare side-by-side with `admin/services.html`.

---

## Package T3 — supervisor dashboard redesign (`#/dashboard-center`)

File: `apps/tson/js/screens/dashboard-center.js` + the "fixed-fixture management dashboards" block in `app.css` (lines ~744-785). This screen drifts furthest from canon.

### T3.1 KPI strip → separate value-first stat cards
- **Now:** `metric()` renders `label → value → context` inside `.dashboard-metric` articles that inherit the design-system `.metric` (a **joined strip with internal border dividers** — the §3-retired pattern), plus a red inset bar for danger.
- **Change to:** each KPI is its own bordered card: `--panel` background, `1px solid var(--line-in)`, `--r-l` radius, `--s-3` grid gap between cards (copy `.dashboard-metrics` / `.reg-stats` from admin). Markup order **value first** (`--fs-28`/620/`tabular-nums`), label second (13/500 `--ink-2`), context line third (12/400, tone color from T0.4 inks). Delete `.dashboard-metric--danger`'s inset bar — danger reads through the context line color and the value color, not decoration. Stop extending `.metric`.
- Guide: §3 KPI canon, rule 10.

### T3.2 Header: demo controls out, one canon filter, one quiet caption
- **Now:** header holds a "Демо-данные" badge + "Обновлено 14:32" caption + two labeled selects: Период (today/week) and **Сценарий** (normal / high queue / empty / loading / error) — a demo-state switcher living in real chrome.
- **Change to:**
  - Move the Сценарий control into the demo panel (`js/demo.js`) as a new group "Дашборд (§11.5)" with the five scenario buttons — the panel is exactly where simulated states live. Without `?dev=1` the scenarios are unreachable, which is correct: the states themselves remain reachable by QA through the panel.
  - Период becomes the **canon labeled dropdown** (§3 filters): 16px icon + text label + `appearance:none` select inside a bordered 38px field with sprite chevron and `:focus-within` ring — copy the `.registry-status-filter` recipe from `admin/services.html`. Sync it to the URL: `history.replaceState` → `#/dashboard-center?period=week`, restore from an allow-listed param on load (§7). Period values are not PII; the router's guard won't object.
  - Collapse badge + timestamp into one caption line: `Демо-данные · обновлено 14:32` (13/400 `--ink-faint`). Two chrome objects for one fact → one (rule 6).
- Guide: §3 filters, §7 URL state, rule 9.

### T3.3 Queue zone cards: one danger channel, drilldown where the click happened
- **Now:** in the high-queue scenario the same fact is painted four times: red KPI, full-red queue card, red banner, and the drilldown. Clicking a queue card appends the drilldown `<aside>` at the very bottom of the page — below the windows table, off-screen.
- **Change to:** queue card keeps its border and shows danger through the count value color (`--red-ink`) + a 28px `.status-icon--danger`; drop the `queue-card--danger` full red background. Keep the banner (it is the actionable summary). The drilldown opens as a shared `.drawer` layer (same component the catalog uses; Esc/focus handled by `ui.js`) with the zone name, waiting count, average wait, and the long-waiters metric — delete the bottom-of-page `dashboard-drilldown` aside.
- Guide: rule 6 (one representation), §5 (errors sit next to the decision).

### T3.4 Windows table: rows are the button, drilldown replaces the dead-end modal
- **Now:** every row carries an identical ghost "Детали" button (10 repeats — rule 7); it opens a modal with two facts and a permanently disabled "Назначить оператора" button captioned "only in the real system".
- **Change to:** delete the "Детали" column. Make each `<tr>` a row-button exactly like the leadership table already does (`tabindex="0"`, Enter/click, `:hover`/`:focus-visible` background, `aria-label` "Окно 4, Оператор 04 — детали"), opening the same `.drawer` as T3.3 with window no, operator, status (`.status-icon` + text here — a detail view may spell status out, §3), served count. Drop the disabled assign button and its apology caption entirely — a control that can never work teaches operators to ignore controls (§6 states).
- Status column keeps the 28px `.status-icon` mapping already in place (success=check, break=clock, closed=x) — this is canon, don't change it.

### T3.5 Load-by-hours chart: reachable values, no hover-only data
- **Now:** bars expose their value only via `title` (hover-only, rule 20); no axis; `aria-label` names the section but no values.
- **Change to:** keep the quiet bars; add a 12/400 `--ink-faint` value on top of the current-hour bar and the peak bar (two labels, not eleven); give the chart container `role="img"` and a localized `aria-label` summarizing "нагрузка по часам, пик 47 в 11:00"; keep per-bar `title` for fine-pointer hover. Wrap in `overflow-x:auto` if it ever exceeds the panel (§ responsive).
- Guide: rule 20, §9.

### T3.6 Dashboard localization moves into the dictionaries
- **Now:** both dashboards carry local `TXT = {ru:{...}, tg:{...}}` objects — a second i18n system next to `i18n/*.json`.
- **Change to:** move every string to `i18n/ru.json` + `i18n/tg.json` under `dash.center.*` / `dash.network.*`, use `t()`. Delete the TXT objects and the local `copy()` helpers. (RU/TJ length differences are a layout rule — §9 — the dropdowns from T3.2 must be sized for the Tajik strings.)

---

## Package T4 — leadership dashboard redesign (`#/dashboard-leadership`)

File: `apps/tson/js/screens/dashboard-leadership.js` + same CSS block.

### T4.1 KPI cards — same conversion as T3.1 (shared CSS, do once).

### T4.2 Filters: two canon dropdowns, drop the misleading third
- **Now:** three labeled selects (Период, Регион, Аудитория). "Аудитория" only hides bars in the distribution section — filtering a 3-bar chart down to 1 bar tells the reader nothing and implies the KPIs/table follow it (they don't).
- **Change to:** Период and Регион become canon labeled dropdowns (T3.2 recipe) synced to `?period=` / `?region=`. **Delete the Аудитория select**; the distribution section always shows all three bars.
- Guide: §3 filters, rule 6 (a control that lies about its scope).

### T4.3 Trend chart: label the axis, drop the duplicate legend
- **Now:** a bare 4px polyline; below it a legend row printing index numbers 1–7 *and* every value — the same data twice, and the chart itself unlabeled.
- **Change to:** stroke 2px; draw a small dot per point; x-axis labels under the chart are the day labels (derive from the trend array — weekday short names, localized); remove the value-legend row and instead label only the first, minimum, maximum, and last points with 12/400 values beside their dots. Container gets `role="img"` + localized `aria-label` ("Визиты за 7 дней: от 2 010 до 2 486, рост 6,4%").
- Guide: §9 (announced, not just drawn), rule 6.

### T4.4 Centers table: visible row affordance
- **Now:** rows navigate to the center dashboard on click/Enter but nothing marks them as interactive until hover.
- **Change to:** add a trailing cell with a 20px `chev-r` icon in `--ink-faint` (the same affordance catalog rows use), and `aria-label` per row ("Открыть панель ЦОН №3, Душанбе"). Keep hover/focus backgrounds. Numbers columns already `tnum` — keep.

### T4.5 "Требует внимания" becomes an actionable alerts panel
- **Now:** a static `banner--warning` at the bottom of the table section with two hardcoded strings.
- **Change to:** a `panel` titled "Требует внимания" (17/500) placed **above** the centers table, one row per alert: 28px `.status-icon--warning` / `--danger`, alert text, and a quiet chevron; the whole row is a button that opens the named center's dashboard (`setCenterContext` + `#/dashboard-center` — the mechanism the table rows already use). Alerts derive from the data (`status !== 'normal'` centers), not hardcoded strings.
- Guide: §6 empty/error states answer "what can I do next"; §5 errors sit next to the decision.

### T4.6 Strings → `dash.network.*` dictionary keys (with T3.6).

---

## Package T5 — session screens (S1–S8), screen by screen

### T5.1 S1 idle: shift stats become stat cards
- **Where:** `screens/idle.js` (`load()`, `statRow`), `app.css` `.s-idle__*`.
- **Now:** "За сегодня" is a def-list (label left, value right) — the retired label-first stat pattern.
- **Change to:** three separate bordered stat cards stacked in the 340px column: value first (`--fs-24`/620/`tabular-nums`), label under it (13/500 `--ink-2`): `47 / Приёмов сегодня`, `06:12 / Среднее время приёма`, `31 / Выдано справок`. Keep the "Последние заявления" panel as is (def rows + `.status-icon` are correct there). Keep the skeletons matched to the new geometry (§6 loading).
- Guide: §3 KPI canon, rule 10.

### T5.2 S2 identify: no changes to structure; localization + keyboard completeness
- The layout (segmented method switcher = view switching, allowed by §3; form left, read-aloud steps right; guest entry below; single footer cancel) is sound. Do:
  - Move the four hardcoded RU/TJ ternaries (`identify.js:54-58` guest panel) into `identify.guest*` dictionary keys.
  - The method switcher uses `role="tab"`/`aria-selected` but arrow keys don't move selection — add Left/Right/Home/End roving tabindex (§6: a custom control ships the complete keyboard model or it isn't done). The 1/2/3 hotkeys stay.
  - Guest panel: keep, but drop its `.panel` border and render as a quiet single row (badge + one-line hint + `btn--ghost`) — it currently competes with the primary method form (§3.3 one decision per gate).

### T5.3 S3 consent: card headline role only
- Covered by T2.2 (headline → 20/600). Everything else (ring thresholds, aria-live buckets, denied/timeout parity) is already right — explicitly do not touch.

### T5.4 S4 catalog (both modes)
- **Search results list** gets `aria-live="polite"` (§7 — filter results must be heard). `catalog.js` `showResults` container.
- **Keyboard cursor a11y:** the ↑↓ cursor is visual-only. Add `aria-activedescendant` on the search input pointing at the cursored row's id, and `role="listbox"/"option"` on list/rows, so the cursor exists for screen readers too.
- **Row secondary line** currently concatenates category · № · срок · пошлина with the number highlighted mid-string — keep (it's dense but each fact answers a real operator question). No icon-tile removal here: search results are a catalogue, where hue tiles aid recognition (§5 explicitly keeps them there).
- **Drawer**: exit animation comes from T6.1. Add a click-outside-to-close scrim at 0 opacity (pointer target only) so pointer users aren't forced to find the ×; Esc already works.
- **URL note:** do **not** sync search/filter state to the URL on this platform. §7's URL rule collides with tson's privacy contract (§2.3.4 — the router actively strips suspicious hashes); a search query can contain a citizen's name. Add this as a one-line platform exception to the design guide in the same change (guide §2 step 8).

### T5.5 S5 data: complete the tabs, fix the copy affordance
- **Tabs keyboard:** `dataView.drawTabs` renders `role="tab"` buttons with no arrow-key model — same fix as T5.2 (shared helper is fine; put it in `ui.js`).
- **Copy icon:** `paperclip` currently means "copy" (data.js:211, result.js:47) *and* "attachment". Add a proper `i-copy` glyph to `design-system/assets/icons.svg` (the sprite is the only icon source, §1 rule 5 — add there, then use). Swap both copy buttons to it.
- def-key typography comes from T2.1. The 403-locked tab pattern ("Доступ не выдан" empty state + request button) is canon-quality — don't touch.

### T5.6 S6 form: mark exceptions, not everything
- **Source chips:** `fields.js` renders a chip on every field — `из профиля` (blue) *and* `введено` (gray). A gray chip on every manually-typed field is the "everything marked" defect the enroll pass just removed (§10.6; enroll comment: "когда помечено всё, не помечено ничто"). **Delete the `src--manual` chip entirely**; keep `src--profile` only. (`fields.js` `source()` — render nothing for `'manual'`.)
- **Registry-locked fields** stack three signals: blue-tint fill + chip + "изменить" button. Keep tint + "изменить"; the chip stays only because it names the *source* — but once `введено` chips are gone the blue chip next to a blue field is a double. Final state: **tint + "изменить" button + chip deleted**; the popover-facing fact "value came from the registry" moves into the field's `title` and the conflict hints, which already name the registry value.
- **Radios** (`Язык справки`): native `accent-color` inputs inside a styled flow — §3 retired this. Restyle the same `<input type="radio">` elements with the shared custom-drawn recipe (`appearance:none`, blue dot, `:focus-visible` ring — copy from admin/styleguide). Same for checkboxes in the confirm modals (`.check__input`).
- **Requirements panel** (right column): rows read `Скоуп: семья` and `Форма 040-У → ③`. Operators don't speak scope; nobody reads "→ ③". Change rows to `Доступ: Состав семьи` (scope display name from `SCOPES[id].name`) and `Форма 040-У — на шаге «Документы»` via dictionary keys `form.scopeRow` / `form.docRow`.
- **Draft button icon:** `saveBtn` uses `download` (form.js:72) — wrong metaphor for "save draft". Drop the icon; quiet secondary with text + Ctrl+S kbd is enough.

### T5.7 S7 docs: one icon per meaning, capture lives in the stage, honest disabled submit
- **Icon language** (`docs.js`): `scan` (line ~43), `rescan` (~250), and `rotate` (~247) all use `refresh` — three meanings, one glyph. Converge on the enroll workstream's language: capture actions (`Сканировать`, `Всё равно отсканировать`, rescan) use `card`; `rotate` keeps `refresh`; delete stays `trash`.
- **Capture actions move into the stage** (mirror the enroll layout): today `Сканировать`/`Загрузить файл` live in the left rail *and* reappear inside the registry-verified stage — duplicated placement (rule 7). Change: the left rail holds only the checklist + "Добавить иной документ"; the **empty stage** shows `Сканировать` (primary) + `Загрузить файл` (ghost) under the empty-state hint; the **registry-verified stage** shows only `Всё равно отсканировать` (secondary, `card` icon) — its second "Загрузить файл" is deleted; the **has-pages stage** keeps its rotate/rescan/delete toolbar and the `[+]` thumb for adding pages.
- **Disabled submit tooltip never fires:** `submitBtn.title` is set while disabled, but `.btn:disabled { pointer-events:none }` swallows hover — the explanation is unreachable (docs.js:132). Replace with a visible 13/400 `--ink-2` line in the sticky footer, shown only while incomplete: `Не хватает: Паспорт` (list the missing required doc names). Remove the `title` hack.
- The registry-verified passport stage (shield banner + def rows + "сверен … скан не нужен") is one of the best screens in the product — change nothing else about it.

### T5.8 S8 result: one primary per moment
- **Now:** two `btn--primary` compete — `Печать` in the panel and `Завершить приём F9` in the footer.
- **Change to** (`result.js:52-54`): for **instant** services the decisive action is printing — `Печать` stays primary, footer `Завершить приём` becomes `btn--secondary btn--l` (F9 kbd hint stays). For **deferred** services there is nothing to print — `Завершить приём` is the primary. One conditional class.
- Title size handled in T2.2; copy icon in T5.5.
- Guide: §3 action color ("one primary per region/decision").

---

## Package T6 — layers & motion (after T0.3; touches `ui.js` globally — one agent, one PR)

### T6.1 Exits: layers leave the way they entered
- **Where:** `ui.js` `closeLayer` (removes DOM immediately), `toast()` (`setTimeout(() => el.remove())`), `app.css` layer animations.
- **Now:** modal/drawer/popover/toast all pop in with entry animations and vanish with none — "a layer that vanishes mid-exit reads as a crash" (§8).
- **Change to:** in `closeLayer`, add an `is-exiting` class, wait `--t-exit` (160ms; 0 under reduced motion — read the token or use `animationend` with a timeout fallback), then remove and run `onClose`/focus-return. CSS pairs: overlay fades out; modal scales to .98 + fades; drawer translates back to `translateX(100%)`; popover/menu fades + scales toward its origin; toast slides back `translateX(16px)` + fades. Guard every pair with `prefers-reduced-motion`.
- Double-close safety: `closeLayer` must be idempotent while the exit plays (the F9 flow can race the modal).

### T6.2 Button press acknowledgment + tokened hover states
- **Where:** `app.css` `.btn`, `.btn--danger`, `button.chip`.
- **Now:** no press scale (a deliberate early-spec choice, now superseded by the canonical guide); `.btn--danger:hover { filter: brightness(.94) }` and `button.chip:hover { filter: brightness(.97) }` — the §3-banned brightness hack.
- **Change to:** `.btn:active { transform: scale(.97) }` (`.96` for `.btn--icon`) over `--t-fast`, none while disabled, zeroed under reduced motion (§6). Add `--red-fill-hover` / `--red-fill-press` raw values to `design-system/tokens/color.css` and use them for `.btn--danger`; chip hover becomes an explicit background token step (`--blue-tint` → a `--blue-tint-hover` token, same file).

### T6.3 Popovers grow from their trigger
- **Where:** `shell.js` `openOperatorMenu` (anchored top-right), `scopePopover` (top-left), `.popover` animation in `app.css`.
- **Change to:** set `transform-origin` inline when positioning (`top right` for the operator menu, `top left` for the scope popover); the shared `pop` keyframe then reads correctly (§8 "popovers grow from their trigger").

---

## Package T7 — localization & a11y sweep (parallel with T5/T6)

1. **Kill every `getLang() === 'tg' ? … : …` ternary** — they are a second, grep-invisible dictionary. Locations: `identify.js:54-58`; `catalog.js:143-147` (guest banner), `:263` (guest badge), `:306` (drawer badge); `shell.js:105` (demo-role caption), `:193-194` (guest session bar). Add keys to both `i18n/*.json`; a missing key already logs a console warning — keep that guarantee.
2. **Dashboard TXT objects** — covered by T3.6/T4.6, listed here so the sweep can verify none remain: `grep -rn "getLang() ===" apps/tson/js` returns zero after this package.
3. **Tab/segment keyboard models** — T5.2/T5.5; implement once in `ui.js` (`makeTablist(el)` helper: Left/Right/Home/End, roving tabindex), use in `identify.js` seg and `data.js` tabs.
4. **aria-live on dynamic lists** — catalog results (T5.4); verify the enroll banner (`aria-live="polite"`) survived the parallel workstream.
5. **Hover-only affordances audit:** `.def__copy` already has a `:focus-visible` path — good; verify the T3.5 bar labels and T4.4 chevrons are visible without hover. The workstation is `pointer:fine` by spec (1280px minimum), so `@media (hover:hover)` gating is optional here — note the platform exception instead of blanket-gating.
6. **Localized `aria-label`s:** the bind button, timer (`session.ttl`), and status icons already localize; re-check both outcomes of stateful controls after T1 (theme row must announce the *chosen* state, §9).

---

## Optional Package T8 — foundation convergence (large; separate decision)

`apps/tson/app.css` opens with its own reset, typography classes, and a full component library (`.btn`, `.field`, `.panel`, `.banner`, `.skel`, `.empty`, `.tabs`, `.seg`, …) even though `design-system/global.css` is also loaded — a direct §1-rule-6 fork (comments inside admit it: "base.css — reset…"). The design-system `.banner` already aliases tson's names (`--warn`/`--warning`), so drift is real and ongoing in both directions.

This is the correct end-state but a multi-day migration with cross-platform blast radius (citizen/ministry/admin share those class names). Do **not** bundle it into the packages above. When scheduled: migrate one component family at a time (banner → empty/skeleton → tabs → buttons → fields), deleting the app copy only when the design-system version is pixel-equal in the styleguide, with `npm run test:visual` as the gate, and promote anything tson does better (its modal anatomy, `.status-icon` usage discipline) upstream per rule 21.

---

## Execution order & parallelization

```
T0 (enablers, one agent, after the login/enroll workstream merges)
 └─ T2 (typography, one agent — pure CSS + class swaps)
     ├─ T1 (shell)          — parallel
     ├─ T3 (center dash)    — parallel; shares dashboard CSS with T4 → same agent or sequenced
     ├─ T4 (leadership dash)
     └─ T5 (session screens) — T5.1–T5.8 independent of each other
 T6 (layers/motion — one agent, owns ui.js; after T0.3)
 T7 (l10n/a11y sweep — last, verifies everything)
 T8 (optional, separately approved)
```

File-conflict map: `app.css` is touched by T0/T2/T3+T4/T5/T6 — sequence those merges; `i18n/*.json` by T3/T4/T5/T7 — additive keys, merge freely; `ui.js` only by T6 (+T7's tablist helper — coordinate); each screen file has exactly one owner package.

## Verification (every package)

```bash
npm run lint:design-system   # §1 non-negotiables
npm run test:contrast
npx playwright test qa/functional/screen-layouts.spec.js qa/functional/workflows.spec.js qa/privacy
npm run test:visual          # update snapshots deliberately, review diffs as design artifacts
```

Note: the full `npm test` currently carries ~20 pre-existing failures in non-tson suites — scope your run to the specs above plus anything touching your files; do not "fix" unrelated suites in a redesign PR.

Manual matrix per touched screen (§11): 1280×720 and 1440×900; light and dark; RU and TJ; default + most-crowded + empty + error states (drive them from the demo panel: faults, scenario buttons after T3.2, timers ×60); measure `h1` size/weight and left edge numerically; walk the full happy path (login → приём → push → согласие → услуга → форма → документы → результат → завершить) entirely on the keyboard.

Privacy invariants (must stay true after every package): refresh lands on S0; `#/session/*` unreachable by typing; no Cyrillic or 6+ digit runs in the URL ever; end-visit wipes DOM and revokes blob URLs; the idle screen greps clean of citizen fields.
