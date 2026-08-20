# 10–12 minute Guest, Cabinet, ЦОН, and Low Code demo

## Before the room joins

1. Run `npm install` once, then `npm run dev`.
2. Open `http://localhost:5173/?dev=1&theme=light&lang=tg`.
3. Use “Reset all demo state”.
4. Replace the URL with `http://localhost:5173/?present=1&theme=light&lang=tg`.
5. Use a window at least 1440×900. Keep a second tab available for a 390-pixel Citizen mobile view if desired.

The examples are fixtures, not real citizens or applications. Never enter real personal information.

## Walkthrough — five repeatable scenarios

### 0:00–0:40 — One eKhizmat family

On the launcher, point out the four clear destinations, shared visual language, Tajik/Russian language control, and light/dark theme. Explain that each row is a normal link and each product has a clean URL.

### 0:40–2:20 — Scenario 1: a Guest gets a service (`1`)

Open the account menu and switch from Person to Guest. Point out the neutral avatar, signed-out explanation, login CTA, four-category catalogue, and “Available without login” badges. Open the first category, choose the guest appointment, fill the centre/date/email fields, accept the checkbox, and submit. Finish on `GST-2026-0042` and explicitly read “Демо-заявка сформирована”: nothing was really sent.

### 2:20–4:00 — Scenario 2: applications by category

Use the Guest success-screen login CTA, enter any non-empty demo phone number, then open the profile and “My applications”. Show the six cards and total 16. Open “Identity and documents”, change a status filter, and point out that the category total remains 5. Open an application detail, show its timeline and any rejection reason, then use Back to return without a page reload.

### 4:00–5:40 — Scenario 3: children and account security

Open Family and note that only minor children appear. Try adding a birth date for an adult to show the inline error, then change it to a child date and add the required document and relationship. Open Security: 2FA starts enabled and asks for confirmation before disabling. Start the biometric setup, optionally show the error state, retry, and finish on success. Point out the visible “camera is not used” disclosure.

### 5:40–7:50 — Scenario 4: ЦОН management (`2`)

Enter any non-empty demo password, then any six digits except `111111`; passwords and codes never start prefilled. Open the operator menu and choose Centre Supervisor. Show the five current-centre KPIs and switch through normal, high queue, empty, loading, and error fixtures. Change to Leadership, filter the network including Guest audience, compare the six centres whose visits total 2,486, and open a centre row to drill back to its dashboard.

ЦОН intentionally asks for a wider window below 1280 pixels; that is a documented workstation requirement.

### 7:50–11:20 — Scenario 5: an agency creates and publishes a service (`4`)

Open the service registry as Agency Author and enter the Stage builder. Show Person + Guest audience, preview, version history, and the disabled Publish action. Send the service for review through the summary dialog. Open Review, change role to Reviewer, add the prepared document-format comment, and request changes. Return to Agency Author, reply, and resubmit; version 0.4 becomes 0.5. As Reviewer, approve. Show that the author still cannot publish, switch to Portal Administrator, confirm publication, and finish on “Published”.

### 11:20–12:00 — Cross-platform proof and close

If time permits, open Ministry (`3`) and show the Guest audience badge on the fixture application. Return to the launcher (`0`), switch theme or language, and show that the choice follows navigation. Finish with the design-system page: the same Guest, Face Scan, metric, status, comment, and empty/error patterns support every product.

Open the Platforms menu and return to the launcher (`0`). Briefly switch theme or language and show that the choice follows navigation. Finish with the idea: four specialized jobs, one recognizable government service family.

## If a rehearsal needs restarting

Open the current route with `?dev=1`, use “Reset platform” for only that app or “Reset all” for the complete demo, then return to the presentation URL. Reset restores Person mode, default-on 2FA, unconfigured biometrics, one child, the 16 applications, operator role, and Low Code status “Draft”. Reloading Ministry resets its in-memory fixtures. Ending a ЦОН visit performs its own privacy teardown.
