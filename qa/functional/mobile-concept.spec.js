import { test, expect } from '@playwright/test';

test('mobile concept exposes the adapted top-level navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mobile/?mode=app&theme=light&lang=ru');

  const navigation = page.locator('.bottom-nav');
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('button')).toHaveCount(5);
  await expect(navigation.getByRole('button', { name: 'Главная' })).toHaveAttribute('aria-current', 'page');

  await navigation.getByRole('button', { name: 'Документы' }).click();
  await expect(page.locator('#screen-wallet')).toBeVisible();
  await page.locator('.document-card--passport').click();
  await expect(page.locator('#qrModal')).toBeVisible();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.locator('#qrModal')).toBeHidden();
});

test('passport service completes the focused three-step mobile flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mobile/?mode=app&theme=light&lang=ru');

  await page.locator('.bottom-nav').getByRole('button', { name: 'Услуги' }).click();
  await page.locator('#serviceSearch').fill('паспорт');
  await expect(page.locator('.service-row')).toHaveCount(1);
  await page.locator('.service-row').click();
  await expect(page.locator('#serviceSheet')).toBeVisible();
  await page.locator('#startService').click();

  await expect(page.locator('#flowStep1')).toBeVisible();
  await page.locator('#flowStep1').getByRole('button', { name: 'Продолжить' }).click();
  await page.getByText('Доставка домой', { exact: true }).click();
  await page.locator('#flowStep2').getByRole('button', { name: 'Продолжить' }).click();
  await page.locator('#flowConsent').check();
  await page.locator('#submitApplication').click();

  await expect(page.locator('#flowSuccess')).toBeVisible();
  await expect(page.getByText('№ТҶ-2026-184551', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'К заявлениям' }).click();
  await expect(page.locator('#screen-applications')).toBeVisible();
  await expect(page.locator('#newApplicationCard')).toBeVisible();
});
