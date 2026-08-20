import { test, expect } from '@playwright/test';

test('life moments use four wide rectangular cards per desktop row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  const cards = page.locator('.moments > .moment');
  await expect(cards).toHaveCount(4);

  const layout = await cards.evaluateAll((items) => items.map((card) => {
    const box = card.getBoundingClientRect();
    const icon = card.querySelector('.mi').getBoundingClientRect();
    const meta = card.querySelector('.meta').getBoundingClientRect();
    return {
      top: box.top,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      iconWidth: icon.width,
      iconHeight: icon.height,
      metaBottom: meta.bottom,
    };
  }));

  expect(new Set(layout.map(({ top }) => top)).size).toBe(1);
  expect(layout[0].width).toBeGreaterThan(layout[0].height);
  expect(layout[0].iconWidth).toBe(64);
  expect(layout[0].iconHeight).toBe(64);
  expect(layout.slice(0, 4).every(({ bottom, metaBottom }) => bottom - metaBottom === 21)).toBe(true);
});

test('life moment cards reflow without horizontal overflow', async ({ page }) => {
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  for (const [width, expectedColumns] of [[960, 3], [620, 2], [520, 1]]) {
    await page.setViewportSize({ width, height: 800 });
    const columnCount = await page.locator('.moments').evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(columnCount).toBe(expectedColumns);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
