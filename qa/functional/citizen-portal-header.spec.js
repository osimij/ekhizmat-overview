import { test, expect } from '@playwright/test';

test('the phone portal bar is one row — mark and audience, then language and sign-in — on the content edge', async ({ page }) => {
  for (const [lang, width] of [['tg', 360], ['ru', 390]]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/citizen/?present=1&theme=light&lang=${lang}`);

    // the mark alone carries the brand; the prototype platform switcher stays off the bar
    await expect(page.locator('.brand b')).toBeHidden();
    await expect(page.locator('.brand')).toHaveAccessibleName('eKhizmat');
    await expect(page.locator('.hdr [data-shared-platform-switcher]')).toHaveCount(1);
    await expect(page.locator('.hdr [data-shared-platform-switcher]')).toBeHidden();

    const bar = await page.evaluate(() => {
      const box = (selector) => document.querySelector(selector).getBoundingClientRect();
      const row = box('.hdr-in'), mark = box('.brand .mark'), acct = box('.dd.acct .dd-btn');
      const login = box('#loginBtn'), title = box('.hero h1');
      const label = document.querySelector('#acctCur');
      return {
        height: row.height,
        markLeft: Math.round(mark.left), titleLeft: Math.round(title.left),
        loginRight: Math.round(innerWidth - login.right),
        oneRow: [mark, acct, login].every((item) => item.top >= row.top && item.bottom <= row.bottom),
        audienceBesideMark: acct.left > mark.right && acct.left - mark.right <= 8,
        labelWhole: label.scrollWidth <= label.clientWidth,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    // the bar and the hero share the 20px phone gutter (--gutter: --s-5)
    expect(bar).toEqual({
      height: 64, markLeft: 20, titleLeft: 20, loginRight: 20,
      oneRow: true, audienceBesideMark: true, labelWhole: true, overflow: 0,
    });
  }
});
