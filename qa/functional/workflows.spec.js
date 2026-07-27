import { test, expect } from '@playwright/test';

test('Citizen category, profile, wallet, QR and logout flow', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light');
  await page.locator('.cat').first().click();
  await expect(page.locator('#scr-category')).toBeVisible();
  await page.locator('#scr-category [data-go="home"]').click();

  await page.locator('#loginBtn').click();
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'in');
  await page.locator('[data-go="profile"]').first().click();
  await expect(page.locator('#scr-profile')).toBeVisible();
  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-qr]').first().click();
  await expect(page.locator('#qrOverlay')).toHaveClass(/is-open/);
  await page.locator('#qrClose').click();
  await page.locator('#logoutBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'out');
});

test('Ministry MFA, queue, detail tabs and decision dialogs flow', async ({ page }) => {
  await page.goto('/ministry/?lang=ru&theme=light');
  await page.locator('[data-act="login-next"]').click();
  await expect(page.locator('#l-otp')).toBeVisible();
  await page.locator('[data-act="login-enter"]').click();
  await expect(page.locator('#app')).toBeVisible();

  await page.locator('#top-search').fill('ТҶ');
  await page.locator('#top-search').fill('');
  await page.locator('.q-row').first().click();
  await expect(page.locator('#tabpanel')).toBeVisible();
  await page.locator('[data-tab="docs"]').click();
  await page.locator('[data-tab="overview"]').click();

  const request = page.locator('[data-act="act-request"]');
  if (await request.count()) {
    await request.click();
    await expect(page.locator('#rm-type')).toBeVisible();
    await page.locator('[data-act="modal-cancel"]').click();
  }
  const decide = page.locator('[data-act="act-decide"]');
  if (await decide.count()) {
    await decide.click();
    await expect(page.locator('#overlay .modal[role="dialog"]')).toBeVisible();
    await page.locator('[data-act="modal-cancel"]').click();
  }
});

test('TSON MFA reaches the shift dashboard and exposes operational start', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('form').getByRole('button', { name: 'Войти' }).click();
  await expect(page.locator('.otp')).toBeVisible();
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();
  await expect(page).toHaveURL(/#\/idle/);
});

test('Admin new-service wizard, builder edit and publish gate flow', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=tg&theme=light');
  for (let step = 2; step <= 4; step += 1) {
    await page.locator('[data-step]:not([hidden]) [data-next]').click();
    await expect(page.locator(`[data-step="${step}"]`)).toBeVisible();
  }
  await page.locator('[data-step="4"] a[href="builder.html"]').click();
  await expect(page).toHaveURL(/builder\.html/);

  const before = await page.locator('.fb-item').count();
  await page.locator('#addField').click();
  await page.locator('#paletteModal [data-add="text"]').click();
  await expect(page.locator('.fb-item')).toHaveCount(before + 1);
  await page.locator('#publishBtn').click();
  await expect(page.locator('#publishModal')).toHaveClass(/open/);
  await expect(page.locator('#chkList .chk-row')).not.toHaveCount(0);
});
