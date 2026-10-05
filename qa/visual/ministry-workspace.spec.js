import { test, expect } from '@playwright/test';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

for (const [theme, lang] of [['light', 'ru'], ['dark', 'tg']]) {
  test(`Ministry workspace ${theme}/${lang}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-09T05:00:00Z'));
    await page.goto(`/ministry/?present=1&theme=${theme}&lang=${lang}`);
    await completeMinistryLogin(page);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`queue-${theme}-${lang}.png`, { animations: 'disabled' });
    await page.locator('.q-service__name').first().click();
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`detail-${theme}-${lang}.png`, { animations: 'disabled' });
    if (theme === 'light') {
      await page.locator('.back-link').click();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page).toHaveScreenshot('queue-mobile.png', { animations: 'disabled' });
    }
  });
}
