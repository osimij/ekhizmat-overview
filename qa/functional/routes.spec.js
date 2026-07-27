import { test, expect } from '@playwright/test';

const routes = ['/', '/citizen/', '/tson/', '/ministry/', '/admin/', '/admin/services.html', '/admin/new-service.html', '/admin/builder.html', '/design-system/styleguide.html'];

for (const route of routes) {
  test(`${route} loads without page errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('launcher exposes exactly four real platform links', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.platform-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')))).resolves.toEqual([
    '/citizen/',
    '/tson/',
    '/ministry/',
    '/admin/',
  ]);
});

test('launcher theme and language follow navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /забон/i }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: /тема/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.platform-card--citizen').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('citizen search, sign-in dialog and shared switcher work', async ({ page }) => {
  await page.goto('/citizen/');
  await page.locator('#searchInput').fill('шиноснома');
  await expect(page.locator('#searchPop')).toHaveClass(/open/);
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginOverlay')).toHaveClass(/is-open/);
  await expect(page.locator('#loginPhone')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#loginOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
});

test('admin registry to builder route remains intact', async ({ page }) => {
  await page.goto('/admin/services.html');
  await expect(page.locator('.bp-bar')).toBeHidden();
  await page.getByRole('link', { name: /Хизмати нав/ }).first().click();
  await expect(page).toHaveURL(/new-service\.html/);
  await page.goto('/admin/builder.html');
  await expect(page.locator('.bld-work')).toBeVisible();
  await page.locator('#addField').click();
  await expect(page.locator('#paletteModal')).toHaveClass(/is-open/);
});

test('ministry and TSON boot their operational gates', async ({ page }) => {
  await page.goto('/ministry/');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
  await page.goto('/tson/');
  await expect(page.locator('#screen')).not.toBeEmpty();
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
  await expect(page.locator('.fatal')).toHaveCount(0);
  await expect(page.getByText('АРМ не запустился', { exact: false })).toHaveCount(0);
});

test('developer mode can reset only the current platform demo state', async ({ page }) => {
  await page.goto('/admin/?dev=1&lang=ru');
  await page.evaluate(() => localStorage.setItem('ekh.admin.rail', '1'));
  const tools = page.locator('[data-demo-tools]');
  await expect(tools).toBeVisible();
  await tools.getByRole('button', { name: 'Сбросить платформу' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ekh.admin.rail'))).toBeNull();
});
