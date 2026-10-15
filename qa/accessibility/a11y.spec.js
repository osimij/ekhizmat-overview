import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

const pages = ['/', '/citizen/', '/mobile/', '/tson/', '/ministry/', '/admin/services.html', '/admin/forms.html', '/admin/form-builder.html', '/admin/review.html', '/design-system/styleguide.html'];
for (const theme of ['light', 'dark']) {
  for (const route of pages) {
    test(`${route} ${theme} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(`${route}${route.includes('?') ? '&' : '?'}present=1&theme=${theme}&lang=ru`, { waitUntil: 'networkidle' });
      // Axe samples rendered colors. Finish entrance animations first so it checks
      // the stable UI state instead of a translucent frame midway through a fade.
      // The shared theme module mounts after the app module; allow its 240 ms token
      // transition to settle before sampling contrast.
      await page.waitForTimeout(300);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => {
        document.getAnimations().forEach((animation) => {
          const endTime = animation.effect?.getComputedTiming().endTime;
          if (Number.isFinite(endTime)) animation.finish();
          else animation.cancel();
        });
      });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
      expect(serious, serious.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
    });
  }

  test(`Ministry form builder ${theme} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(`/ministry/?theme=${theme}&lang=ru`, { waitUntil: 'networkidle' });
    await completeMinistryLogin(page);
    await page.locator('.ekh-side__item[data-view="forms"]').click();
    await page.locator('[data-act="form-open"]').click();
    await page.locator('.mfb-field-open').first().click();
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    expect(serious, serious.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  });

  /* ЦОН electronic queue: the free window with its listbox, a called ticket
     with disabled-with-reason actions, and both decision dialogs. */
  test(`TSON queue ${theme} has no serious accessibility violations`, async ({ page }) => {
    const scan = async () => {
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      return results.violations.filter(item => ['serious', 'critical'].includes(item.impact))
        .map(item => `${item.id}: ${item.help} → ${item.nodes.map(node => node.target.join(' ')).join(', ')}`);
    };
    await page.goto(`/tson/?theme=${theme}&lang=ru`, { waitUntil: 'networkidle' });
    await page.locator('input[type="password"]').fill('demo');
    await page.locator('[data-act="login-next"]').click();
    const cells = page.locator('.otp__cell');
    for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
    await expect(page.locator('.s-queue [role="option"]').first()).toBeVisible();
    const found = await scan();

    await page.locator('.s-window [data-action="call"]').click();
    await expect(page.locator('.s-window [data-action="noShow"]')).toBeVisible();
    found.push(...await scan());

    await page.locator('.s-window [data-action="transfer"]').click();
    await expect(page.locator('.s-transfer-dialog .s-transfer__win').first()).toBeVisible();
    found.push(...await scan());
    await page.keyboard.press('Escape');

    await page.locator('.s-window [data-action="start"]').click();
    await expect(page).toHaveURL(/#\/identify/);
    await page.getByRole('button', { name: 'Отменить приём' }).click();
    await page.locator('.s-window [data-action="finish"]').click();
    await expect(page.locator('.s-finish-dialog .s-finish__opt').first()).toBeVisible();
    found.push(...await scan());

    expect(found).toEqual([]);
  });
}
