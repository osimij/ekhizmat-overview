import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

for (const [theme, lang] of [['light', 'ru'], ['dark', 'tg']]) {
  test(`Ministry signed-in queue, filter, detail and profile accessibility ${theme}`, async ({ page }) => {
    await page.goto(`/ministry/?theme=${theme}&lang=${lang}&present=1`);
    await completeMinistryLogin(page);
    async function audit() {
      // Sample settled colors, not a translucent entrance frame.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => document.getAnimations().forEach(animation => {
        if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish();
      }));
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact));
      expect(serious, JSON.stringify(serious.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)})))).toEqual([]);
    }
    await audit();
    await page.locator('.filter-select--status .filter-select__trigger').click();
    await audit();
    await page.keyboard.press('Escape');
    await page.locator('.q-service__name').first().click();
    await audit();
    await page.locator('[data-act="profile-open"]').click();
    await audit();
  });
}
