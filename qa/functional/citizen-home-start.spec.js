import { test, expect } from '@playwright/test';

/* The home's «three steps» band, signed out: the steps as folder tabs, each
   opening a cropped piece of the real interface, and one round on first sight
   (apps/citizen/js/home-start.js, design guide §3 Citizen home — getting started). */

const selectedStep = page => page.locator('#start [role="tab"][aria-selected="true"]');

async function openHome(page) {
  await page.goto('/citizen/?lang=ru&theme=light');
}

test('the band sits between the life situations and the news, and is gone once signed in', async ({ page }) => {
  await openHome(page);
  const order = await page.evaluate(() => {
    const [life, start, news] = ['#momH', '#startSect', '#newsSect'].map(s => document.querySelector(s));
    return Boolean(life.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(start.compareDocumentPosition(news) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
  await expect(page.locator('#startSect')).toBeVisible();

  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth', '1'));
  await page.reload();
  await expect(page.locator('#startSect')).toBeHidden();
});

test('the steps are a vertical tablist: click and arrows open one panel at a time, at one height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const tabs = page.locator('#start [role="tab"]');
  const folder = page.locator('.start-folder');
  await expect(tabs).toHaveCount(3);
  await expect(page.locator('#start [role="tablist"]')).toHaveAttribute('aria-orientation', 'vertical');
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab1');
  await expect(page.locator('#startPanel1')).toBeVisible();
  await expect(page.locator('#startLogin')).toBeVisible();
  const height = await folder.evaluate(el => el.offsetHeight);

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab2');
  await expect(page.locator('#startPanel2')).toBeVisible();
  await expect(page.locator('#startPanel1')).toBeHidden();
  await page.keyboard.press('End');
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab3');
  await expect(tabs.nth(0)).toHaveAttribute('tabindex', '-1');
  await expect(tabs.nth(2)).toHaveAttribute('tabindex', '0');
  /* every panel shares one grid cell; at most 1px of reflow when the wallet's
     heavier weight is first downloaded (a hidden panel's text loads no font) */
  expect(Math.abs(await folder.evaluate(el => el.offsetHeight) - height)).toBeLessThanOrEqual(1);

  await tabs.nth(1).click();
  await expect(page.locator('#startPanel2')).toBeVisible();
  /* the chosen number is the selected well: solid blue, white digit */
  await expect.poll(() => page.locator('#startTab2 .start-n').evaluate(el => {
    const s = getComputedStyle(el);
    return [s.backgroundColor, s.color];
  })).toEqual(['rgb(0, 145, 255)', 'rgb(255, 255, 255)']);
});

test('on first sight the folder turns through the steps once, then waits on step one', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.addStyleTag({ content: '.start{--start-dwell:.4s}' });
  await expect(page.locator('#start')).not.toHaveClass(/is-touring/);
  await page.locator('.start-folder').scrollIntoViewIfNeeded();
  await expect(page.locator('#start')).toHaveClass(/is-touring/);
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab2');
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab3');
  await expect(page.locator('#start')).not.toHaveClass(/is-touring/);
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab1');
  /* once only: it stays on step one */
  await page.waitForTimeout(1200);
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab1');
});

test('a click hands the band to the citizen, and reduced motion never starts the round', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.addStyleTag({ content: '.start{--start-dwell:1s}' });
  await page.locator('.start-folder').scrollIntoViewIfNeeded();
  await expect(page.locator('#start')).toHaveClass(/is-touring/);
  await page.locator('#startTab3').click();
  await expect(page.locator('#start')).not.toHaveClass(/is-touring/);
  await page.waitForTimeout(1500);
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab3');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.locator('.start-folder').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(page.locator('#start')).not.toHaveClass(/is-touring/);
  await expect(selectedStep(page)).toHaveAttribute('id', 'startTab1');
});
