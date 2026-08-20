import { test, expect } from '@playwright/test';

const cases = [
  { name: 'launcher', route: '/', sizes: [[360, 800], [620, 800], [768, 1024], [960, 700], [1280, 720], [1440, 700], [1440, 1000], [1920, 1080]], noOverflow: true },
  { name: 'citizen', route: '/citizen/', sizes: [[320, 800], [360, 800], [390, 844], [768, 1024], [1024, 900], [1440, 1000]], noOverflow: true },
  { name: 'mobile concept', route: '/mobile/', sizes: [[320, 800], [360, 800], [390, 844], [768, 1024], [1024, 900], [1440, 1000]], noOverflow: true },
  { name: 'admin dashboard', route: '/admin/', sizes: [[390, 844], [768, 900], [1440, 900]], noOverflow: true },
  { name: 'admin services', route: '/admin/services.html', sizes: [[390, 844], [768, 900], [1440, 900]], noOverflow: true },
  { name: 'admin forms', route: '/admin/forms.html', sizes: [[390, 844], [768, 900], [1440, 900]], noOverflow: true },
  { name: 'admin form builder', route: '/admin/form-builder.html', sizes: [[390, 844], [768, 900], [1440, 900]], noOverflow: true },
  { name: 'admin new service', route: '/admin/new-service.html', sizes: [[390, 844], [768, 900], [1440, 900]], noOverflow: true },
  { name: 'admin builder', route: '/admin/builder.html', sizes: [[390, 844], [768, 900], [1024, 900], [1280, 900], [1440, 900], [1920, 1080]], noOverflow: true },
  { name: 'admin review', route: '/admin/review.html', sizes: [[390, 844], [768, 900], [1280, 900], [1440, 900]], noOverflow: true },
  { name: 'ministry', route: '/ministry/', sizes: [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]], noOverflow: true },
  { name: 'design system', route: '/design-system/styleguide.html', sizes: [[390, 844], [768, 1024], [1440, 1000]], noOverflow: true },
  { name: 'tson', route: '/tson/', sizes: [[1280, 720], [1366, 768], [1440, 900], [1920, 1080]] },
];

for (const item of cases) {
  for (const [width, height] of item.sizes) {
    test(`${item.name} renders at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${item.route}?present=1&theme=light&lang=tg`, { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toBeVisible();
      if (item.name !== 'launcher' && item.name !== 'design system' && item.name !== 'mobile concept') {
        await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
      }
      if (item.noOverflow) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      }
      if (item.name === 'tson') await expect(page.locator('body')).not.toHaveClass(/is-too-small/);
    });
  }
}

test('TSON keeps login usable below 1280px, then explains the workstation minimum', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/tson/?present=1&theme=light&lang=ru');
  await expect(page.locator('body')).toHaveClass(/is-too-small/);
  await expect(page.locator('.login')).toBeVisible();
  await expect(page.locator('.too-small')).toBeHidden();

  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await expect(page.locator('.too-small')).toBeVisible();
});
