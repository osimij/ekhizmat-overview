import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/citizen/', '/tson/', '/ministry/', '/admin/services.html', '/design-system/styleguide.html'];
for (const theme of ['light', 'dark']) {
  for (const route of pages) {
    test(`${route} ${theme} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(`${route}${route.includes('?') ? '&' : '?'}present=1&theme=${theme}&lang=ru`, { waitUntil: 'networkidle' });
      // Axe samples rendered colors. Finish entrance animations first so it checks
      // the stable UI state instead of a translucent frame midway through a fade.
      await page.evaluate(() => document.getAnimations().forEach((animation) => {
        const endTime = animation.effect?.getComputedTiming().endTime;
        if (Number.isFinite(endTime)) animation.finish();
        else animation.cancel();
      }));
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
      expect(serious, serious.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
    });
  }
}
