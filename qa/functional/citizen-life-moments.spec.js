import { test, expect } from '@playwright/test';

test('life situations are two rows of tinted cards with «see all» on the heading line', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  await expect(page.locator('.emerg')).toHaveCount(0);
  await expect(page.locator('#searchInput')).toHaveAttribute('placeholder', 'Я хочу получить загранпаспорт');
  await expect(page.locator('#momH')).toHaveCSS('font-size', '28px');
  await expect(page.locator('#momH')).toHaveCSS('font-weight', '600');
  const cards = page.locator('#moments > .moment');
  await expect(cards).toHaveCount(8);
  // until the illustration set is complete, every card carries a glyph well instead
  await expect(page.locator('#moments .moment-art')).toHaveCount(0);
  await expect(page.locator('#moments .moment-ic')).toHaveCount(8);
  // every situation is on screen at once: no pager
  await expect(page.locator('.moments-nav, [data-moments]')).toHaveCount(0);

  const layout = await page.locator('#moments').evaluate((row) => [...row.querySelectorAll('.moment')].map((card) => {
    const c = card.getBoundingClientRect();
    const cta = card.querySelector('.moment-cta').getBoundingClientRect();
    const well = card.querySelector('.moment-ic').getBoundingClientRect();
    const title = card.querySelector('.moment-title').getBoundingClientRect();
    const text = card.querySelector('.moment-text').getBoundingClientRect();
    return {
      top: Math.round(c.top), left: Math.round(c.left), right: Math.round(c.right),
      width: Math.round(c.width), height: c.height,
      well: [Math.round(well.left - c.left), Math.round(well.top - c.top), well.width, well.height],
      titleLeft: Math.round(title.left - c.left), wellGap: Math.round(title.top - well.bottom),
      copyToCta: Math.round(cta.top - text.bottom),
      ctaInset: Math.round(c.bottom - cta.bottom), ctaBottom: Math.round(cta.bottom),
    };
  }));
  // four columns, two rows, every card the same box
  const rows = [...new Set(layout.map(({ top }) => top))];
  expect(rows).toHaveLength(2);
  expect(new Set(layout.map(({ left }) => left)).size).toBe(4);
  expect(new Set(layout.map(({ width }) => width)).size).toBe(1);
  expect(layout.every(({ height }) => height === 212)).toBe(true); // Figma 248 × .85
  // the glyph stands alone at the top on the home's 24px card inset; the copy
  // rides down on the action, 12px above it, and the space between absorbs any wrap
  expect(layout.every(({ well }) => well.join() === '24,24,48,48')).toBe(true);
  expect(layout.every(({ titleLeft }) => titleLeft === 24)).toBe(true);
  expect(layout.every(({ copyToCta }) => copyToCta === 12)).toBe(true);
  expect(Math.min(...layout.map(({ wellGap }) => wellGap))).toBeGreaterThan(12);
  // the action is its label alone
  await expect(page.locator('#moments .moment-cta svg')).toHaveCount(0);
  // the action sits on the card's own 12px inset, on one line across each row
  expect(layout.every(({ ctaInset }) => ctaInset === 12)).toBe(true);
  for (const row of rows) {
    expect(new Set(layout.filter(({ top }) => top === row).map(({ ctaBottom }) => ctaBottom)).size).toBe(1);
  }

  // the section is a full-bleed paper band: white edge to edge, 48 above the title and below the cards
  const band = await page.locator('#moments').evaluate((row) => {
    const section = row.closest('section');
    const box = section.getBoundingClientRect();
    const title = document.querySelector('#momH').getBoundingClientRect();
    return {
      background: getComputedStyle(section).backgroundColor,
      top: Math.round(title.top - box.top), bottom: Math.round(box.bottom - row.getBoundingClientRect().bottom),
      // the paper reaches the viewport edges through the band's spread shadow
      shadow: getComputedStyle(section).boxShadow.includes('rgb(255, 255, 255)'),
    };
  });
  expect(band).toEqual({ background: 'rgb(255, 255, 255)', top: 48, bottom: 48, shadow: true });

  // «see all» shares the heading's line, centred on it, flush with the cards' right edge
  const more = page.locator('section[aria-labelledby="momH"] .sect-more');
  await expect(more).toHaveText('Смотреть все');
  await expect(more).toHaveCSS('font-weight', '400');
  const heading = await page.evaluate(() => {
    const title = document.querySelector('#momH').getBoundingClientRect();
    const link = document.querySelector('section[aria-labelledby="momH"] .sect-more').getBoundingClientRect();
    return { titleCenter: title.top + title.height / 2, linkCenter: link.top + link.height / 2, linkRight: Math.round(link.right) };
  });
  expect(Math.abs(heading.titleCenter - heading.linkCenter)).toBeLessThanOrEqual(1);
  expect(heading.linkRight).toBe(Math.max(...layout.map(({ right }) => right)));
  await more.click();
  await expect(page.locator('.toast')).toBeVisible();
});

test('life situations reflow to two columns, then a swipe row on phones, without page overflow', async ({ page }) => {
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  await page.setViewportSize({ width: 1000, height: 800 });
  const tablet = await page.locator('#moments').evaluate((row) => {
    const boxes = [...row.querySelectorAll('.moment')].map((card) => card.getBoundingClientRect());
    return { columns: new Set(boxes.map((box) => Math.round(box.left))).size, scrolls: row.scrollWidth > row.clientWidth };
  });
  expect(tablet).toEqual({ columns: 2, scrolls: false });

  await page.setViewportSize({ width: 520, height: 800 });
  const phone = await page.locator('#moments').evaluate((row) => {
    const card = row.querySelector('.moment').getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(row).columnGap);
    return {
      perView: (row.clientWidth - 2 * parseFloat(getComputedStyle(row).paddingLeft) + gap) / (card + gap),
      scrolls: row.scrollWidth > row.clientWidth,
    };
  });
  expect(phone.perView).toBeCloseTo(1.15, 1);
  expect(phone.scrolls).toBe(true);

  for (const width of [1000, 520]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
