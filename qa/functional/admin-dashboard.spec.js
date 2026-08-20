import { test, expect } from '@playwright/test';

test('admin dashboard is header, KPIs, tasks + SLA, and one activity feed', async ({ page }) => {
  await page.goto('/admin/?lang=ru&theme=light');
  await expect(page.locator('[data-metric-status]')).toHaveCount(6);
  await expect(page.locator('.dashboard-primary .panel')).toHaveCount(2);
  await expect(page.locator('.dashboard-activity')).toHaveCount(1);
  await expect(page.locator('.dashboard-quick')).toHaveCount(0);
  await expect(page.locator('[data-activity-view]')).toHaveCount(4);
});

test('the demo role has exactly one control, and it drives the task panel', async ({ page }) => {
  await page.goto('/admin/?lang=ru&theme=light');
  await expect(page.locator('[data-lc-role]')).toHaveCount(1);
  await expect(page.locator('.adm-top [data-lc-role]')).toHaveCount(1);

  await page.locator('[data-lc-role]').selectOption('reviewer');
  const reviewerCount = await page.locator('.dashboard-tasks .dashboard-row').count();
  expect(reviewerCount).toBeGreaterThan(0);
  await expect(page.locator('.dashboard-tasks .dashboard-count')).toHaveText(String(reviewerCount));

  await page.locator('[data-lc-role]').selectOption('portal-admin');
  await expect.poll(() => page.locator('.dashboard-tasks .dashboard-row').count()).not.toBe(reviewerCount);
  await expect(page.locator('.dashboard-tasks .dashboard-row').first()).toHaveAttribute('href', /review\.html\?service=/);

  /* an author with nothing to fix gets the §6 empty state, not a blank panel */
  await page.locator('[data-lc-role]').selectOption('agency-author');
  await expect(page.locator('.dashboard-tasks .dashboard-empty')).toBeVisible();
  await expect(page.locator('.dashboard-tasks .dashboard-count')).toHaveText('0');
});

test('the activity feed is one panel with a working view switcher', async ({ page }) => {
  await page.goto('/admin/?lang=ru&theme=light');
  const all = await page.locator('.dashboard-activity .dashboard-row').count();
  await page.locator('[data-activity-view="publication"]').click();
  const publications = await page.locator('.dashboard-activity .dashboard-row').count();
  expect(publications).toBeGreaterThan(0);
  expect(publications).toBeLessThan(all);
  await expect(page.locator('[data-activity-view="publication"]')).toHaveAttribute('aria-selected', 'true');
});

for (const status of ['draft','in_review','approved','published','errors']) {
  test(`admin ${status} metric applies registry filter`, async ({ page }) => {
    await page.goto('/admin/');
    await page.locator(`[data-metric-status="${status}"]`).click();
    await expect(page).toHaveURL(new RegExp(`services\\.html\\?status=${status}`));
    await expect(page.locator('#stFilter')).toHaveValue(status);
    await expect(page.locator('.ekh-list-row:visible')).not.toHaveCount(0);
  });
}

test('admin total metric opens the unfiltered registry', async ({ page }) => {
  await page.goto('/admin/');
  await page.locator('[data-metric-status="all"]').click();
  await expect(page).toHaveURL(/services\.html$/);
  await expect(page.locator('#stFilter')).toHaveValue('all');
});
