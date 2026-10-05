import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth', '1'));
  await page.reload();
});

test('the Citizen light canvas uses the requested off-white', async ({ page }) => {
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
});

test('the citizen bell previews notifications before opening the full view', async ({ page }) => {
  const bell = page.locator('#bellBtn');
  const popover = page.locator('#citizenNotifPop');

  await bell.click();
  await expect(bell).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toBeVisible();
  await expect(popover.locator('.notif-pop__item')).toHaveCount(3);

  await popover.getByRole('button', { name: 'Все уведомления' }).click();
  await expect(page).toHaveURL(/#\/notifs$/);
  await expect(popover).toBeHidden();
  await expect(bell).toHaveAttribute('aria-expanded', 'false');
});

test('the notification preview dismisses with Escape and category labels are regular', async ({ page }) => {
  const bell = page.locator('#bellBtn');
  await bell.click();
  await page.keyboard.press('Escape');

  await expect(page.locator('#citizenNotifPop')).toBeHidden();
  await expect(bell).toBeFocused();
  await expect(page.locator('.cat').first()).toHaveCSS('font-weight', '400');
});

test('the notification preview stays inside a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('#bellBtn').click();

  const box = await page.locator('#citizenNotifPop').boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(800);
});

test('signed in, the hero keeps its composition and sums up what needs the citizen', async ({ page }) => {
  // the same order as signed out — title, one line, search, catalogue — only the words change
  const order = await page.locator('.hero-in').evaluate((hero) =>
    [...hero.children].filter((el) => el.offsetParent !== null).map((el) => el.id || el.className.split(' ')[0]));
  expect(order.indexOf('searchWrap')).toBeLessThan(order.indexOf('cats'));
  await expect(page.locator('#helloH')).toHaveCSS('font-size', '32px');
  await expect(page.locator('#heroSub')).toBeHidden();
  // a selector over the cards below, never a literal (rule 49)
  await expect(page.locator('#heroSummary')).toHaveText('3 дела ждут вашего решения · 1 заявление на рассмотрении');
});

test('«for you» is a bento of borderless cards on the paper band the life situations share', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const layout = await page.locator('#feedSect').evaluate((section) => {
    const box = (el) => el.getBoundingClientRect();
    const cards = [...section.querySelectorAll('.fy-card')];
    const css = getComputedStyle(section);
    const title = box(section.querySelector('#fyH'));
    const grid = box(section.querySelector('.fy-grid'));
    const moments = section.nextElementSibling;
    return {
      background: css.backgroundColor,
      top: Math.round(title.top - box(section).top), bottom: Math.round(box(section).bottom - grid.bottom),
      nextIsPaper: getComputedStyle(moments).backgroundColor === css.backgroundColor,
      cards: cards.map((card) => {
        const c = getComputedStyle(card);
        return { width: Math.round(box(card).width), top: Math.round(box(card).top), bottom: Math.round(box(card).bottom),
                 border: c.borderTopWidth, radius: c.borderTopLeftRadius, pad: c.paddingLeft };
      }),
      column: (grid.width - 3 * parseFloat(getComputedStyle(section.querySelector('.fy-grid')).columnGap)) / 4,
    };
  });
  expect(layout.background).toBe('rgb(255, 255, 255)');
  expect(layout.nextIsPaper).toBe(true);
  expect([layout.top, layout.bottom]).toEqual([48, 48]);
  // every card: no border, the home's 24px corners and inset
  for (const card of layout.cards) expect([card.border, card.radius, card.pad]).toEqual(['0px', '24px', '24px']);
  // row one: the feature across two columns, the deadline and the bill one each; row two halves
  const [feature, pass, pay, apps, wallet] = layout.cards;
  expect(feature.width).toBe(Math.round(2 * layout.column + 16));
  expect([pass.width, pay.width]).toEqual([Math.round(layout.column), Math.round(layout.column)]);
  expect(apps.width).toBe(wallet.width);
  expect(new Set([feature, pass, pay].map((c) => c.bottom)).size).toBe(1);
  expect(new Set([apps, wallet].map((c) => c.bottom)).size).toBe(1);
  // the actions of row one end on one line (§5 casebook 1)
  const actionBottoms = await page.locator('.fy-task .fy-acts').evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().bottom)));
  expect(new Set(actionBottoms).size).toBe(1);
});

test('the bill is value first, with «all payments» as the paper twin of Pay', async ({ page }) => {
  const primary = page.locator('#payNow');
  const secondary = page.locator('.pay-link');
  await expect(page.locator('#payCard .pay-summary > *')).toHaveCount(2);
  await expect(page.locator('#paySum')).toHaveCSS('font-weight', '650');
  await expect(page.locator('#paySum')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(page.locator('.pay-summary > #payLabel')).toHaveText('Транспортный налог за 2026 год');
  const [primaryBox, secondaryBox] = await Promise.all([primary.boundingBox(), secondary.boundingBox()]);
  expect(secondaryBox.width).toBeCloseTo(primaryBox.width, 0);
  expect(secondaryBox.height).toBeCloseTo(primaryBox.height, 0);
  expect(secondaryBox.y).toBeGreaterThan(primaryBox.y); // stacked under it in a one-column card
  await secondary.click();
  await expect(page).toHaveURL(/#\/profile\/payments$/);
});

test('a quiet action sits a step above its card in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto(`/citizen/?lang=ru&theme=${theme}`);
    const { button, card } = await page.locator('.fy-pass').evaluate((el) => {
      // composite the (possibly translucent) pill over the card the way the browser paints it
      const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
      const lum = () => { const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      ctx.fillStyle = getComputedStyle(el).backgroundColor; ctx.fillRect(0, 0, 1, 1);
      const card = lum();
      ctx.fillStyle = getComputedStyle(el.querySelector('.fy-btn')).backgroundColor; ctx.fillRect(0, 0, 1, 1);
      return { button: lum(), card };
    });
    expect(button).toBeGreaterThan(card);
  }
});

test('«all notifications» is the same quiet link as the life situations’ «see all»', async ({ page }) => {
  const [mine, theirs] = await Promise.all(['#feedSect', 'section[aria-labelledby="momH"]'].map((scope) =>
    page.locator(`${scope} .sect-more`).evaluate((link) => {
      const css = getComputedStyle(link);
      return [css.fontSize, css.fontWeight, css.color];
    })));
  expect(mine).toEqual(theirs);
  await page.locator('#feedSect .sect-more').click();
  await expect(page).toHaveURL(/#\/notifs$/);
});

test('paying the bill closes ranks and the summary follows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const feature = await page.locator('#fyBirth').boundingBox();
  await page.locator('#payNow').click();
  await expect(page.locator('#payCard')).toBeHidden();
  // no hole: the deadline takes the bill's column
  const pass = await page.locator('.fy-pass').boundingBox();
  expect(pass.width).toBeCloseTo(feature.width, 0);
  await expect(page.locator('#heroSummary')).toHaveText('2 дела ждут вашего решения · 1 заявление на рассмотрении');
  // a wide card's action hugs its label instead of spanning 600px
  const action = await page.locator('.fy-pass .btn').boundingBox();
  expect(action.width).toBeLessThan(pass.width / 2);
});

test('confirming the birth takes the task off the home and lands the certificate in the wallet', async ({ page }) => {
  await expect(page.locator('#fySlot')).toBeVisible();
  await expect(page.locator('#fySlotReady')).toBeHidden();
  await page.locator('#fyBirth .btn-pri').click();
  await expect(page).toHaveURL(/#\/journey/);
  await page.locator('#childName').fill('Зарина');
  await page.locator('#toStep2').click();
  await page.locator('#toStep3').click();
  await page.locator('#consent').check();
  await page.locator('#submitAll').click();
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(page.locator('#fyBirth')).toBeHidden();
  await expect(page.locator('#fySlot')).toBeHidden();
  await expect(page.locator('#fySlotReady')).toContainText('Свидетельство о рождении - Зарина Рахимова');
  await expect(page.locator('#heroSummary')).toHaveText('2 дела ждут вашего решения · 1 заявление на рассмотрении');
  await page.locator('#fySlotReady').click();
  await expect(page.locator('#documentDetailH')).toHaveText('Свидетельство о рождении');
});

test('a wallet card on the home opens the document viewer', async ({ page }) => {
  await page.locator('[data-doc-open="passport"]').click();
  await expect(page.locator('#documentDetailOverlay')).toBeVisible();
  await expect(page.locator('#documentDetailH')).toHaveText('Паспорт');
  await page.locator('#documentDetailClose').click();
  await expect(page.locator('[data-doc-open="passport"]')).toBeFocused();
});

test('application trackers name the steps: the current one in ink, a finished one green to the end', async ({ page }) => {
  const [moving, done] = await page.locator('#feedSect .trk').evaluateAll((tracks) => tracks.map((track) =>
    [...track.querySelectorAll('.trk__step')].map((step) => ({
      weight: getComputedStyle(step).fontWeight,
      color: getComputedStyle(step).color,
      fill: getComputedStyle(step.querySelector('i')).backgroundImage !== 'none' ? 'half' : getComputedStyle(step.querySelector('i')).backgroundColor,
    }))));
  expect(moving.map((s) => s.weight)).toEqual(['400', '500', '400', '400']);
  expect(moving[1].fill).toBe('half');
  expect(moving[0].fill).not.toBe(moving[2].fill); // done is filled, upcoming is the bare track
  expect(new Set(done.map((s) => s.fill)).size).toBe(1);
  expect(done[3].weight).toBe('500');
  expect(done[3].color).not.toBe(done[0].color);
  // the status is in the accessible name, the drawing is hidden from it
  await expect(page.locator('#feedSect .fy-app').first()).toContainText('На рассмотрении');
  await expect(page.locator('#feedSect .trk').first()).toHaveAttribute('aria-hidden', 'true');
});

test('notification rows keep their glyph on the first line and compact actions', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/notifs');
  const row = page.locator('#scr-notifs .frow').first();
  const alignment = await row.evaluate((item) => {
    const icon = item.querySelector('.fic').getBoundingClientRect();
    const title = item.querySelector('b').getBoundingClientRect();
    return icon.top - title.top;
  });
  expect(alignment).toBeCloseTo(2, 0);
  const action = page.locator('#scr-notifs .fact .btn').first();
  await expect(action).toHaveClass(/btn-sm/);
  await expect(action).toHaveCSS('min-height', '36px');
});

test('the home is one rhythm: every band 48 in and out, one card corner, one gap, 96 to the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const rhythm = await page.evaluate(() => {
    const px = (el, prop) => getComputedStyle(el)[prop];
    const sections = [...document.querySelectorAll('#scr-home .home-sect')].filter((el) => el.offsetParent !== null);
    const last = sections.at(-1).querySelector('.news-grid').getBoundingClientRect().bottom;
    return {
      bands: sections.map((el) => [px(el, 'paddingTop'), px(el, 'paddingBottom')]),
      corners: [...new Set(['.fy-card', '.moment', '.news-card', '.app-card'].map((sel) => px(document.querySelector(sel), 'borderTopLeftRadius')))],
      gaps: [...new Set(['.fy-grid', '.moments', '.news-grid'].map((sel) => px(document.querySelector(sel), 'columnGap')))],
      insets: [...new Set(['.fy-card', '.moment', '.news-card'].map((sel) => px(document.querySelector(sel), 'paddingLeft')))],
      footer: Math.round(document.querySelector('footer').getBoundingClientRect().top - last),
    };
  });
  expect(rhythm.bands).toEqual([['48px', '48px'], ['48px', '48px'], ['48px', '48px']]);
  expect(rhythm.corners).toEqual(['24px']);
  expect(rhythm.gaps).toEqual(['16px']);
  expect(rhythm.insets).toEqual(['24px']);
  expect(rhythm.footer).toBe(96);
});

test('the account menu uses the quiet popover shadow', async ({ page }) => {
  await page.locator('.dd.acct .dd-btn').click();
  const shadow = await page.locator('.dd.acct .dd-menu').evaluate((menu) => getComputedStyle(menu).boxShadow);

  expect(shadow).toContain('2px 8px');
  expect(shadow).not.toContain('12px 36px');
});

test('life-situation cards group copy, keep two-line descriptions, and hover without a border', async ({ page }) => {
  const cards = page.locator('.moment');
  const first = cards.first();
  await expect(cards).toHaveCount(8);
  await expect(first.locator('.moment-copy')).toHaveCount(1);
  await expect(first.locator('.moment-copy > *')).toHaveCount(2);
  await expect(first.locator('.moment-title')).toHaveCSS('font-size', '16px');
  await expect(first.locator('.moment-title')).toHaveCSS('font-weight', '500');
  for (const description of await cards.locator('.moment-text').all()) {
    const lines = await description.evaluate((text) => Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2);
  }

  // illustrated cards hug the action, plain cards span it across the card
  // (none are illustrated until the set is complete — every card spans it today)
  const ctaWidths = await cards.evaluateAll((items) => items.map((card) => ({
    art: card.classList.contains('moment--art'),
    span: Math.round(card.getBoundingClientRect().width - card.querySelector('.moment-cta').getBoundingClientRect().width),
  })));
  for (const { art, span } of ctaWidths) {
    if (art) expect(span).toBeGreaterThan(100);
    else expect(span).toBe(24);
  }

  await expect(first).toHaveCSS('border-top-width', '0px');
  const restBackground = await first.evaluate((card) => getComputedStyle(card).backgroundColor);
  await first.hover();
  await expect(first).not.toHaveCSS('background-color', restBackground);
  await expect(first).toHaveCSS('border-top-width', '0px');
});
