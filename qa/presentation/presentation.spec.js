import { test, expect } from '@playwright/test';

test('presentation mode hides all prototype and developer controls', async ({ page }) => {
  for (const route of [
    '/?present=1',
    '/citizen/?present=1',
    '/tson/?present=1',
    '/ministry/?present=1',
    '/admin/?present=1',
    '/admin/services.html?present=1',
    '/admin/builder.html?present=1',
  ]) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'present');
    await expect(page.locator('[data-dev-only], [data-prototype]')).toBeHidden();

    if (route.startsWith('/tson/')) {
      await page.keyboard.press('`');
      await expect(page.locator('.demo')).toHaveCount(0);
    }
  }
});

test('number shortcuts switch platforms and ignore text fields', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');
  await expect(page).toHaveURL(/\/tson\//);
  await page.goto('/citizen/');
  await page.locator('#searchInput').focus();
  await page.keyboard.press('4');
  await expect(page).toHaveURL(/\/citizen\//);
});

test('deterministic demo query overrides stored preference without overwriting it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('ekh.preferences.theme', 'dark'); localStorage.setItem('ekh.preferences.lang', 'tg'); });
  await page.goto('/?theme=light&lang=ru&present=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  expect(await page.evaluate(() => localStorage.getItem('ekh.preferences.theme'))).toBe('dark');
});
