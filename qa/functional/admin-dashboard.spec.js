import { test, expect } from '@playwright/test';

test('admin dashboard renders the complete business overview and role-aware task', async ({ page }) => {
  await page.goto('/admin/?lang=ru&theme=light');
  await expect(page.locator('[data-metric-status]')).toHaveCount(6);
  await expect(page.locator('.dashboard-tasks')).toBeVisible();
  await expect(page.locator('.dashboard-primary .panel')).toHaveCount(2);
  await expect(page.locator('.dashboard-feed')).toHaveCount(3);
  const before=await page.locator('.dashboard-task strong').textContent();
  await page.locator('#dashboardRole').selectOption('reviewer');
  await expect.poll(()=>page.locator('.dashboard-task strong').textContent()).not.toBe(before);
});

for (const status of ['draft','in_review','approved','published','errors']) {
  test(`admin ${status} metric applies registry filter`, async ({ page }) => {
    await page.goto('/admin/');
    await page.locator(`[data-metric-status="${status}"]`).click();
    await expect(page).toHaveURL(new RegExp(`services\\.html\\?status=${status}`));
    await expect(page.locator(`#stFilter input[data-st="${status}"]`)).toBeChecked();
    await expect(page.locator('.svc-row:visible')).not.toHaveCount(0);
  });
}

test('admin total metric opens the unfiltered registry', async ({ page }) => {
  await page.goto('/admin/');
  await page.locator('[data-metric-status="all"]').click();
  await expect(page).toHaveURL(/services\.html$/);
  await expect(page.locator('#stFilter input[data-st="all"]')).toBeChecked();
});
