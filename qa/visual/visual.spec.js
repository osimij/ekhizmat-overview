import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`launcher ${theme} reference`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/?present=1&theme=${theme}&lang=tg`);
    await expect(page).toHaveScreenshot(`launcher-${theme}.png`, { fullPage: true, animations: 'disabled' });
  });
}

test('citizen mobile reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/citizen/?present=1&theme=light&lang=tg');
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
  await expect(page).toHaveScreenshot('citizen-mobile-light.png', { fullPage: true, animations: 'disabled' });
});

for (const variant of [{ theme: 'light', lang: 'ru' }, { theme: 'dark', lang: 'tg' }]) {
  test(`four platforms desktop ${variant.theme}/${variant.lang} reference matrix`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const platform of ['citizen', 'tson', 'ministry', 'admin']) {
      await page.goto(`/${platform}/?present=1&theme=${variant.theme}&lang=${variant.lang}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
      if (platform === 'tson') await expect(page.locator('#screen .login')).toBeVisible();
      await expect(page).toHaveScreenshot(`${platform}-desktop-${variant.theme}-${variant.lang}.png`, { fullPage: true, animations: 'disabled' });
    }
  });
}

test('Citizen Guest form and categorized cabinet references', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');
  await page.locator('.dd.acct .dd-btn').click();
  await page.locator('[data-acct="guest"]').click();
  await page.locator('.cat').first().click();
  await page.locator('[data-go="guestService"]').click();
  await expect(page).toHaveScreenshot('citizen-guest-form-mobile-light-ru.png', { fullPage: true, animations: 'disabled' });

  await page.locator('#scr-guest-service [data-go="home"]').first().click();
  await page.locator('#guestLoginBtn').click();
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  await page.locator('[data-go="profile"]').first().click();
  await page.locator('[data-pane="apps"]').click();
  await expect(page.locator('.application-category')).toHaveCount(6);
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 5000 });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveScreenshot('citizen-cabinet-categories-mobile-light-ru.png', { fullPage: true, animations: 'disabled' });
});

test('ЦОН centre and leadership dashboard references', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tson/?present=1&theme=light&lang=ru');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await page.getByRole('button', { name: /меню оператора/i }).click();
  await page.getByRole('menuitem', { name: /Руководитель отделения/ }).click();
  await expect(page.locator('.dashboard-kpis .metric')).toHaveCount(5);
  await expect(page).toHaveScreenshot('tson-center-dashboard-light-ru.png', { fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: /меню оператора/i }).click();
  await page.getByRole('menuitem', { name: /^Руководство/ }).click();
  await expect(page.locator('.dashboard-center-row')).toHaveCount(6);
  await expect(page).toHaveScreenshot('tson-leadership-dashboard-light-ru.png', { fullPage: true, animations: 'disabled' });
});

test('Low Code review workspace reference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/review.html?present=1&theme=light&lang=ru');
  await page.evaluate(() => localStorage.removeItem('ekh.demo.lowcode'));
  await page.reload();
  await expect(page.locator('#lowCodeReview .lc-service-card')).toBeVisible();
  await expect(page).toHaveScreenshot('admin-lowcode-review-light-ru.png', { fullPage: true, animations: 'disabled' });
});

test('August feedback citizen payments and document detail references', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth','1'));
  await page.reload();
  await page.locator('.avatar').click();
  await page.locator('[data-pane="payments"]').click();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveScreenshot('citizen-payments-desktop-light-ru.png', { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.001 });
  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-doc-id="passport"] .doc-open').click();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveScreenshot('citizen-document-detail-desktop-light-ru.png', { animations: 'disabled', maxDiffPixelRatio: 0.001 });
});

test('August feedback admin dashboard reference', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto('/admin/?present=1&theme=light&lang=ru');
  await expect(page.locator('[data-metric-status]')).toHaveCount(6);
  await expect(page).toHaveScreenshot('admin-business-dashboard-light-ru.png', { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.001 });
});

test('August feedback dark/Tajik references', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/citizen/?present=1&theme=dark&lang=tg');
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth','1'));
  await page.reload();
  await page.locator('.avatar').click();
  await page.locator('[data-pane="payments"]').click();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveScreenshot('citizen-payments-desktop-dark-tg.png', { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.001 });
  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-doc-id="passport"] .doc-open').click();
  await expect(page).toHaveScreenshot('citizen-document-detail-desktop-dark-tg.png', { animations: 'disabled', maxDiffPixelRatio: 0.001 });

  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto('/admin/?present=1&theme=dark&lang=tg');
  await expect(page.locator('[data-metric-status]')).toHaveCount(6);
  await expect(page).toHaveScreenshot('admin-business-dashboard-dark-tg.png', { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.001 });
});
