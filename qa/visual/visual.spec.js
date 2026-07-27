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
      if (platform === 'tson') await expect(page.locator('#screen .s-login')).toBeVisible();
      await expect(page).toHaveScreenshot(`${platform}-desktop-${variant.theme}-${variant.lang}.png`, { fullPage: true, animations: 'disabled' });
    }
  });
}
