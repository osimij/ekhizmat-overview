# Citizen portal redesign — work plan for AI agents

Status: **ready for execution**. This plan was produced from a full audit of every Citizen screen (code + live inspection at 1440px/375px, light/dark, signed-out/signed-in/guest) against [docs/design-guide.md](design-guide.md). Each work package (WP) says exactly what to change, from what, to what, and why (with guide § references).

## 0. Ground rules — read before touching anything

1. Read **docs/design-guide.md in full** first. It is the binding contract; when this plan and the guide disagree, the guide wins (§0).
2. Files you will work in:
   - [citizen/index.html](../citizen/index.html) — all 7 static screens (`#scr-home`, `#scr-category`, `#scr-journey`, `#scr-emergency`, `#scr-notifs`, `#scr-guest-service`, `#scr-profile`) + modals.
   - [apps/citizen/app.css](../apps/citizen/app.css) — all citizen styles (837 lines).
   - [apps/citizen/js/app.js](../apps/citizen/js/app.js) — navigation, catalogue, search, journey, wallet, dialogs.
   - [apps/citizen/js/citizen-expansion.js](../apps/citizen/js/citizen-expansion.js) — applications, tracking, payments, received files, family, guest flow (JS-rendered panes).
   - [apps/citizen/js/i18n.js](../apps/citizen/js/i18n.js) — the `I18N` dictionary (tg/ru/en).
   - Shared foundations live in `design-system/` — **consume, never fork** (§1.6, §1.9).
3. **Every new user-visible string needs tg + ru + en keys** — in `I18N` (i18n.js) for static markup, or in `COPY` (citizen-expansion.js) for JS-rendered panes. A component that breaks in the longer Russian/Tajik translation is not finished (§9).
4. Definition of done per WP: `npm run lint:design-system` and `npm test` pass (note: ~20 test failures pre-exist outside the citizen scope — you own only *new* failures in specs you touch), plus the §11 review: 1440px, 960px, 620px, short viewport, light/dark, RU/TJ.
5. `apps/citizen/services-data.js` (the 1 MB official registry) is read-only for this plan.
6. Suggested execution order: WP1 → WP2 → WP3–WP11 in any order (WP4 and WP7 are the highest-value screens) → WP12 → WP13 → WP14. WP1 first because most other WPs write URLs it defines.

---

## WP1 — Routing: give the portal a working Back button (P1, unlocks everything else)

**Problem.** `go()` in app.js:205–226 swaps `hidden` on `<section class="screen">` elements with **no history entry**. Browser Back exits the site instead of returning from a category to home; reload always lands on home; no screen can be linked or bookmarked. This is the single biggest UX defect in the portal. §7: "Filter/view state lives in the URL … reload, back-button, and shared links must land on what the user was looking at."

**Change to:** hash-based routing owned by `go()`:

- Routes: `#/` (home), `#/category/<id>` (e.g. `#/category/docs`), `#/journey`, `#/emergency`, `#/notifs`, `#/guest-appointment`, `#/profile/<pane>` where `<pane>` ∈ `data|wallet|apps|payments|contact|family|security|access`, and `#/profile/apps/<applicationId>` for the application detail view.
- `go()` calls `history.pushState` (or sets `location.hash`); a `popstate`/`hashchange` handler runs the existing screen-switch logic. On load, parse the hash and restore screen + pane + detail before first paint completes (the auth gate in `go()` still applies: a personal route while signed out opens the login dialog with the route as `pendingAction`, exactly like the current `requireLogin(() => go(...))` at app.js:207).
- Filter state stays in **query params**, merged with the existing `syncApplicationQuery()` (citizen-expansion.js:117–121): `?status=…&agency=…` on `#/profile/apps`, plus new `?pay=…` on category (WP4). Drop the `type` param (WP7 removes that filter). Allow-listed, non-personal, ASCII values only (§7).
- Every `back` button (`[data-go="home"]` on category/journey/emergency/notifs/guest/profile) becomes a real Back: call `history.back()` with a fallback to `#/` when there is no citizen history entry. Kill the current hardcoded "always home".
- Delete the `hasAppQuery` hack (citizen-expansion.js:81, 197: `setTimeout(()=>ctx.go('tracking'),0)`) — the router now owns deep entry.
- Fix the audience-switch bug: switching account type to **guest while on a personal screen** (profile, notifs, journey, emergency) currently leaves you on that screen (app.js:86–106 only guards the category screen). On audience change, if the current route is in `PERSONAL` and the user is no longer signed in, route to `#/`.

**Verify:** open `#/category/docs?pay=free`, reload — same screen, same filter. Back from category → home. Back from application detail → list. Sign-out on `#/profile/security` → home. Add a Playwright spec under `qa/functional/` for these four assertions.

---

## WP2 — Header: preferences move out of permanent chrome (P1)

**Problem.** The header (index.html:22–63) carries a language dropdown in permanent chrome — explicitly retired (§3 "Global preferences", rule 12). There is **no theme control anywhere** on the platform (users cannot override OS theme without knowing the localStorage key). The avatar goes straight to the profile screen, so there is no home for a preferences popover. On mobile the header wraps to two rows with 5 controls.

**Change to:**

1. **Promote the profile popover to the design system** (rule 21 — admin is the first consumer, citizen is the second): move `.adm-profile-pop` from `apps/admin/app.css:2559+` into `design-system/css/components.css` as `.ekh-profile-pop` (keep `.adm-profile-pop` as an alias selector during migration), add it to `design-system/styleguide.html`. Anatomy per §3/§6: identity card on top, hairline divider, language row (**label + current value + chevron — no leading globe**), three-state theme row (system/light/dark, `i-theme-system` icon), submenus via `dd-right`/`dd-up` with hover aim-bridge, `--shadow-1` on `--raised`, Escape/click-outside/focus-return.
2. **Signed in:** avatar click opens the popover (not the profile screen). Popover contents top-to-bottom: identity card (Фируза Раҳимова + phone) that navigates to `#/profile/data`; divider; «Кабинети шахсӣ» row → `#/profile/data`; language flyout; theme row; divider; «Баромадан» (wire to the existing logout handler at app.js:193–199). Remove `#logoutBtn`'s exclusivity — it may stay in the profile nav too, one placement per frequency map is satisfied because the popover is the identity home (§3).
3. **Signed out / guest:** replace the language `.dd.lang` dropdown with **one quiet `--ink-2` icon-button** (the login-gate gear pattern, rule 31) that opens the same popover minus the identity card. Language before sign-in stays reachable (§9 requires it); it just stops being an always-open dropdown.
4. Delete the `.dd.lang` markup (index.html:42–53) and its now-unused CSS. Keep the **account-type dropdown** (Шахси воқеӣ/ҳуқуқӣ/Меҳмон) — it is an audience switcher, not a preference.
5. Wire the theme row to the existing `ekh.preferences.theme` key and the pre-paint script in index.html:10 (extend it to honor an explicit `"light"` value — today only `"dark"` is applied, so an explicit light choice on a dark-OS device does nothing).
6. Delete dead theme-toggle CSS `.th-sun/.th-moon` (app.css:26–28).
7. Header sizing: set `.hdr-in` height to `var(--h-topbar)` (60px, §5 shell anchors) instead of the local 64px.

**Verify:** popover opens from avatar and from the signed-out gear; language + theme persist across reload; keyboard: Tab cycles inside, Escape closes and returns focus; no theme flash on reload (§7).

---

## WP3 — Home, signed-in: feed and payment card (P1)

The signed-out home (hero, search, categories, artwork) is the strongest screen in the portal — **do not redesign it**. The signed-in additions need convergence.

1. **Feed rows lose the kicker column.** `.frow` (app.css:186–198, markup index.html:114–154 and the notifications copies) currently has a fixed 124px `fk` column whose text duplicates the body («Таваллудхонаи №3» appears in the kicker *and* in the first sentence; «Ҳуҷҷатҳо» restates the doc icon) — two representations of one fact, delete the weaker (rule 6; the column is already `display:none` under 880px, proving it optional). New grid: `auto minmax(0,1fr) auto` = [icon] [title + 2-line snippet] [right rail]. The right rail stacks the date (`--fs-12`, `--ink-3`, `tabular-nums`, right-aligned) above the CTA button or chevron.
2. **Feed icons go bare.** The feed is a glanceable dashboard-card context: replace the tinted `.fic.tile` squares with **bare colored glyphs** at 2px stroke (§6 "Icon fills", rule 39). Tinted tiles remain only on catalogue/selection cards (home categories, moments, application categories are fine).
3. **Applications tab rows** (`.app-row`, index.html:135–144): replace the text status + `.pulse` dot (`.status` app.css:210–216) with the canonical **`.status-icon`** (28px tinted circle, `role="img"` + localized `aria-label` + `title` — reuse `statusIcon()` from citizen-expansion.js:69). Delete the `.pulse` keyframes — a pulsing dot on an always-visible surface violates rule 23/§8.
4. **Payment aside** `.pay-card` (index.html:157–163, app.css:219–228):
   - Reorder to value-first (§3 KPI canon): sum (`--fs-32`, weight 680, `tabular-nums`) → label → discount note → CTA.
   - Delete the dead `.old` price: markup line 160 (`data-i18n="pay.old"`) and the `display:none` rule (app.css:226) — an element shipped hidden is noise.
   - `.pt` label weight 640 → `var(--weight-medium)` (§4 — labels never carry display weight).
   - The card becomes a **link into `#/profile/payments`** in addition to its pay CTA, and its data must match WP9's single source of pending payments (today home says «андози нақлиёт, то 1 июл» while the payments pane's pending item is the birth-certificate fee — same 86,40 with two different stories).
5. **Feed "Ҳамаи огоҳиҳо"** link keeps working but now writes `#/notifs` (WP1).
6. **Panel surface convergence:** the home/expansion panels currently disagree — `.fpane`, `.moments`, `.e-steps`, `.review`, `.s-list`, `.plist`, `.rows`, `.pay-card` are borderless while `.application-list`, `.payment-item`, `.tracking-card`, `.received-file-list` have `1px` borders. Converge on **`border:1px solid var(--line-in)`** for all `--panel` list containers (§3 KPI canon uses bordered cards; two surface languages on one platform read as drift).
7. **Mobile order** (≤880px): signed-in currently shows greeting → 12 category cards (4 rows, ~640px tall) → search — the portal's main verb is below the fold. Change the ≤880px composition so **search always precedes the category grid**, and at ≤560px turn `.cats` into a single-row horizontal scroll rail (`overflow-x:auto`, `scroll-snap-type:x mandatory`, edge fade mask like `.prof-nav`, tiles ~96px wide, all 12 reachable). Desktop keeps the current 2×6 grid and the cats-before-search signed-in order.

**Verify:** compare the feed side-by-side with `admin/services.html` rows — same product? No animation running at rest anywhere on home. Feed tab keyboard behavior (roving tabindex, app.js:326–334) still works after the row rewrite.

---

## WP4 — Category page: from a wall of rows to a scannable registry (P2)

Current state (index.html:242–262, app.js:269–312): back, `h1` at fs-32, count, search, "popular" pills, a 3-chip pay filter, then a flat list — in «Ҳуҷҷатҳо ва шиноснома» that is **37 near-identical rows**, ~90% carrying the same org line («Хадамоти шиносномавию бақайдгирӣ») and the same «музднок» tag.

1. **Pay filter → canon dropdown.** Replace the `.filters .chip` row (index.html:254–258) with the shared labeled dropdown `.ekh-filter` (`design-system/css/patterns.css:122+`, reference markup `admin/services.html:51`): 16px icon + text label «Пардохт» + bordered 38px `appearance:none` select (Ҳама/Ройгон/Музднок) + sprite chevron + `:focus-within` ring. State syncs to `?pay=` (rule 9, §7). Keep the sub-section search as is.
2. **Kill the repeated tag.** In `svcRow()` (app.js:260–268): paid services render the payment as **quiet text** appended to the org line (`· музднок`, `--fs-13 --ink-3`) instead of a chip; **free** services keep a green `tag` — free is the exception worth an anchor, 37 identical chips are noise (rule 6, §5 "remove them from dense comparison rows").
3. **De-duplicate the org line.** When every row in a rendered group shares one org, print the org **once** as the group's `.svc-sub` subheading (append to the existing sub label, or use the org as the subheading when `s.label` is null) and drop it from those rows. Rows keep their org only when it differs from the group's.
4. **Row affordance:** add a trailing `i-chev-r` chevron to `.svc-row` so rows read as navigable (they currently look inert; every other row pattern in the portal has one).
5. **Typography:** `.cp-head h1` fs-32 → **`--fs-28` / 600** (§4 page-title role; the fs-44 display size belongs to `#heroTitle` only). `.svc-sub` weight 640 → `var(--weight-medium)`, size `--fs-13` (§4 section caption).
6. **Popular pills:** keep, but rename the mechanism honestly — the "popular" heuristic is `shortest name` (app.js:292). Leave the heuristic (data is read-only) but keep max 3 and make pills set the search box as today.
7. **Live region:** wrap the count + list in `aria-live="polite"` so filter/search changes are announced (§7). Add `role="status"` to `#cpCount`.
8. **Container:** `.catpage` hardcodes `max-width:880px` — a third content width next to `.wrap` (1120) and `.col` (640). Add `--w-browse: 880px` to `design-system/tokens/layout.css` and use it here (and anywhere else a mid-width reading column appears), so the width is a named decision, not a local number (§5 "one content container").
9. **URL:** the screen becomes `#/category/<id>?pay=…` (WP1). The search query stays out of the URL (free-text; keep the address bar clean).

**Verify:** the docs category at 1440px reads in groups, not 37 uniform lines; reload restores category + filter; `getBoundingClientRect().left` of the `h1` matches home's content edge at the same viewport.

---

## WP5 — Journey wizard: converge on shared components (P2)

The 4-step flow (index.html:265–393) is well-composed; its parts are bespoke.

1. **Progress → shared `.stepper`.** Replace the star-icon `.j-prog` (index.html:270–277, app.css:352–357) with the design-system `.stepper` (`components.css:459+`): numbered circles + labels, current step `aria-current="step"`, completed `.done`. Labels (add i18n keys): «Кӯдак», «Хизматҳо», «Санҷиш», «Анҷом». Keep it above the single centered column (§3 "Sequential wizard", rule 13). Delete the `Қадами {n} аз 4` text label and `updateProgLbl()` — the stepper now carries progress accessibly.
2. **Native controls → shared drawn controls** (§3 "Form controls", rule 14):
   - `.seg` sex radios (index.html:292–295): keep the segmented *look* (it is a valid binary tappable-card choice) but back it with `.ekh-radio` inputs so focus ring and theming come from the shared set; remove reliance on the browser widget.
   - `.svc` bundle checkboxes (index.html:325–339) and `#consent` (index.html:361–364): swap `accent-color` natives for **`.ekh-checkbox`** (`components.css:129+`). Delete the `accent-color` declarations (app.css:377, 391).
3. **Consent box:** re-skin from solid `--blue-tint` fill to the outlined-note pattern — transparent background, `1px` border `color-mix(in srgb, var(--blue) 20%, var(--line))` (§3 "Notes & banners", rule 40).
4. **Step headings:** `.j-step h2` currently inherit the global h2; set explicitly to **`--fs-24` / 600** (§4 pane/step heading role).
5. **Success screen (step 4):** keep the draw-on ring (a rare moment earns warmth, §8). Set all 4 stepper steps `.done`. The `s-list` panel gets the WP3.6 border.

**Verify:** whole flow keyboard-only; stepper announces "step 2 of 4" semantics via `aria-current`; reduced-motion shows the ring instantly.

---

## WP6 — Profile shell + «Маълумоти ман» (P1)

1. **Move «Дар баррасӣ» out of «Маълумоти ман».** `#underReviewRoot` (index.html:560) renders four tall tracking cards **inside the personal-data pane** — on mobile a user scrolls ~1600px of tracking before reaching their own passport data, and the pane answers two unrelated questions. Delete the root from `pane-data` and fold active-application tracking into the Applications pane (WP7.2). `renderTracking()` (citizen-expansion.js:123–129) is rewritten there.
2. **Passport warning banner → outlined.** `.note-warn` (app.css:593–602) is a solid `--amber-tint` block. Re-skin: transparent background, `1px solid color-mix(in srgb, var(--amber) 32%, var(--line))`, bare `--amber` icon (no fill), ink text (rule 40). Same class is reused for rejection reasons in the application detail — one fix covers both.
3. **Profile header:** `.prof-head h1` fs-32 → `--fs-28`/600; `.prof-ava` weight 700 → 600 (§4).
4. **Pane switching joins the router:** `selectPane()` (app.js:432–440) writes `#/profile/<pane>` (WP1); the left nav items become real links semantically (keep `<button>` + router call is acceptable; `aria-current="true"` already present).
5. **2FA row** (index.html:766–769) shows a status icon *and* a toggle — two representations of one state (rule 6). Keep the toggle (it is the control); drop the injected `status-icon` from `renderStaticCopy()` (citizen-expansion.js:164) and let the sub-line text carry on/off.
6. Contact/Security/Access panes are already close to canon — only the WP13 weight sweep and WP3.6 borders apply. Do not restructure them.

**Verify:** «Маълумоти ман» at 375px shows the data list within one screen-height of the pane top; profile deep-links restore the pane.

---

## WP7 — Applications: kill the hub, list-first with KPI filters (P1)

Current state (citizen-expansion.js:98–129): the pane opens on a **category chooser** (a big blue «16» summary card + six category cards), so reaching any application takes two clicks; the list view then adds a second «Бозгашт» above the outer one, three label-above selects, and a «Навъи ариза» filter whose 16 options are the 16 unique application names (a filter that duplicates the list is not a filter).

**Change to — one list view + one detail view:**

1. **Delete the categories view** (`state.appView==="categories"` branch, `.application-summary`, `.application-categories` markup+CSS). `#/profile/apps` opens directly on the list.
2. **KPI stat cards replace both the hub and the «Дар баррасӣ» section** (§3 KPI canon, rule 10). Across the top of the pane, four separate bordered cards, **value first** (`tabular-nums`, weight 620–680), label second, rendered as `<button aria-pressed>` that set the status filter: «Ҳама 16», «Дар баррасӣ N» (submitted+review), «Ислоҳ лозим N» (action), «Иҷро шуд N» (approved+completed). Clicking syncs `?status=` (the `action` card maps to `?status=action`, the composite cards map to a comma value or a dedicated `active`/`done` token — extend the allow-list accordingly).
3. **Filters converge on the canon dropdown** (§3 Filters, §6): rebuild `.application-filter-panel` (citizen-expansion.js:114, app.css:665–669) as two `.ekh-filter` controls — «Ҳолат» and «Идора» — inline icon + label + bordered select + sprite chevron (the current CSS draws its own chevron with borders; delete that). **Remove the «Навъи ариза» filter entirely** and the `type` query param.
4. **Rows lose the category tile.** `application-row` currently leads with a tinted category tile — a decorative icon repeated down a dense registry list (rule 5; the reference `admin/services.html` rows carry none). New row: title (2-line clamp stays) + meta line (agency · №id · date), `.status-icon` right, chevron. If category recognition is wanted, it is available as a KPI/agency filter, not per-row decoration.
5. **Active applications strip (replaces renderTracking):** above the list, when `?status` is unset and active items exist, render up to 3 compact single-line rows: title · current agency · «интизорӣ то d.m» + `.status-icon` — **no mini-stepper on cards**. The five-step `mini-stepper` at `--fs-10` with labels hidden on mobile (app.css:684–690) is illegible; progress detail belongs in the detail view (rule 22 — detail lives in the selected pane, not the rail). Delete `.mini-stepper` CSS.
6. **Detail view** (`state.appView==="detail"`) keeps its structure (eyebrow, h2, path box, history) and gains a **status-driven action row** under the history:
   - `action` → primary «Ислоҳ кардан» (demo toast) next to the outlined reason note;
   - `completed`/`approved` → secondary «Натиҷа дар ҳамён» → `#/profile/wallet`;
   - `rejected` → outlined reason + secondary «Такроран фиристодан» (demo toast);
   - `review`/`submitted` → no action (the ETA line already answers "when").
   The route becomes `#/profile/apps/<id>` (WP1) so Back returns to the filtered list. Remove the inner list-level «Бозгашт» (the browser/back-button now does this; one back affordance per screen).
7. **Dates:** `new Intl.DateTimeFormat('tg-TJ')` renders `8/12/2026` (US order — the runtime has no tg data). Add a tiny `formatDate()` in citizen-expansion.js producing `dd.mm.yyyy` for list rows and localized long dates from an i18n month table where needed, `tabular-nums` everywhere. This also fixes the Family pane showing «June 8, 2026» in Tajik.
8. **Dev-only controls out of the UI:** «Намоиши ҳолати холӣ» buttons in the Applications and Family headings (citizen-expansion.js:103, 155) render only when `new URLSearchParams(location.search).has('dev')`.
9. **Re-render focus:** filter changes re-render the whole root and drop keyboard focus. Re-render only the list container, or restore focus to the changed select after render (§9).
10. **Live region:** the results count («16 ариза · Аввал навтарин») sits in an `aria-live="polite"` element (§7).

**Verify:** signed-in, `#/profile/apps?status=action` reloads into the filtered list with the KPI card pressed; list → detail → Back preserves filters; no tile column; Playwright spec for the KPI-filter → URL → reload loop.

---

## WP8 — Wallet: make documents tell apart (P2)

1. **Card color = document type.** All three "me" cards render near-identical navy (`.doc` uses `--preview-navy`, `.doc.ink` a shell token — device-preview tokens borrowed as identity colors). Define proper semantic tokens in `design-system/tokens/color.css` (the one file where raw values are legal, §1.1): `--doc-passport` (navy), `--doc-license` (deep teal), `--doc-tax` (slate/ink), `--doc-birth` (warm earth — existing `.earth`), `--doc-temp` (amber-leaning earth), each with a dark-theme variant. Map: passport→passport, driver→license, tax→tax, birth→birth (keep `.earth`), temporary→temp. Update `.doc` CSS (app.css:433–444) to consume them. Result: a glance distinguishes documents the way a physical wallet does.
2. **Owner chips stay.** «Ман / Фарзандон / Падару модар» is *view* switching between 2–3 short mutually-exclusive views — tabs/chips are canon-valid here (§3 Filters, parenthetical). Sync to `?own=` for reload/back.
3. **Received files:** keep the row pattern; `.format-tile` weight 750 → 600 (numerals/badge ceiling, §4). «Кушодан» + «Боргирӣ» both stay (different verbs, not duplicates).
4. **Copy:** wallet lead «аслӣ ҳамин ҷост…» (index.html:615) starts lowercase — sentence-case it in all three languages.
5. **Empty state:** `.wallet-empty` (parents view) gets generous vertical padding `--s-10`+ (§5 casebook 6) — currently `--s-8` all around, acceptable but confirm it answers what/why/next (§6): it does (invite CTA). Keep.
6. Dead CSS: delete `.doc .share` block (app.css:453–459) — no markup uses it.

**Verify:** five cards, five distinguishable colors in both themes; contrast of `--pure-white` text on every new token passes `npm run test:contrast`.

---

## WP9 — Payments: a pending bill you can actually pay (P1)

Current pane (citizen-expansion.js:131–146): three cards; the **pending** payment has status text only — no pay action anywhere in «Пардохтҳои ман» (the only pay button lives on the home aside). 

1. **Pending card gets the primary action:** «Пардохт кардан» (`btn-pri btn-sm`) in the card foot; demo behavior = mark paid in state, toast, re-render (prototype-honest, mirrors `retry`).
2. **Summary header:** above the list, two KPI cards per §3 canon (value first, `tabular-nums`): «Ба пардохт 86,40 смн.» and «Пардохт шуд 55,00 смн.». The "to pay" card is the same fact the home `.pay-card` shows — **one data source**: export a `pendingTotal()` from citizen-expansion.js and use it for both (fixes the WP3.4 mismatch; pick one story for the pending bill — the transport-tax narrative from home, id `АН-44213`, discount note included — and make `payments()` carry it).
3. **Receipt modal** (`openReceipt`) is close to canon — keep. The fiscal QR block's dashed border is fine (it mimics a receipt artifact).
4. Failed card keeps «Такроран пардохт кардан»; paid keeps «Квитансия».

**Verify:** home aside sum === payments pane «Ба пардохт» sum; pay → both update; receipt still opens and downloads.

---

## WP10 — Notifications: one fact, one representation (P2)

1. Apply the WP3.1/3.2 `.frow` rewrite (the screen shares the class): kicker column deleted, bare glyphs, date in the right rail. The «Нав/Пештар» `.n-group` labels stay; weight 640 → `var(--weight-medium)`, size `--fs-13` (§4).
2. **Counts:** «3 огоҳии нав» sub stays; add the count per group only if it costs nothing — do not build read-state management for the prototype.
3. The bell `#bellBtn` keeps its dot; it and the popover-era header (WP2) must not both shout — dot only when the new group is non-empty.
4. Route `#/notifs` (WP1); h2 «Огоҳиҳо» → `--fs-28`/600 to match screen-title role (it heads a screen, not a pane).

---

## WP11 — Emergency: deliver the flow the screen promises (P2)

The screen (index.html:396–410) promises «1. Кадом ҳуҷҷатҳо гум шуданд — аз рӯйхат интихоб кунед», but `#emergStart` (app.js:422–429) skips straight to issuing a temp ID and jumping to the wallet. The composition also decorates: red blob icon on home strip, red tinted number circles.

1. **Build step 1 for real:** clicking «Оғоз» shows (same screen, replacing the pitch) a short form in the `.col`: shared `.ekh-checkbox` list of the citizen's own documents (Шиноснома, Шаҳодатномаи ронандагӣ — from the profile data), a confirm line («Ҳамаашон дарҳол бекор мешаванд»), and «Бекор кардан ва шиносномаи муваққатӣ гирифтан» (`btn-danger btn-lg`). Submit → compact success panel: revoked list + temp ID issued (existing `docTemp` unlock) + «Ба ҳамён» + «Дидани аризаҳо». Signed-out users hit the existing `requireLogin` first — unchanged.
2. **De-decorate:** home `.emerg > svg` red-tinted blob (app.css:272–275) → bare `--red-ink` glyph (rule 39); `.e-step .n` red tinted circles → neutral `--field` circles with `--ink-2` numerals, weight 700 → 600 (the numbers are sequence, not danger — red stays on the CTA only, §5 semantic state colors).
3. `#scr-emergency` h1 fs-32 → `--fs-28`/600.

**Verify:** flow completes keyboard-only; the temp document appears in the wallet with its «нав» badge; Back mid-flow returns to the pitch, not home.

---

## WP12 — Guest flow + shared selects (P2)

1. **All native selects get the §3 treatment** (`appearance:none` + sprite chevron in a bordered field): `#guestCenter`, `#familyRelation` (child modal). The pattern already exists in `.application-filter-panel` — after WP7 rebuilds that as `.ekh-filter`, reuse the same select skin; promote it as a `.ekh-select` utility in `design-system/css/components.css` if it doesn't exist yet (rule 21).
2. **Date fields:** `#guestDate` and `#familyDob` are bare `type="date"` natives (render `mm/dd/yyyy` OS chrome, untranslated). Keep `type="date"` (native pickers are the best mobile UX) but skin the field to match `.input` and add a visible format hint in the help line; do not build a custom calendar for the prototype.
3. **Guest page title:** `#guestServiceTitle` inherits the global h1 fs-44 and wraps to three lines. Set to `--fs-28`/600 and shorten the string to «Сабти қабул дар марказ» (ru: «Запись на приём в центр», en likewise) — the badge above already says it is the guest variant (rule 4 energy: the title orients, the detail lives in the lead).
4. Guest success view: fine — keep.

---

## WP13 — Typography & dead-code sweep (P1, do after the structural WPs land)

§4: *size expresses role, weight expresses state; 600 is the ceiling; ≥620 for display numerals only.* Apply mechanically in app.css (line numbers pre-WP; re-grep):

| Selector (app.css) | Now | Change to |
| --- | --- | --- |
| `.brand b` :16 | 650 | `var(--weight-semibold)` (600) |
| `.avatar` :33, `.prof-ava` :528, `.pav` :591, `.profile-photo-preview` :716 | 700 | 600 (avatar initials = display glyph, 600 suffices) |
| `.fbadge` :173 | 700 | 550 (numerals may be 600) |
| `.s-item` :137 | 560 | `var(--weight-medium)` |
| `.pay-card .pt` :224 | 640 | `var(--weight-medium)` |
| `.n-group` :231 | 640 | `var(--weight-medium)`, `--fs-13` |
| footer `h3` :288 | 640 | `var(--weight-medium)` |
| `.ft-logo b` :285 | 650 | 600 |
| `.pills .plabel` :320 | 640 | `var(--weight-medium)` |
| `.svc-sub` :331 | 640 | `var(--weight-medium)`, `--fs-13` |
| `.moment h3` :255 | 620 | 600 |
| `.svc .tt b` :378 | 620 | 600 |
| `.e-step .n` :515 | 700 | 600 |
| `.badge-new` :469 | 700 | 550 |
| `.guest-success #guestSuccessId` :635 | 700 | 600 (numerals) |
| `.application-summary span` :643 | 650 | (deleted in WP7) |
| `.document-page__side` :500 | 650 | `var(--weight-medium)` |
| `.format-tile` :483 | 750 | 600 |
| `.prof-verified__tooltip` :545 | 620 | `var(--weight-medium)` |
| `.tl b` :425 | 620 | (deleted below) |

Keep as-is (sanctioned): `.pay-card .sum` 680, `.application-summary strong`-style display numerals in the new KPI cards (620–680 band, §4), `#heroTitle` letter-spacing.

**Hover convergence:** `.avatar:hover{filter:brightness(.96)}` (:36–37) → background/`color-mix` hover tokens; `filter:brightness` is retired (§3 Action color). Same for `.note-warn .btn-sec:hover` (:600).

**Delete dead CSS** (verified unreferenced in HTML/JS): `.th-sun/.th-moon` (:26–28), `.timeline`, `.tl`, `.tl *` block (:410–429 — keep `.trk-card`, used by the guest form), `.trk-foot` (:429), `.pane .trk-h/.trk-sub` (:578–579), `.doc .share` (:453–459), `.invite` block (:605–613), `.application-filters` (:649), plus everything WP3/WP7 orphan (`.status/.pulse`, `.mini-stepper*`, `.application-summary`, `.application-categories`, `.frow .fk`).

---

## WP14 — Motion, states, final verification (P1, last)

1. **No animation at rest:** after WP3/WP7, grep app.css for `infinite` — the only allowed survivors are none (`pulse` :214, `ring` :421 both go).
2. **Search popover** (`.search-pop` :127–132) pops via `display` toggle. Give it the standard layer entrance: `transform-origin` at the field, scale from .98 + fade over `--t-popover`, exit `--t-exit`, zeroed under reduced motion (§8). Same for `.dd-menu` if it currently hard-cuts.
3. **States audit** per §6 on the rebuilt components (KPI cards, `.ekh-filter` selects, feed rows): default/hover/press/focus-visible/selected/disabled all present; `@media (hover:hover) and (pointer:fine)` gates hovers (the file already does this for tooltips — extend to new hovers).
4. **Run the full §11 protocol** and record numbers: `getComputedStyle` on every screen `h1` → 28px/600 (except `#heroTitle`); `h1.getBoundingClientRect().left` equal across home/category/profile at 1440px; 620px and short-viewport passes; RU and TJ (longest strings) without overflow; dark theme for every new token.
5. Playwright: extend `qa/functional/` with the WP1 routing spec, WP7 filter-URL spec, WP9 payment spec; run `npm run test:a11y` and fix regressions in touched screens only.

---

## Out of scope — do not touch

- The signed-out hero composition, Dushanbe artwork and its theme cross-fade (app.css:39–105) — this is the platform's signature; only the mobile ordering (WP3.7) changes.
- `services-data.js` content.
- The document-detail and receipt modals' structure (only weight tokens from WP13 apply).
- The account-type (audience) switcher mechanism.
- `design-system/` foundations beyond the explicitly named promotions (profile popover, `--w-browse`, `.ekh-select`, doc color tokens).
- EN copy quality (en currently mirrors ru in `COPY`/`appNames` — acceptable for the prototype; do not build it out).

## Success criteria (portal-level)

1. Browser Back never exits the portal unexpectedly; every screen and profile pane is linkable.
2. Reaching any application takes one click from the profile (was three).
3. A pending payment can be paid from «Пардохтҳои ман».
4. No animation plays on an idle screen; no weight above 600 outside display numerals; no solid tint-filled banner; no bare native control in a styled flow.
5. `npm run lint:design-system` clean; no new `npm test` failures; §11 numeric checks recorded in the final PR description.
