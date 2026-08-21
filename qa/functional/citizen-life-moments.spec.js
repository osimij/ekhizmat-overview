import { test, expect } from '@playwright/test';

test('life moments use four wide rectangular cards per desktop row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  await expect(page.locator('.emerg')).toHaveCount(0);
  await expect(page.locator('#searchInput')).toHaveAttribute('placeholder', 'Ищу…');
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

test('popular services use compact catalogue cards and service rows stay regular', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru#/category/docs');

  const cards = page.locator('.popular-services__grid > .popular-card');
  await expect(cards).toHaveCount(3);
  const sectionOrder = await page.evaluate(() => {
    const meta = document.querySelector('.cp-meta').getBoundingClientRect();
    const popular = document.querySelector('.popular-services').getBoundingClientRect();
    return { metaBottom: meta.bottom, popularTop: popular.top };
  });
  expect(sectionOrder.metaBottom).toBeLessThanOrEqual(sectionOrder.popularTop);
  await expect(page.locator('.popular-services')).toHaveCSS('row-gap', '8px');
  const popularLetterSpacing = await page.locator('.popular-services__label')
    .evaluate((el) => getComputedStyle(el).letterSpacing);
  expect(popularLetterSpacing === 'normal' || parseFloat(popularLetterSpacing) === 0).toBe(true);
  const layout = await cards.evaluateAll((items) => items.map((card) => {
    const box = card.getBoundingClientRect();
    const iconElement = card.querySelector('.popular-card__icon');
    const icon = iconElement.getBoundingClientRect();
    return {
      top: box.top,
      width: box.width,
      height: box.height,
      iconWidth: icon.width,
      iconHeight: icon.height,
      iconBackground: getComputedStyle(iconElement).backgroundColor,
    };
  }));
  expect(new Set(layout.map(({ top }) => top)).size).toBe(1);
  expect(layout.every(({ width, height }) => width > height)).toBe(true);
  expect(layout.every(({ height }) => height <= 60)).toBe(true);
  expect(layout.every(({ iconWidth, iconHeight }) => iconWidth === 24 && iconHeight === 24)).toBe(true);
  expect(layout.every(({ iconBackground }) => iconBackground === 'rgba(0, 0, 0, 0)')).toBe(true);
  const packedGap = await cards.evaluateAll((items) => {
    const sorted = [...items].sort(
      (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left
    );
    return sorted.slice(1).map((card, index) =>
      card.getBoundingClientRect().left - sorted[index].getBoundingClientRect().right
    );
  });
  expect(Math.max(...packedGap)).toBeLessThanOrEqual(16);
  await expect(page.locator('.svc-row .tt b').first()).toHaveCSS('font-weight', '400');

  await cards.first().click();
  await expect(page.locator('#cpSearch')).not.toHaveValue('');

  await page.setViewportSize({ width: 620, height: 800 });
  const mobileLayout = await cards.evaluateAll((items) => items.map((card) => {
    const box = card.getBoundingClientRect();
    return { width: box.width, top: box.top };
  }));
  const gridWidth = await page.locator('.popular-services__grid').evaluate((grid) =>
    grid.getBoundingClientRect().width);
  expect(mobileLayout.every(({ width }) => width <= gridWidth)).toBe(true);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('category pay filter is compact and sub-groups collapse', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru#/category/transport');

  const payField = page.locator('#cpFilters .ekh-filter__field');
  await expect(payField).toHaveCSS('width', '140px');
  await expect(payField).toHaveCSS('border-radius', '999px');
  await expect(page.locator('#cpPayLabel')).toHaveText('Стоимость');
  await expect(page.locator('#cpPayLabel svg')).toHaveCount(0);
  await expect(page.locator('#cpPay')).toHaveAttribute('aria-label', 'Стоимость');
  await expect(page.locator('#cpFilters')).toHaveCSS('gap', '8px');
  await expect(page.locator('#cpSearch')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('#cpCount')).toHaveCSS('font-size', '13px');
  await expect(page.locator('#cpCount')).toHaveCSS('font-weight', '400');
  const countLetterSpacing = await page.locator('#cpCount')
    .evaluate((el) => getComputedStyle(el).letterSpacing);
  expect(countLetterSpacing === 'normal' || parseFloat(countLetterSpacing) === 0).toBe(true);
  await expect(page.locator('.cp-controls > .cp-search')).toHaveCount(1);
  await expect(page.locator('.cp-controls > #cpFilters')).toHaveCount(1);
  const metaLayout = await page.locator('.cp-meta').evaluate((meta) => {
    const count = meta.querySelector('.cp-count').getBoundingClientRect();
    const search = meta.querySelector('.cp-search').getBoundingClientRect();
    const filter = meta.querySelector('#cpFilters').getBoundingClientRect();
    return {
      countBottom: count.bottom,
      searchTop: search.top,
      searchCenter: search.top + search.height / 2,
      filterCenter: filter.top + filter.height / 2,
    };
  });
  expect(metaLayout.countBottom).toBeLessThanOrEqual(metaLayout.searchTop);
  expect(metaLayout.searchCenter).toBeCloseTo(metaLayout.filterCenter, 0);

  const group = page.locator('.svc-group').first();
  const toggle = group.locator('.svc-group__toggle');
  const rows = group.locator('.rows');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(rows).toBeVisible();

  const heading = toggle.locator('.svc-sub');
  await expect(heading).toHaveCSS('text-wrap', 'balance');
  const secondaryColors = await page.evaluate(() => ({
    heading: getComputedStyle(document.querySelector('.svc-sub')).color,
    filterLabel: getComputedStyle(document.querySelector('.ekh-filter__label')).color,
  }));
  expect(secondaryColors.heading).toBe(secondaryColors.filterLabel);
  await expect(heading).not.toContainText('платно');
  await expect(heading.locator('.svc-group__chev')).toHaveCount(1);
  const chevronGap = await heading.evaluate((el) => {
    const text = el.firstChild;
    const range = document.createRange();
    range.selectNodeContents(text);
    const textRects = [...range.getClientRects()];
    const lastTextRect = textRects[textRects.length - 1];
    const chevronRect = el.querySelector('.svc-group__chev').getBoundingClientRect();
    return chevronRect.left - lastTextRect.right;
  });
  expect(chevronGap).toBeGreaterThanOrEqual(0);
  expect(chevronGap).toBeLessThanOrEqual(8);
  await expect(group).toHaveCSS('row-gap', '12px');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(group).toHaveClass(/is-collapsed/);
  await expect(rows).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(rows).toBeVisible();
});
