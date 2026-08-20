import { expect } from '@playwright/test';

/** Demo sign-in: any password, then any 6 digits (auto-submits like ЦОН). */
export async function completeMinistryLogin(page, password = 'demo') {
  await page.locator('#l-pass').fill(password);
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  await expect(otp).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  if (await page.locator('[data-act="login-enter"]').count()) {
    await page.locator('[data-act="login-enter"]').click();
  }
  await expect(page.locator('#app')).toBeVisible();
}
