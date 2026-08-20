import { test, expect } from '@playwright/test';

async function signedIn(page, hash = '#/') {
  // seed the session before the app boots so a deep personal link opens directly
  await page.addInitScript(() => { try { localStorage.setItem('ekh.citizen.auth', '1'); } catch (e) {} });
  await page.goto(`/citizen/?lang=tg&theme=light${hash}`);
}

test('every citizen screen is linkable and Back returns instead of leaving', async ({ page }) => {
  await signedIn(page);

  // a category is a route, and its filter is allow-listed URL state
  await page.locator('.cat').first().click();
  await expect(page).toHaveURL(/#\/category\/docs/);
  await page.locator('#cpPay').selectOption('free');
  await expect(page).toHaveURL(/pay=free/);
  await page.reload();
  await expect(page.locator('#scr-category')).toBeVisible();
  await expect(page.locator('#cpPay')).toHaveValue('free');

  // Back from a category returns home, it does not exit the portal
  await page.locator('#scr-category [data-back]').click();
  await expect(page.locator('#scr-home')).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);

  // the filter param does not survive into a screen that has no filter
  await expect(page).not.toHaveURL(/pay=/);
});

test('a citizen profile pane is a route and survives reload', async ({ page }) => {
  await signedIn(page, '#/profile/security');
  await expect(page.locator('#pane-sec')).toBeVisible();
  await expect(page.locator('[data-pane="sec"]')).toHaveAttribute('aria-current', 'true');

  await page.reload();
  await expect(page.locator('#pane-sec')).toBeVisible();

  // signing out of a personal route lands on home, never on a dead pane
  await page.locator('#logoutBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'out');
  await expect(page.locator('#scr-home')).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
});

test('a personal deep link while signed out asks to sign in, then continues', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light#/profile/apps');
  await expect(page.locator('#loginOverlay')).toHaveClass(/open|is-open/);
  await expect(page.locator('#scr-home')).toBeVisible();
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  await expect(page.locator('#pane-apps')).toBeVisible();
  await expect(page).toHaveURL(/#\/profile\/apps/);
});

test('applications KPI filter, URL and reload stay in step', async ({ page }) => {
  await signedIn(page, '#/profile/apps?status=action');
  await expect(page.locator('.application-row')).toHaveCount(2);
  await expect(page.locator('.app-kpi[data-app-status="action"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.app-active')).toHaveCount(0); // the strip is for the unfiltered list

  // list -> detail -> Back keeps the filter
  await page.locator('.application-row').first().click();
  await expect(page.locator('.application-detail')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.application-row')).toHaveCount(2);
  await expect(page.locator('.app-kpi[data-app-status="action"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-app-status="all"]').click();
  await expect(page.locator('.application-row')).toHaveCount(16);
  await expect(page.locator('.app-active__row')).toHaveCount(3);
  await expect(page.locator('.mini-stepper')).toHaveCount(0);
});

test('the pending bill is one record: paying it clears the pane and the home aside', async ({ page }) => {
  await signedIn(page, '#/profile/payments');
  const due = await page.locator('.pay-kpis .app-kpi strong').first().textContent();
  await page.locator('#scr-profile [data-back]').click();
  await expect(page.locator('#paySum')).toHaveText(due.trim());

  await page.locator('#payNow').click();
  await expect(page.locator('#payCard')).toBeHidden();
  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await page.locator('[data-pane="payments"]').click();
  await expect(page.locator('.pay-kpis .app-kpi strong').first()).toHaveText(/^0/);
  await expect(page.locator('#paymentsRoot [data-pay-pending]')).toHaveCount(0);
});

test('the emergency flow revokes documents and Back returns to the pitch', async ({ page }) => {
  await signedIn(page, '#/emergency');
  await page.locator('#emergStart').click();
  await expect(page).toHaveURL(/#\/emergency\/documents/);
  await expect(page.locator('#emergForm')).toBeVisible();

  await page.locator('#emergForm input[type="checkbox"]').first().uncheck();
  await page.locator('#emergSubmit').click();
  await expect(page.locator('#emergError')).toBeVisible();

  await page.locator('#emergForm input[type="checkbox"]').first().check();
  await page.locator('#emergSubmit').click();
  await expect(page.locator('#emergDone')).toBeVisible();
  await expect(page.locator('#emergRevoked .s-row')).toHaveCount(1);

  await page.goBack();
  await expect(page.locator('#emergPitch')).toBeVisible();
  await expect(page.locator('#scr-emergency')).toBeVisible();

  // the temporary ID reached the wallet
  await page.goto('/citizen/?lang=tg&theme=light#/profile/wallet');
  await expect(page.locator('#docTemp')).toBeVisible();
});

test('preferences live in the profile popover, not in the header chrome', async ({ page }) => {
  // no ?theme= here: a demo query param deliberately outranks the stored choice
  await page.goto('/citizen/?lang=tg');
  await expect(page.locator('.hdr .dd.lang')).toHaveCount(0);

  // signed out: one quiet icon, identity rows hidden
  await page.locator('#prefsBtn').click();
  const pop = page.locator('#citizenProfilePop');
  await expect(pop).toBeVisible();
  await expect(pop.locator('.ekh-profile-pop__card')).toBeHidden();
  await expect(pop.locator('[data-logout]')).toBeHidden();
  await expect(pop.locator('.dd.lang .dd-btn')).toContainText('Тоҷикӣ');
  await expect(pop.locator('.dd.lang .dd-btn use[href$="#i-globe"]')).toHaveCount(1); // compact only
  await expect(pop.locator('.dd.lang .dd-btn .ekh-profile-pop__compact-icon')).toBeHidden();

  // the three-state theme row persists an explicit choice
  await pop.locator('[data-theme-choice="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(await page.evaluate(() => localStorage.getItem('ekh.preferences.theme'))).toBe('dark');

  // Escape closes the layer and hands focus back to the trigger
  await page.locator('#prefsBtn').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#citizenProfilePop')).toBeHidden();
  await expect(page.locator('#prefsBtn')).toBeFocused();
});
