# 8–12 minute agency demo

## Before the room joins

1. Run `npm install` once, then `npm run dev`.
2. Open `http://localhost:5173/?dev=1&theme=light&lang=tg`.
3. Use “Reset all demo state”.
4. Replace the URL with `http://localhost:5173/?present=1&theme=light&lang=tg`.
5. Use a window at least 1440×900. Keep a second tab available for a 390-pixel Citizen mobile view if desired.

The examples are fixtures, not real citizens or applications. Never enter real personal information.

## Walkthrough

### 0:00–1:00 — One eKhizmat family

On the launcher, point out the four clear destinations, shared visual language, Tajik/Russian language control, and light/dark theme. Explain that each card is a normal link and each product has a clean URL.

### 1:00–3:30 — Citizen (`1`)

Use search or choose a category. Open a life event, then sign in with any non-empty demo phone number. Citizen sign-in is intentionally phone-only in this prototype; it does not silently invent a password or second-factor step. Show profile/wallet, open a document QR, close it, and sign out. If using the mobile tab, show the same content at 390 pixels.

### 3:30–5:30 — ЦОН Operator (`2`)

The assigned workstation username is prefilled. Enter any non-empty demo password, then any six digits except `111111`. Passwords and verification codes are never prefilled. Begin a visit and show how identification, consent, service selection, scope, form/documents, and result form one controlled session. End the visit and explain that citizen information is wiped from memory, page content, storage, and the URL.

ЦОН intentionally asks for a wider window below 1280 pixels; that is a documented workstation requirement.

### 5:30–7:30 — Ministry Specialist (`3`)

The assigned staff username is prefilled. Enter any non-empty demo password, then any six digits except `111111`; sensitive values start empty here too. Show the compact queue, filtering/sorting, an application detail, its tabs and provenance/SLA signals. Demonstrate “request information” or the decision dialog, mentioning four-eyes approval for sensitive outcomes.

### 7:30–9:30 — Service Administrator (`4`)

Show the service registry and start the new-service wizard. Open the builder, add a field, inspect the three-pane structure, preview, and open the publish gate. Explain that the editor density differs from Citizen while still using the same tokens, controls, icons, dialogs, and focus behavior.

### 9:30–10:30 — Close

Open the Platforms menu and return to the launcher (`0`). Briefly switch theme or language and show that the choice follows navigation. Finish with the idea: four specialized jobs, one recognizable government service family.

## If a rehearsal needs restarting

Open the current route with `?dev=1`, use “Reset platform” for only that app or “Reset all” for the complete demo, then return to the presentation URL. Reloading Ministry resets its in-memory application fixtures. Ending a ЦОН visit performs its own privacy teardown.
