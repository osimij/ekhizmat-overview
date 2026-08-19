import { test, expect } from '@playwright/test';

test('shared origin stores only approved non-personal settings', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/citizen/');
  await page.locator('#loginBtn').click();
  await page.locator('#loginPhone').fill('+992 90 123 45 67');
  await page.locator('#loginGo').click();
  await page.goto('/ministry/');
  await page.goto('/admin/services.html');
  await page.goto('/tson/');
  const state = await page.evaluate(() => ({
    keys: Object.keys(localStorage),
    values: Object.values(localStorage),
    sessionKeys: Object.keys(sessionStorage),
    cookie: document.cookie,
    url: location.href,
  }));
  expect(state.keys.every(key => /^(ekh\.(preferences\.(theme|lang)|citizen\.auth|tson\.bind|admin\.rail|demo\.lowcode))$/.test(key))).toBeTruthy();
  expect(state.values.join(' ')).not.toMatch(/Фируза|Раҳимова|\+992|\d{9,}/);
  expect(state.sessionKeys).toEqual([]);
  expect(state.cookie).toBe('');
  expect(decodeURIComponent(state.url)).not.toMatch(/Фируза|Раҳимова|\d{9,}/);
});

test('Ministry demo application records are not persisted', async ({ page }) => {
  await page.goto('/ministry/');
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(JSON.stringify(storage)).not.toContain('vedomstvo');
  expect(JSON.stringify(storage)).not.toContain('apps');
  expect(JSON.stringify(storage)).not.toContain('notifs');
});

test('TSON wipes citizen data from memory, DOM, storage and URL when a visit ends', async ({ page }) => {
  await page.goto('/tson/?dev=1&lang=ru&theme=light');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();

  await page.keyboard.press('`');
  const demo = page.locator('.demo');
  await expect(demo).toBeVisible();
  await demo.getByRole('button', { name: 'Начать приём' }).click();
  await demo.getByRole('button', { name: 'Идентифицирован (push)' }).click();
  await demo.getByRole('button', { name: 'Согласие: подтвердить' }).click();
  await expect(demo.getByText('SESSION', { exact: true })).toBeVisible();
  await demo.getByRole('button', { name: 'Завершить приём' }).click();
  await expect(demo.getByText('IDLE', { exact: true })).toBeVisible();

  const audit = await page.evaluate(() => ({
    text: document.querySelector('#session-root')?.textContent || '',
    keys: Object.keys(localStorage),
    sessionKeys: Object.keys(sessionStorage),
    cookie: document.cookie,
    url: decodeURIComponent(location.href),
  }));
  expect(audit.text.trim()).toBe('');
  expect(audit.keys.every(key => /^(ekh\.(preferences\.(theme|lang)|tson\.bind))$/.test(key))).toBeTruthy();
  expect(audit.sessionKeys).toEqual([]);
  expect(audit.cookie).toBe('');
  expect(audit.url).not.toMatch(/Абду|Рахим|\d{9,}/);
});
