import { test, expect } from '@playwright/test';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

async function signIn(page, lang = 'ru', theme = 'light') {
  if (page.url().startsWith('http')) await page.evaluate(() => sessionStorage.removeItem('ekh.ministry.arm'));
  await page.goto(`/ministry/?lang=${lang}&theme=${theme}&present=1`);
  await completeMinistryLogin(page);
}

test('Ministry filters preserve keyboard focus, URL state and an actionable empty state', async ({ page }) => {
  await signIn(page);
  const service = page.locator('.filter-select--svc .filter-select__trigger');
  await service.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(service).toBeFocused();
  await expect(page).toHaveURL(/svc=/);
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(service).not.toContainText('Все услуги');
  await page.locator('#top-search').fill('несуществующее заявление');
  await expect(page.locator('.queue-panel .empty')).toBeVisible();
  await expect(page.locator('#queue-result-count')).toHaveText('0 зап.');
  await expect(page).not.toHaveURL(/несуществующее|%D0|q=/);
  await page.locator('[data-act="filters-reset"]').click();
  await expect(page.locator('#top-search')).toHaveValue('');
  await expect(page.locator('.q-row')).toHaveCount(9);
  await expect(page).not.toHaveURL(/svc=|status=|sla=/);
});

test('Ministry selection is keyboard accessible and reports partial selection', async ({ page }) => {
  await signIn(page);
  const checkbox = page.locator('.q-row input').first();
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeFocused();
  await expect(checkbox).toBeChecked();
  expect(await page.locator('[data-act="sel-all"]').evaluate(el => el.indeterminate)).toBe(true);
  const partialMark = await page.locator('[data-act="sel-all"]').evaluate(el => ({
    fill: getComputedStyle(el).backgroundColor,
    checkedFill: getComputedStyle(document.querySelector('.q-row input:checked')).backgroundColor,
    dash: getComputedStyle(el, '::after').height,
  }));
  expect(partialMark.fill).toBe(partialMark.checkedFill);
  expect(parseFloat(partialMark.dash)).toBeLessThanOrEqual(2);
  await expect(page.locator('.batchbar')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.batchbar')).toHaveCount(0);
  const record = page.locator('.q-service__name').first();
  await record.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card-head h1')).toBeVisible();
});

test('Ministry queue geometry preserves identity and shared columns in both locales', async ({ page }) => {
  for (const [lang, theme] of [['ru', 'light'], ['tg', 'dark']]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, lang, theme);
    const geometry = await page.evaluate(() => {
      const head = [...document.querySelector('.q-head').children].map(el => el.getBoundingClientRect());
      const row = [...document.querySelector('.q-row').children].map(el => el.getBoundingClientRect());
      const numbers = [...document.querySelectorAll('.q-num')];
      const cards = [...document.querySelectorAll('.stat')].map(el => el.getBoundingClientRect());
      const title = document.querySelector('.view h1');
      return {
        columns: head.map((box, i) => Math.abs((box.left + box.right) / 2 - (row[i].left + row[i].right) / 2)),
        fullNumbers: numbers.every(el => el.scrollWidth <= el.clientWidth),
        widths: cards.map(box => Math.round(box.width)),
        titleSize: getComputedStyle(title).fontSize,
        titleLeft: title.getBoundingClientRect().left,
        panelLeft: document.querySelector('.queue-panel').getBoundingClientRect().left,
      };
    });
    expect(geometry.columns.every(delta => delta <= 1)).toBe(true);
    expect(geometry.fullNumbers).toBe(true);
    expect(new Set(geometry.widths).size).toBe(1);
    expect(geometry.titleSize).toBe('28px');
    expect(geometry.titleLeft).toBe(geometry.panelLeft);
    for (const width of [960, 620, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.locator('#top-search')).toBeVisible();
      expect(await page.locator('#main').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      const clipped = await page.locator('.q-row, .filter-select__trigger').evaluateAll(els => els.some(el => el.getBoundingClientRect().right > innerWidth));
      expect(clipped).toBe(false);
    }
  }
});

test('Ministry detail keeps actions reachable and returns to the originating registry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 640 });
  await signIn(page);
  await page.locator('.ekh-side__item[data-view="all"]').click();
  await page.locator('.q-row[data-id="a8"] .q-service__name').click();
  await expect(page.locator('.ekh-side__item[data-view="all"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-act="act-decide"]')).toBeInViewport();
  await page.locator('[data-act="tab"][data-tab="docs"]').click();
  await expect(page.locator('[data-act="tab"][data-tab="docs"]')).toBeFocused();
  await page.locator('.back-link').click();
  await expect(page.locator('.view h1')).toHaveText('Все заявления');
  await expect(page.locator('.q-sla--closed').first()).toHaveText('—');
  await page.locator('[data-act="notif-open"]').click();
  await expect(page.locator('#pop button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-act="notif-open"]')).toBeFocused();
});

test.describe('Ministry touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('search, selection and profile keep usable targets', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.topbar__search')).toHaveCSS('height', '44px');
    await page.locator('.q-row .q-checkbox').first().click({ position: { x: 2, y: 2 } });
    await expect(page.locator('.q-row input').first()).toBeChecked();
    await expect(page.locator('.card')).toHaveCount(0);
    await page.locator('[data-act="nav-toggle"]').click();
    await page.locator('[data-act="profile-open"]').click();
    const targets = await page.locator('.ministry-profile button').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect().height));
    expect(targets.every(height => height >= 44)).toBe(true);
    const popover = await page.locator('#pop').boundingBox();
    expect(popover.y).toBeGreaterThanOrEqual(0);
    expect(popover.y + popover.height).toBeLessThanOrEqual(844);
    await page.locator('[data-act="pref-lang"]').click();
    const languages = await page.locator('.ministry-profile .dd-menu').boundingBox();
    expect(languages.x).toBeGreaterThanOrEqual(0);
    expect(languages.x + languages.width).toBeLessThanOrEqual(390);
  });
});
