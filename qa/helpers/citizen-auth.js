import { expect } from '@playwright/test';

export async function completeCitizenLogin(page, phone = '+992 90 000 00 00') {
  await page.locator('#loginPhone').fill(phone);
  await page.locator('#loginGo').click();
  await expect(page.locator('#loginOtpStep')).toBeVisible();
  const cells = page.locator('#loginOverlay .otp__cell');
  await expect(cells).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  if (await page.locator('#loginOverlay').evaluate((element) => /open|is-open/.test(element.className))) {
    await page.locator('#loginGo').click();
  }
  await expect(page.locator('#loginOverlay')).toBeHidden();
}
