# eKhizmat - Design Principles

One page. If a decision contradicts this page, the decision is wrong.

## 1. Life moments, not departments

Citizens arrive with a situation ("I just had a baby"), never with a ministry name. Navigation, search and service bundles are organized around six life moments: a child, a business, a marriage, a move, a job loss, retirement. The portal resolves which offices are involved; the citizen never sees the org chart. Test for every new feature: can a person who knows nothing about government structure complete it?

## 2. Once only

Any fact the state already knows is never asked again. Forms open pre-filled from the citizen profile, hospital signals, and registries, and every pre-filled value shows its source ("from maternity hospital No. 3"). The only inputs we may request are the ones genuinely new to the state - in the birth journey that is exactly one field: the child's name.

## 3. Proactive, not reactive

The portal speaks first: it announces a birth signal, warns four months before a passport expires, and queues the renewal. A citizen should never have to remember a deadline the state already knows.

## 4. Radical transparency

Every application shows where it is, which office and role is reviewing it, how many are ahead in the queue, and a real time estimate ("1 day 4 hours this week"), never "5-30 business days". No black boxes: if a step exists, it is visible. Public trust statistics (applications today, average review time, recommendation rate) sit on the homepage because honesty is the trust strategy.

## 5. Fast and resilient

Speed is a feature: target under 1 second to first content on 3G. The prototype ships as a handful of same-origin files (no bundler, no external requests) with system-font fallback and CSS-only ornament. Motion is purposeful (spatial context, state change) and fully disabled under prefers-reduced-motion. Forms autosave so a dropped connection never loses work; offline filling with deferred submit is the architectural default.

## 6. Dignity

The government works for the citizen, so the interface speaks like a competent, calm human: active voice, second person, no legal jargon, no blame. Errors are stated as fixable facts without fines attached ("If something is wrong, it can be fixed at any time - no fines"). Emergency mode opens with reassurance ("Stay calm - we will restore everything now") before any task. Buttons name outcomes ("Submit all three applications"), not bureaucratic actions.

---

## Language and script (binding notes)

Tajik is the first language of the interface; Russian and English are equal citizens of every component. Components must survive 20-40% string expansion - test layouts in Tajik, not English.

Typeface: Inter v4+ (self-hosted), UI and content alike. Important correction to the original brief: Mirza is an Arabic-script typeface and cannot set Tajik, which officially uses Cyrillic. Any candidate font must cover the six Tajik Cyrillic extensions - Ғғ Ӣӣ Ққ Ӯӯ Ҳҳ Ҷҷ - in every weight used; verify before shipping, as many popular fonts fake or omit them.

## Visual identity (binding notes)

Heritage is identity, not decoration. One signature element - the eight-point Sogdian girih star - appears as the logo mark, journey progress stars, and wallet card watermark. Nowhere else.

The visual language: a warm paper canvas (#F4F3F0), white panels with hairline row dividers instead of bordered cards, and exactly one action color - blue #0088FF, reserved for primary buttons (pill-shaped, white text), links and active states. Identity and warmth come from the icon tiles: every category, life moment and list row carries its own hue (14 muted-but-alive pairs) and its own silhouette (squircle, circle, rounded square, leaf). Hovers on rows and menu items are soft rectangles; buttons are pills. No decorative shadows anywhere - a soft veil only on floating layers (menus, modal, toast). Red is destructive/emergency only. First-class dark theme keyed off html[data-theme] (recalibrated tints, not inverted colors).

Code lives in modules: index.html (markup + inline icon sprite), css/tokens|base|components|screens.css, js/i18n.js, js/app.js, services-data.js.

## Accessibility floor

WCAG 2.2 AA in both themes: 4.5:1 text contrast, 44px targets, a visible earth-colored focus ring on every control, full keyboard paths (including "/" to search), skip link, focus moved to headings on screen change, and aria-live status messages.
