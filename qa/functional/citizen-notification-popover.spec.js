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

test('the notification preview dismisses with Escape and category labels are medium', async ({ page }) => {
  const bell = page.locator('#bellBtn');
  await bell.click();
  await page.keyboard.press('Escape');

  await expect(page.locator('#citizenNotifPop')).toBeHidden();
  await expect(bell).toBeFocused();
  await expect(page.locator('.cat').first()).toHaveCSS('font-weight', '500');
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

test('the all-payments action is a ghost twin of the primary payment button', async ({ page }) => {
  const primary = page.locator('#payNow');
  const secondary = page.locator('.pay-link');
  const [primaryBox, secondaryBox] = await Promise.all([primary.boundingBox(), secondary.boundingBox()]);

  await expect(secondary).toHaveClass(/btn-ghost/);
  for (const text of ['.sum', '.pt']) {
    await expect(page.locator(`#payCard ${text}`)).toHaveCSS('text-align', 'left');
  }
  await expect(primary).toHaveCSS('text-align', 'center');
  await expect(secondary).toHaveCSS('text-align', 'center');
  await expect(page.locator('#payCard > .pay-summary')).toHaveCount(1);
  await expect(page.locator('.pay-summary > *')).toHaveCount(2);
  await expect(page.locator('.pay-summary')).toHaveCSS('gap', '0px');
  await expect(page.locator('#payCard > .pay-actions')).toHaveCount(1);
  await expect(page.locator('.pay-summary > #payLabel')).toHaveText('Транспортный налог за 2026 год');
  await expect(page.locator('#payNote')).toHaveCount(0);
  await expect(page.locator('.pay-actions > .btn')).toHaveCount(2);
  await expect(page.locator('.pay-actions')).toHaveCSS('gap', '4px');
  await expect(page.locator('.pay-actions')).toHaveCSS('margin-top', '24px');
  expect(secondaryBox.width).toBeCloseTo(primaryBox.width, 0);
  expect(secondaryBox.height).toBeCloseTo(primaryBox.height, 0);
  await secondary.click();
  await expect(page).toHaveURL(/#\/profile\/payments$/);
});

test('feed tabs use regular labels until selected', async ({ page }) => {
  const notificationTab = page.locator('#ftab-notif');
  const applicationTab = page.locator('#ftab-apps');

  await expect(notificationTab).toHaveCSS('font-weight', '500');
  await expect(applicationTab).toHaveCSS('font-weight', '400');
  await applicationTab.click();
  await expect(notificationTab).toHaveCSS('font-weight', '400');
  await expect(applicationTab).toHaveCSS('font-weight', '500');
});

test('feed row icons sit just below the start of their text for optical alignment', async ({ page }) => {
  for (const [tab, pane, row] of [
    ['#ftab-notif', '#fpane-notif', '.frow'],
    ['#ftab-apps', '#fpane-apps', '.app-row'],
    ['#ftab-pay', '#fpane-pay', '.frow'],
  ]) {
    await page.locator(tab).click();
    const alignment = await page.locator(`${pane} ${row}`).first().evaluate((item) => {
      const icon = item.querySelector('.fic').getBoundingClientRect();
      const title = item.querySelector('b').getBoundingClientRect();
      return { iconTop: icon.top, titleTop: title.top };
    });
    expect(alignment.iconTop - alignment.titleTop).toBeCloseTo(2, 0);
  }
});

test('notification row actions use the visibly compact button size', async ({ page }) => {
  const action = page.locator('#fpane-notif .fact .btn').first();
  await expect(action).toHaveClass(/btn-sm/);
  await expect(action).toHaveCSS('min-height', '36px');
  await expect(action).toHaveCSS('padding-top', '0px');
  await expect(action).toHaveCSS('padding-bottom', '0px');
});

test('the account menu uses the quiet popover shadow', async ({ page }) => {
  await page.locator('.dd.acct .dd-btn').click();
  const shadow = await page.locator('.dd.acct .dd-menu').evaluate((menu) => getComputedStyle(menu).boxShadow);

  expect(shadow).toContain('2px 8px');
  expect(shadow).not.toContain('12px 36px');
});

test('life-situation cards group copy, tighten metadata, and hover without a border change', async ({ page }) => {
  await expect(page.locator('#momH')).toHaveCSS('font-size', '20px');
  await expect(page.locator('#momH')).toHaveCSS('font-weight', '500');

  const cards = page.locator('.moment');
  const first = cards.first();
  await expect(cards).toHaveCount(6);
  await expect(first.locator('.mi svg')).toHaveCSS('width', '32px');
  await expect(first.locator('.mi svg')).toHaveCSS('height', '32px');
  await expect(first.locator('.moment-copy')).toHaveCount(1);
  await expect(first.locator('.moment-copy > *')).toHaveCount(2);
  for (const description of await cards.locator('.moment-copy p').all()) {
    const lines = await description.evaluate((text) => Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2);
  }

  const gap = await first.evaluate((card) => {
    const copy = card.querySelector('.moment-copy').getBoundingClientRect();
    const meta = card.querySelector('.meta').getBoundingClientRect();
    return meta.top - copy.bottom;
  });
  expect(gap).toBeCloseTo(12, 0);

  const wrapperBottomGap = await first.locator('.mt').evaluate((wrapper) => {
    const wrapperBox = wrapper.getBoundingClientRect();
    const metaBox = wrapper.querySelector('.meta').getBoundingClientRect();
    return wrapperBox.bottom - metaBox.bottom;
  });
  expect(wrapperBottomGap).toBeCloseTo(0, 0);

  const bottomAlignment = await cards.evaluateAll((items) => items.slice(0, 4).map((card) => {
    const cardBox = card.getBoundingClientRect();
    const textBox = card.querySelector('.mt').getBoundingClientRect();
    return cardBox.bottom - textBox.bottom;
  }));
  for (const inset of bottomAlignment) expect(inset).toBeCloseTo(21, 0);

  const borderBefore = await first.evaluate((card) => getComputedStyle(card).borderColor);
  await first.hover();
  await expect(first).toHaveCSS('background-color', 'rgb(250, 250, 250)');
  await expect(first).toHaveCSS('border-color', borderBefore);
});
