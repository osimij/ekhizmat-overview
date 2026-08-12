# eKhizmat — Client Feedback Work Plan (August 2026)

Status: handoff for product / design / frontend / QA
Date: 12 August 2026
Source: PDF "eKhizmat feedback" (7 pages: annotated screenshots + comments)
Basis: analysis of every screenshot, mapped against the product screens and the reference prototype in this repository

---

## 1. Summary

The client left **7 remarks**. None of them rejects the current design — they all push the citizen cabinet and the admin panel from "demo" toward a working product:

| # | Task | Screen | Priority | Estimate |
|---|------|--------|----------|----------|
| F1 | Document card opens a detail view + QR code button in the card corner | Cabinet → Documents | P1 | M |
| F2 | Received documents & certificates: storage and download (PDF etc.) | Cabinet → Documents | P1 | M |
| F3 | Applications: "newest first" default sort + filters (status / agency / type) | Cabinet → Applications | **P0** | M |
| F4 | Payments: payment date + electronic receipt view | Cabinet → Payments | **P0** | M |
| F5 | Full rework of the admin dashboard into a business-metrics screen (ToR §3.1) | Admin → Dashboard | **P0** | L |
| F6 | "Services under review" block with process tracking | Cabinet → Dashboard | P1 | M |
| F7 | Add and edit a profile photo | Cabinet → Profile | P2 | S |

Estimates: S — up to 0.5 day, M — 1–2 days, L — 3–5 days (frontend, no backend).

P0 — the client explicitly flags a ToR compliance gap (F5) or a basic user mechanic without which the section feels unfinished (F3, F4). Start with these.

---

## 2. What the client was looking at: page mapping

The screenshots were taken in the MVP citizen cabinet (sidebar «Дашборд · Документы · Заявления · Платежи · Профиль · Выйти», demo user «Гражданин Демо») and in the admin panel. The MVP cabinet is built from a copy of this prototype — the copy strings, document cards, the «Подтверждённая учётная запись» badge, and the «К оплате: 1 налоговое начисление» block all match strings from `apps/citizen/js/i18n.js`. Each task below therefore names both the product screen and its reference counterpart in this repository — update the prototype first; it remains the living UX reference for development.

| PDF page | What is on the screenshot | Product screen | Prototype counterpart |
|----------|---------------------------|----------------|----------------------|
| 1 | Card grid ПАСПОРТ (passport) / ИНН (tax ID) / ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ (driving licence); red circles on the top-right corner of each card, green outline around the passport card | Cabinet → Documents ("Я" / "Me" tab) | `citizen/index.html` → `#pane-docs`, cards `article.doc` |
| 2 | The same Documents page, mark in the empty grid area | Cabinet → Documents | same as above |
| 3 | «МОИ ЗАЯВЛЕНИЯ» (My applications) list: draft named "а", tinted-glass vehicle permits with statuses Отклонено (Rejected) / Завершено (Completed); red oval at the top-right of the list header — where the filters belong | Cabinet → Applications | `citizen/index.html` → `#pane-apps`, rendered by `apps/citizen/js/citizen-expansion.js` → `renderApplications()` |
| 4 (top) | «К ОПЛАТЕ: 1 НАЛОГОВОЕ НАЧИСЛЕНИЕ · 86,40 смн.» (Due: 1 tax assessment) + «МОИ ПЛАТЕЖИ» (My payments) list: PAY-2026-000143 "Ожидает оплаты" (Awaiting payment), PAY-2026-000098 "Оплачен" (Paid) — circled, PAY-2026-000072 "Ошибка оплаты" (Payment error) | Cabinet → Payments | Closest in the prototype: home feed "Payments" tab (`#fpane-pay`) and the `aside.pay-card`; a dedicated Payments section does not exist in the prototype yet — it is created as part of F4 |
| 4 (bottom) – 5 | Text block: "The admin dashboard must be reworked…" + the full list of required metrics | Admin → Dashboard | `admin/index.html` (the «Конструктор» block + «Как это работает» steps 01–05 — exactly what the client describes) |
| 6 (top) | Cabinet dashboard: "The state already knows this data…", passport-expiry banner, rows Паспорт / Дата и место рождения / ИНН with sources (circled) | Cabinet → Dashboard | `citizen/index.html` → `#pane-data` ("My data") |
| 6 (bottom) – 7 | Profile: phone, email, notification channels; red circle around the "Г" avatar | Cabinet → Profile | `citizen/index.html` → `#pane-contact` + profile header `.prof-head` |

---

## 3. Shared execution rules

These apply to every task below. Invent nothing — the design system already contains the needed primitives.

**Design system** (`design-system/`):
- Metrics — `.metric-strip` / `.metric` (`components.css`, "canonical data / workflow primitives" section); modifiers `--warning`, `--danger` exist.
- Tables — `.data-table` inside `.data-table-wrap`; compact density via `[data-density='compact']`.
- Statuses — the single `.status-pill` vocabulary (`--success`, `--warning`, `--danger`, `--info`, neutral). No new status colors: Completed/Paid → success, Awaiting → warning, Rejected/Error → danger, Under review → info, Draft → neutral.
- Filters — `button.chip` with `aria-pressed`, dropdowns — the `.dd` pattern, segments — `.seg`, tabs — `.tabs`/`.tab`.
- Banners — `.banner--info|warning|danger|success`; empty states — `.empty-state`; steps — `.stepper`; panels — `.panel` (`__head/__body/__foot`).
- Colors only via tokens (`design-system/tokens/color.css`): action accent `--action #0072d6`, tints `--green-tint`, `--amber-tint`, `--red-tint`, `--blue-tint`, hue pairs `--h-*-bg/fg`.
- QR is already implemented: the `#qrOverlay` modal + generator in `apps/citizen/js/app.js` (`openQr`, `data-qr`) and `window.bpQR` in the admin. Reuse it; do not write a new one.

**Localization**: every new string ships in 3 languages (tg / ru / en; en = ru is acceptable per current convention) in the matching dictionary (`apps/citizen/js/i18n.js`, `apps/admin/js/builder-i18n.js`). Key naming follows the existing style (`pay.*`, `w.*`, `apps.*`).

**Themes and responsiveness**: light/dark are mandatory (verify both); breakpoints as on the current cabinet screens; mobile layout stacks, filter rows collapse into a horizontally scrollable chip strip.

**Accessibility**: visible focus, `aria-pressed`/`aria-current` on filters, `role="dialog"` + focus trap for new modals (use `window.EKHDialog`), `prefers-reduced-motion` for animations, contrast ≥ 4.5:1.

**Privacy (repository rule, `docs/decisions.md`)**: localStorage may hold only `ekh.preferences.*` and approved non-personal keys. The profile photo and document contents are never persisted in the prototype (session memory / objectURL only).

**Data**: the prototype runs on deterministic demo data (no backend). For the MVP, each task has a "Data" block describing what the API must provide.

---

## 4. Tasks

### F1. Documents: card opens a detail view + QR in the card corner — P1, M

> Feedback (p. 1): «При нажатии на карточку, внутри находятся документы, которые прописаны на карточке. К примеру для паспорта — лицевая и задняя часть. Красные круглешки — функция для выставления электронного QR-кода, в котором оцифрован основной документ карточки».
> Translation: "Tapping a card shows the documents inscribed on it — e.g. for the passport, the front and back sides. The red circles are a control for displaying an electronic QR code that carries the digitized main document of the card."

Screenshot marks: green outline around the passport card = the whole card is clickable; red circles in the top-right corner of every card = where the QR button goes.

**Current state**: a document card (`article.doc`) is not clickable; the only action is the "Поделиться" (Share) button in the card footer, which opens the QR modal.

**To do**:
1. The entire document card becomes clickable and opens a **document detail view**.
2. Detail view (modal on desktop, full-screen on mobile):
   - header: document type + number;
   - viewer area: document imagery — front and back sides for the passport (a "Front / Back" segmented toggle or a vertical stack), single-side renderings for the tax ID and driving licence;
   - metadata under the viewer: issuing authority, issue date, validity, verification mark with source ("Verified · data from МВД" — reuse `src-tag`);
   - actions: "Show QR" (existing `openQr`), "Download PDF", "Share".
3. Add a round QR icon button (`i-qr`) to the **top-right corner of the card**: it opens the same QR modal directly, without entering the detail view. The button is a separately focusable element with an `aria-label` ("Passport QR code"); clicking it must not open the detail view (stopPropagation).
4. The QR modal already states "the code is valid for 10 minutes" — keep that behavior and the timer.
5. Remove the "Поделиться" button from the card footer (its role is taken over by the corner QR and the detail-view actions) — otherwise the card has two entries into the same thing. To be confirmed (question #1 in section 7).

**Design**: document imagery in the prototype is CSS/SVG mockups on the `--doc-paper/--doc-ink/--doc-line` tokens (reference: the `document-card` cards in the mobile concept `mobile/index.html` with the `i-girih-tile` pattern). No real scans, no personal data — demo persona only.

**Data (MVP)**: a document gains `pages[]` (side images), `issuedBy`, `issuedAt`, `validUntil`, `pdfUrl`.

**Prototype changes**: `citizen/index.html` (`#pane-docs`, new detail overlay), `apps/citizen/app.css`, `apps/citizen/js/app.js` (click handler on `.doc`, corner button), `apps/citizen/js/i18n.js` (keys `d.detail.*`).

**Acceptance criteria**:
- [ ] Click/Enter on any card in "Я / Дети / Родители" (Me / Children / Parents) opens that document's detail view.
- [ ] The passport detail shows both the front and the back side.
- [ ] The corner QR button on every card opens that document's QR modal in one click.
- [ ] Detail view: focus trap, Esc closes, focus returns to the card.
- [ ] Works in light/dark, RU/TG, at 390px and 1280px.

---

### F2. Documents: received documents & certificates — storage and download — P1, M

> Feedback (p. 2): «Все полученные документы и справки должны находиться тут в электронных форматах (PDF, Word и т.д.) для скачивания, также распределены по категориям, которые наверху — Дети, Родители и т.д.».
> Translation: "All received documents and certificates must live here in electronic formats (PDF, Word etc.) available for download, and be distributed across the categories at the top — Children, Parents, etc."

**Current state**: the section holds only the "ID-card" style documents. Service outcomes (certificates, statements, receipts) are stored nowhere — even though the cabinet's own notification already promises otherwise: string `f.n4.p` = "35,00 смн. — регистрация ИП. **Квитанция в ваших документах**" ("Receipt saved to your documents", `apps/citizen/js/i18n.js:271`). The interface's promise must be kept.

**To do**:
1. Below the card grid add a **"Received documents and certificates"** group (a list, not cards — these are files, not credentials).
2. File row: format tile (PDF / DOCX — `--red-tint` / `--blue-tint` tints), document title, meta "agency · received date · size · validity (if any)", a "new" badge (`badge-new`) for fresh items, actions: **Download** and **Open** (preview in the F1 detail view).
3. The list obeys the owner tabs at the top "Я / Дети / Родители" (`data-owner`), same as the cards.
4. Empty state (`.empty-state`): "No received documents yet — they appear after services are completed."
5. Lifecycle wiring: completing a service adds its outcome here (in the prototype, the "Родился ребёнок" / new-baby journey already reveals the birth certificate in the wallet: use the same mechanism to add the PDF row "Birth certificate — Зарина" and the state-fee receipt from notification `f.n4`).
6. Download in the prototype — a generated demo PDF/stub file (data-URL); in the MVP — a file from storage.

**Data (MVP)**: `GET /documents?owner=me|kids|parents` → `[{id, title, format, sizeBytes, issuedBy, issuedAt, validUntil?, applicationId, downloadUrl}]`. Every completed service must create a record.

**Prototype changes**: `citizen/index.html` (`#pane-docs`), `apps/citizen/app.css`, `apps/citizen/js/app.js`, `apps/citizen/js/i18n.js` (keys `w.files.*`).

**Acceptance criteria**:
- [ ] After completing the new-baby journey, the group shows the certificate (owner "Children") and the receipt (owner "Me").
- [ ] Switching "Я / Дети / Родители" filters both the cards and the files.
- [ ] Every row's "Download" works (file is saved) and "Open" works.
- [ ] Format, size and date are visible without opening the file; the empty state shows for an owner with no files.

---

### F3. Applications: default sort and filters — **P0**, M

> Feedback (p. 3): «Заявления/заявки по default по убыванию (свежести) даты создания и получения; добавить фильтры по статусу заявки, ведомству и типу заявления».
> Translation: "Applications sorted by default in descending order of freshness (creation/receipt date); add filters by application status, agency, and application type."

The red oval on the screenshot marks the top-right of the «МОИ ЗАЯВЛЕНИЯ» header — the client is showing where they expect the controls.

**Current state**: the MVP list has no explicit sorting and no filters. The prototype (`renderApplications()` in `citizen-expansion.js`) has status chips but no agency or type filter and no explicit sort rule.

**To do**:
1. **Default sort**: by the date of the last event — `max(created, received/updated)` — descending. Drafts participate on equal terms (by creation date). Fix the rule in code and in an acceptance test, not "whatever the API returns".
2. **Filter bar** in the list header (right of the title; on mobile — below it as a horizontally scrollable strip):
   - **Status** — `button.chip[aria-pressed]` chips: All · Draft · Under review · Action required · Approved · Rejected · Completed (vocabulary = the existing `status-pill` set);
   - **Agency** — dropdown (`.dd`): every agency present in the user's applications (МВД, ЗАГС, Tax Committee, ГАИ…);
   - **Application type** — dropdown by service name (e.g. "Permit (talon) for a vehicle with tinted windows").
3. Filters combine (AND); active filters are visible (filled chip / dropdown caption); a "Reset" action exists.
4. Result counter ("N applications") + `.empty-state` "No applications match this filter" with a reset button (already exists in the prototype — reuse).
5. Filter state is reflected in query parameters (`?status=…&agency=…&type=…`) — so links from the dashboard (F6) and notifications open a pre-filtered list.
6. Long service names: clamp to 2 lines (`-webkit-line-clamp:2`); the full name lives in the application detail.

**Data (MVP)**: `GET /applications?sort=-updatedAt&status=&agencyId=&serviceId=`; agency and type arrive with every application.

**Prototype changes**: `apps/citizen/js/citizen-expansion.js` (extend `state` with `agency`, `type`, define the sort in `appList()`), add an agency field to the demo data; `apps/citizen/js/i18n.js`.

**Acceptance criteria**:
- [ ] With no filters the list is sorted by descending date; a new application appears first.
- [ ] Each filter works alone and in combination; reset restores the full list.
- [ ] An empty result shows a proper empty state, not a "hole".
- [ ] A link with query parameters opens the list with those filters already applied.
- [ ] Keyboard: chips and dropdowns reachable with Tab, state is announced (`aria-pressed`, `aria-expanded`).

---

### F4. Payments: payment date and electronic receipt — **P0**, M

> Feedback (p. 4, top): «Добавить дату платежа и возможность просмотреть электронный чек данного платежа».
> Translation: "Add the payment date, and the ability to view the electronic receipt of a given payment."

The red frame surrounds the paid payment's card (PAY-2026-000098) — the receipt is needed on paid payments first.

**Current state**: the MVP payment card shows payment number, application number, amount and status — **no date**. No receipt. The prototype has no dedicated Payments section at all (only the home-feed tab and the "Due" card) — the section is created as part of this task and becomes the reference for the MVP.

**To do**:
1. **Date on every payment card**: for "Awaiting payment" — "Issued 06.08.2026"; for "Paid" — "Paid 04.08.2026, 14:32"; for "Payment error" — "Attempted 04.08.2026, 11:05". Date format matches the rest of the cabinet, with time.
2. **Electronic receipt** for the "Paid" status: a "Receipt" action on the card → receipt modal:
   - header: "Electronic receipt" + payment number;
   - body (`.rv` rows as in the review blocks): service and application number, receiving agency, payer, payment date and time, payment method, amount, fee (if any), total;
   - fiscal block: transaction number + QR (the `openQr`/`bpQR` generator already exists) for receipt verification;
   - actions: "Download PDF", "Close".
3. For "Payment error" — a "Retry payment" action (existing payment flow), no receipt.
4. **One currency format across the section**: the screenshot shows list amounts as "20,00 TJS" while the "Due" block says "86,40 смн.". Normalize to the i18n format ("смн." in RU, "смн." in TG, "TJS" in EN) in every row of the section.
5. The section inherits the status vocabulary: Paid → `--success`, Awaiting payment → `--warning`, Payment error → `--danger`.

**Data (MVP)**: a payment gains `createdAt`, `paidAt?`, `failedAt?`, `method`, `transactionId`, `receiptUrl`; `GET /payments/{id}/receipt` — receipt data.

**Prototype changes**: a new "Payments" pane in `citizen/index.html` (added to the profile navigation between "My applications" and "Contacts"), a render module modeled on `renderApplications()` in `citizen-expansion.js`, demo data from the existing amounts (86,40 · 35,00 · 20,00 смн.), the receipt modal, keys `pay.list.*`, `pay.receipt.*` in i18n.

**Acceptance criteria**:
- [ ] Every payment shows a date matching its status (issued / paid / attempted).
- [ ] A paid payment opens a receipt with all fields and a QR; "Download PDF" delivers a file.
- [ ] Unpaid and failed payments have no "Receipt" button.
- [ ] All amounts in the section use one currency format.
- [ ] Receipt modal: focus trap, Esc, focus return; light/dark, RU/TG.

---

### F5. Admin dashboard: a business-metrics screen — **P0**, L

> Feedback (pp. 4–5): «Необходимо переработать дашборд администратора. Сейчас на дашборде нет ни одного показателя — только блок „Конструктор" (ссылки: Реестр услуг, Новая услуга, Редактор форм) и блок „Как это работает" с шагами 01–05. Это экран-навигация, а не рабочий экран: администратор после входа не видит ни состояния услуг, ни того, что требует его действия. При этом в п. 3.1 ТЗ дашборд определён как экран бизнес-показателей».
> Translation: "The admin dashboard must be reworked. Right now it has not a single metric — only the 'Constructor' block (links: Service registry, New service, Form editor) and the 'How it works' block with steps 01–05. It is a navigation screen, not a working screen: after logging in the administrator sees neither the state of the services nor what requires their action. Meanwhile ToR §3.1 defines the dashboard as a business-metrics screen." The full list of required metrics follows — carried into the requirements below, 1:1.

**Current state**: `admin/index.html` — hero copy, three "Constructor" cards and the "How it works" 01–05 onboarding. Zero metrics. The registry (`admin/services.html`) can already filter and has KPI shortcut cards — but only for two statuses (Active/Drafts) and without reading URL parameters.

**To do — dashboard contents (every item from the feedback, nothing dropped)**:

1. **Counter row** (`.metric-strip`, every counter is a link):
   - total services (across all statuses);
   - "Draft" (DRAFT);
   - "In review" (IN_REVIEW);
   - "Awaiting publication" (approved but not yet published = APPROVED);
   - "Published" (PUBLISHED);
   - "Configuration errors" (`.metric--danger`) — services that failed the sandbox run or have unfilled mandatory constructor steps.
2. **"My review tasks"** (`.panel` with a list): drafts awaiting the current user's action in the "Approver" role (in low-code demo terms — the reviewer role from `apps/admin/js/lowcode.js`): service, agency, version, SLA deadline, status pill, "Open review" action → `review.html`. Empty state: "No review tasks."
3. **"SLA violations — by agency"** (`.panel` + `.data-table`): agency, service, stage, overdue time (days/hours), `--danger` accent; a row leads to the service card.
4. **"Recent changes"** (audit feed): who changed what and when — author, service, change type, date and time.
5. **"Test results"**: outcomes of the latest sandbox runs — service, version, date and time, success/failure (`status-pill --success/--danger`).
6. **"Recent publications"**: service, version, publishing author, date and time.
7. **Every counter is clickable** → opens the service registry with the corresponding status filter pre-applied.

**Layout** (desktop ≥1280): row 1 — 6 metrics in a strip; row 2 — two columns: "My review tasks" (⅗) + "SLA violations" (⅖); row 3 — three feed panels: changes / tests / publications (tabs `.tabs` on narrow screens). Below — a compact "Constructor" quick-actions row (Registry · New service · Form editor) as buttons, not full-bleed cards. Remove the "How it works" onboarding from the dashboard: move it into a collapsible help block on `new-service.html` or behind a "?" button in the top bar — still available to newcomers, no longer occupying the working screen.

**Counter link contract**: `services.html?status=draft|in_review|approved|published|errors`. Registry work:
- extend the status filter vocabulary from today's "Active/Drafts" to the full set: Draft · In review · Awaiting publication · Published · Configuration error (segment `#stFilter` + KPI cards);
- read `status` from the URL on load and apply it (today the filter hard-starts at `all` — `admin/services.html`, registry script);
- migrate the row status pills to the canonical `status-pill` vocabulary.

**Roles**: the "My review tasks" block depends on the current user's role. In the prototype the role comes from the existing low-code demo switcher (author / reviewer / portal-admin): author sees "Changes requested" on their services, reviewer sees the review queue, portal-admin sees "Awaiting publication".

**Data (MVP)**: `GET /admin/dashboard` → status counters, current-role tasks, SLA violations (threshold rules — question #5), latest N audit events, sandbox runs, publications. In the prototype — deterministic fixtures + live values from `service-drafts.js` / `lowcode.js` (the drafts counter is already computed for `#draftServiceCount` — reuse it).

**Prototype changes**: `admin/index.html` (full replacement of `main.admin-overview` content), `apps/admin/app.css`, `apps/admin/js/builder.js` (dashboard data; the rail stays untouched), `admin/services.html` (URL params + full status vocabulary), `apps/admin/js/builder-i18n.js` (tg/ru/en keys).

**Acceptance criteria**:
- [ ] After login the admin sees all 6 counters and all 5 information blocks from the feedback — no scrolling "into the void"; the 01–05 onboarding is gone from the dashboard.
- [ ] Clicking each counter opens the registry with the matching filter applied (verify all 6, including "total" = "All" filter).
- [ ] "Configuration errors" and SLA overruns are visually flagged (danger); zero values render neutrally.
- [ ] Switching the demo role changes the contents of "My review tasks".
- [ ] Every row of every block leads to a meaningful screen (service / review / registry).
- [ ] Light/dark, tg/ru, 1280px and 1536px; tables don't break the grid at 768px (horizontal scroll inside `.data-table-wrap`).

---

### F6. Citizen dashboard: "Services under review" block with tracking — P1, M

> Feedback (p. 6, top): «Добавить раздел услуг, которые на данный момент находятся на рассмотрении ведомств, в которых можно отследить весь процесс и путь данной услуги».
> Translation: "Add a section for services currently under review by the agencies, where the whole process and path of the service can be tracked."

**Current state**: the cabinet dashboard shows personal data with sources and the passport-expiry warning. Active applications are visible only in the Applications section; the dashboard has none.

**To do**:
1. Add an **"Under review"** block to the dashboard (after the warning banner, before the data list): cards of active applications (statuses "Under review", "Action required", "Approved, awaiting issuance").
2. Card: service, application number, executing agency, status pill and a **mini progress path** — a compact `.stepper` of 5 canonical stages: Submitted → Auto-check → Agency review → Result issuance → Done; the current stage highlighted, with an ETA next to it ("expected by 13 June").
3. Clicking a card → the application detail with the full vertical history (the "Transparent history" already exists in the prototype: `application-history` in `citizen-expansion.js`; the 5-step timeline — in the mobile concept `#applicationTimeline`). Extend the detail with a "service path" row: which agency/office holds the application right now.
4. If there are no active applications — the block does not render (don't clutter the dashboard with an empty state).
5. "Action required" — a card with a `--warning` accent and an action button.

**Data (MVP)**: `GET /applications?status=active` with fields `stage` (enum of the 5 stages), `stageStartedAt`, `eta`, `currentAgency`.

**Prototype changes**: `citizen/index.html` (`#pane-data`), rendering in `apps/citizen/js/citizen-expansion.js` (the `appList()` data already carries statuses — add `stage`/`agency`), i18n keys `d.track.*`.

**Acceptance criteria**:
- [ ] The dashboard shows all active applications with the current stage and agency.
- [ ] The mini progress matches the status; "Action required" is highlighted and leads to the action.
- [ ] Clicking opens the detail with the full history and the application's "path".
- [ ] With no active applications the block is absent; nothing breaks.

---

### F7. Profile: profile photo — P2, S

> Feedback (p. 6 bottom – 7): «Возможность добавления и редактирования фотографии профиля» (красным обведён аватар «Г»).
> Translation: "The ability to add and edit a profile photo" (the "Г" avatar is circled in red).

**Current state**: the avatar is a letter on a colored background (`.prof-ava`, `.avatar` in the header); it cannot be changed.

**To do**:
1. On hover/focus of the profile-header avatar — a "Change photo" action (camera icon overlay, `aria-label`).
2. Modal: file upload (jpg/png/webp, ≤ 5 MB), circular preview with scaling (center crop is enough in the prototype), buttons "Save", "Remove photo" (falls back to the letter), "Cancel".
3. The avatar updates everywhere: the profile header and the avatar button in the top bar.
4. Validation: non-image and oversize files — an inline error inside the modal (`field-error`), no toasts.
5. **The prototype does not persist the photo** (privacy rule): the objectURL lives until the session ends; an explainer line in the modal — "Demo: the photo is not stored on a server." In the MVP — upload to storage; moderation requirements — question #6.

**Prototype changes**: `citizen/index.html` (profile header + modal), `apps/citizen/js/app.js`, `apps/citizen/app.css`, i18n `p.photo.*`.

**Acceptance criteria**:
- [ ] A photo can be added, replaced and removed; the letter fallback returns after removal.
- [ ] The avatar changes synchronously in the top bar and the profile.
- [ ] An invalid file shows a clear error; the modal stays open.
- [ ] Fully keyboard-operable; focus lands back on the avatar after closing.

---

## 5. Execution order

The tasks are almost fully independent — no cross-blocking between developers. Recommended waves:

**Wave 1 (P0):**
1. F5 — admin dashboard (the largest; it drags in the registry status vocabulary — do it first, the vocabulary helps F3);
2. F3 — applications sort and filters;
3. F4 — payments: date + receipt (creates the Payments pane in the prototype).

**Wave 2 (P1):** F1 → F2 (a shared document detail viewer: first the detail view and QR, then the "received" files); F6 (reuses the statuses/stages from F3).

**Wave 3 (P2):** F7.

Dependencies: F2 uses the viewer from F1; F6 uses the canonical statuses/sort from F3; the registry filter extension happens inside F5 and nobody else needs it.

Total: ~2–2.5 weeks for one frontend developer, or one week with two working in parallel (wave 1 splits cleanly: F5 — admin, F3+F4 — cabinet).

---

## 6. QA plan

Automated tests — Playwright, inside the existing `qa/` structure:

| File | What it verifies |
|------|------------------|
| `qa/functional/citizen-documents.spec.js` (new) | F1: card → detail (passport: 2 sides), corner QR → modal, Esc/focus; F2: files appear after the journey, download works, owner filter |
| `qa/functional/citizen-applications.spec.js` (new) | F3: date order descends, each filter and combinations, reset, empty state, query parameters |
| `qa/functional/citizen-payments.spec.js` (new) | F4: date on every card, receipt only on "Paid", receipt contents, single currency format |
| `qa/functional/admin-dashboard.spec.js` (new) | F5: 6 metrics + 5 blocks render, each counter click → registry with the filter applied (assert URL and segment state), role switch changes "My review tasks" |
| `qa/functional/workflows.spec.js` (extend) | F6: "Under review" block on the dashboard, navigation to the detail with history; F7: photo upload/removal |
| `qa/visual/visual.spec.js` (extend) | Snapshots: admin dashboard, payments, document detail — light+dark |
| `qa/accessibility/a11y.spec.js` (run) | No new violations on any changed screen |
| `qa/privacy/storage.spec.js` (extend) | F7: after a photo upload localStorage has no new keys outside `ekh.preferences.*` |
| `qa/responsive/responsive.spec.js` (extend) | Application filters and admin metrics at 390/768/1280 |

Manual pass before handover: RU and TG on every screen (text overflow), dark theme, `prefers-reduced-motion`, keyboard walkthrough of the new modals.

---

## 7. Open questions for the client

1. **F1**: does the corner QR button replace "Поделиться" (Share) on the card, or do both live together? (Recommendation: replace; "Share" stays inside the document detail view.)
2. **F2**: is the Word format really required? (Recommendation: legally significant documents — signed PDF only; keep DOCX for editable application templates if those ever appear.)
3. **F4**: does the payment card show both dates (issued and paid) or one per status? (Recommendation: one per status on the card, both inside the receipt.)
4. **F4**: does the receipt need a fiscal QR / number per Tajikistan Tax Committee requirements? If so, whose format?
5. **F5**: SLA rules (per-agency threshold per review stage) — where do the norms for the "SLA violations" block come from?
6. **F7**: photo requirements (moderation, dimensions, storage location) for the MVP.
7. **F5**: confirm the term "Awaiting publication" = the APPROVED status (approved, not published) — as in the ToR metrics list.

---

## 8. Definition of Done (shared handover checklist)

- [ ] All acceptance criteria of F1–F7 are checked off.
- [ ] All new strings are in the tg/ru/en dictionaries; no hardcoded copy in the markup.
- [ ] Light/dark themes and RU/TG verified on every changed screen.
- [ ] `npm run build` is green; the tests from section 6 pass locally.
- [ ] No personal data appeared in localStorage (run `qa/privacy/storage.spec.js`).
- [ ] Before/after screenshots attached to the PR — one per task (for the client report against each feedback item).
