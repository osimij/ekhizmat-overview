import { test, expect } from '@playwright/test';

test('life situations are two rows of illustrated cards that open their page, «see all» on the heading line', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto('/citizen/?present=1&theme=light&lang=ru');

  await expect(page.locator('.emerg')).toHaveCount(0);
  await expect(page.locator('#searchInput')).toHaveAttribute('placeholder', 'Я хочу получить загранпаспорт');
  await expect(page.locator('#momH')).toHaveCSS('font-size', '24px');
  await expect(page.locator('#momH')).toHaveCSS('font-weight', '600');
  const cards = page.locator('#moments > .moment');
  await expect(cards).toHaveCount(8);
  // every card is a link to its situation's page — never straight into a service
  const hrefs = await cards.evaluateAll((items) => items.map((card) => card.getAttribute('href')));
  expect(hrefs.every((href) => /^#\/life\/[a-z]+$/.test(href))).toBe(true);
  // every card carries its brand scene from the illustration sprite; the glyph wells and text pills are gone
  const scenes = await cards.evaluateAll((items) => items.map((card) => card.querySelector('.moment-art use')?.getAttribute('href')));
  expect(scenes.every((href) => /^\/design-system\/assets\/illustrations\.svg#ill-[a-z-]+$/.test(href))).toBe(true);
  expect(new Set(scenes).size).toBe(8);
  await expect(page.locator('#moments .moment-ic, #moments .moment-cta')).toHaveCount(0);
  await expect(cards.first().locator('.moment-title')).toHaveText('Планируем свадьбу');
  await expect(cards.first().locator('.moment-text')).toHaveText('ЗАГС, медицинские услуги и полезные справки');
  // every situation is on screen at once: no pager
  await expect(page.locator('.moments-nav, [data-moments]')).toHaveCount(0);

  const layout = await page.locator('#moments').evaluate((row) => [...row.querySelectorAll('.moment')].map((card) => {
    const c = card.getBoundingClientRect();
    const art = card.querySelector('.moment-art').getBoundingClientRect();
    const title = card.querySelector('.moment-title').getBoundingClientRect();
    return {
      top: Math.round(c.top), left: Math.round(c.left), right: Math.round(c.right),
      width: Math.round(c.width), height: Math.round(c.height),
      title: [Math.round(title.left - c.left), Math.round(title.top - c.top)],
      art: [Math.round(c.right - art.right), Math.round(c.bottom - art.bottom), art.width, art.height],
    };
  }));
  // four columns, two rows, every card the same box
  const rows = [...new Set(layout.map(({ top }) => top))];
  expect(rows).toHaveLength(2);
  expect(new Set(layout.map(({ left }) => left)).size).toBe(4);
  expect(new Set(layout.map(({ width }) => width)).size).toBe(1);
  expect(new Set(layout.map(({ height }) => height)).size).toBe(1);
  // compact (2026-11-23): about half the old 224px card
  expect(layout[0].height).toBeLessThanOrEqual(130);
  // the copy opens on the compact card's 20px inset; the small scene's box is flush in the corner
  // (its drawing keeps its own margin); there is no separate «go» control, the card is the link
  expect(layout.every(({ title }) => title.join() === '20,20')).toBe(true);
  expect(layout.every(({ art }) => art.join() === '0,0,80,80')).toBe(true);
  await expect(page.locator('#moments .moment-go')).toHaveCount(0);

  // the section is a full-bleed paper band: white edge to edge, 64 above the title and below the cards
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
  expect(band).toEqual({ background: 'rgb(255, 255, 255)', top: 80, bottom: 80, shadow: true });

  // «see all» shares the heading's line, centred on it, flush with the cards' right edge — and is the full list
  const more = page.locator('section[aria-labelledby="momH"] .sect-more');
  await expect(more).toHaveText('Смотреть все');
  await expect(more).toHaveAttribute('href', '#/life');
  await expect(more).toHaveCSS('font-weight', '400');
  const heading = await page.evaluate(() => {
    const title = document.querySelector('#momH').getBoundingClientRect();
    const link = document.querySelector('section[aria-labelledby="momH"] .sect-more').getBoundingClientRect();
    return { titleCenter: title.top + title.height / 2, linkCenter: link.top + link.height / 2, linkRight: Math.round(link.right) };
  });
  expect(Math.abs(heading.titleCenter - heading.linkCenter)).toBeLessThanOrEqual(1);
  expect(heading.linkRight).toBe(Math.max(...layout.map(({ right }) => right)));
  await more.click();
  await expect(page).toHaveURL(/#\/life$/);
  await expect(page.locator('#lifeTitle')).toHaveText('Жизненные ситуации');
  await expect(page.locator('#lifeAll > .moment')).toHaveCount(12);
  // the list's cards are the home's cards: same box, same scene
  const listCard = await page.locator('#lifeAll > .moment').first().evaluate((card) => Math.round(card.getBoundingClientRect().width));
  expect(listCard).toBe(layout[0].width);
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

test('a situation page lists its steps in order, each service opening its overview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?theme=light&lang=ru');
  await page.locator('#moments .moment', { hasText: 'Планируем свадьбу' }).click();
  await expect(page).toHaveURL(/#\/life\/wedding$/);

  // where am I: ancestors only, the h1 on the same content edge
  await expect(page.locator('#lifeTitle')).toHaveText('Планируем свадьбу');
  await expect(page.locator('#lifeTitle')).toHaveCSS('font-size', '28px');
  await expect(page.locator('#scr-life .ekh-crumbs a')).toHaveText(['Главная', 'Жизненные ситуации']);
  const edges = await page.evaluate(() => {
    const crumb = document.createRange();
    crumb.selectNodeContents(document.querySelector('#scr-life .ekh-crumbs a'));
    return { crumb: Math.round(crumb.getBoundingClientRect().left), title: Math.round(document.querySelector('#lifeTitle').getBoundingClientRect().left) };
  });
  expect(edges.crumb).toBe(edges.title);
  // the page opens on the card's scene
  await expect(page.locator('.life-hero__art use')).toHaveAttribute('href', '/design-system/assets/illustrations.svg#ill-service-marriage');

  // numbered steps, a step without an online service says what happens in person
  const steps = page.locator('.life-step');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0).locator('h2')).toContainText('Подаёте заявление в ЗАГС');
  await expect(steps.nth(2).locator('.life-svc')).toHaveCount(0);
  await expect(steps.nth(0).locator('.life-need li')).toHaveCount(3);
  // every service names its time and agency and carries the catalogue's fee tag
  const row = steps.nth(0).locator('.life-svc').first();
  await expect(row).toHaveAttribute('href', /^#\/service\/family\/[a-z0-9]+$/);
  await expect(row.locator('b')).toHaveText('Регистрация брака');
  await expect(row.locator('.life-svc__copy span')).toContainText('рабочих дней');
  await expect(row.locator('.tag')).toHaveText('платно');

  // the contents menu: every step plus «useful to know», the first one current
  const toc = page.locator('.life-toc .pn');
  await expect(toc).toHaveCount(5);
  await expect(toc.first()).toHaveAttribute('aria-current', 'true');
  await toc.nth(2).click();
  await expect(page).toHaveURL(/#\/life\/wedding\/s3$/);
  await expect(toc.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#life-s3-h')).toBeFocused();
  await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('#life-s3').getBoundingClientRect().top))).toBeLessThan(120);

  // a service opens the same overview the catalogue does; Back returns to the situation
  await row.click();
  await expect(page).toHaveURL(/#\/service\/family\//);
  await expect(page.locator('#svcTitle')).toContainText('регистрация брака');
  await page.goBack();
  await expect(page.locator('#lifeTitle')).toHaveText('Планируем свадьбу');

  // other situations close the page with the same cards
  await expect(page.locator('.life-more .moment')).toHaveCount(3);
});

test('situation pages deep-link to a step, offer their built flow, and fall back to the list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?theme=light&lang=ru#/life/move/s4');
  await expect(page.locator('#lifeTitle')).toHaveText('Переезжаю в другой город');
  await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('#life-s4').getBoundingClientRect().top))).toBeLessThan(120);
  await expect(page.locator('.life-toc .pn[data-life-link="s4"]')).toHaveAttribute('aria-current', 'true');

  // a situation with a built flow leads with it: the baby journey is one primary action
  await page.goto('/citizen/?theme=light&lang=ru#/life/baby');
  await expect(page.locator('.life-hero__act .btn-pri')).toHaveAttribute('href', '#/journey');
  await expect(page.locator('#scr-life .btn-pri')).toHaveCount(1);

  // an unknown situation lands on the full list
  await page.goto('/citizen/?theme=light&lang=ru#/life/nope');
  await expect(page).toHaveURL(/#\/life$/);
  await expect(page.locator('#lifeAll > .moment')).toHaveCount(12);
});

test('the search offers a situation in everyday words and opens its page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?theme=light&lang=ru');
  await page.locator('#searchInput').fill('свадьба');
  const first = page.locator('#searchItems .s-item').first();
  await expect(first.locator('.s-item__label')).toHaveText('Планируем свадьбу');
  await expect(first.locator('.meta')).toHaveText('Жизненная ситуация');
  await first.click();
  await expect(page).toHaveURL(/#\/life\/wedding$/);
});

test('the illustration sprite parses, and dark mode re-colours the same drawings', async ({ page }) => {
  await page.goto('/citizen/?theme=light&lang=ru');
  const sprite = await page.evaluate(async () => {
    const text = await (await fetch('/design-system/assets/illustrations.svg')).text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    return { broken: doc.querySelector('parsererror') !== null, symbols: doc.querySelectorAll('symbol[id^="ill-"]').length };
  });
  expect(sprite).toEqual({ broken: false, symbols: 46 });
  const line = () => page.evaluate(() => getComputedStyle(document.querySelector('.moment-art')).getPropertyValue('--ill-line').trim());
  expect(await line()).toBe('#1b3b6f');
  await page.goto('/citizen/?theme=dark&lang=ru');
  expect(await line()).toBe('#d3e3f8');
});

test('a situation page holds at phone width: no overflow, steps use the full width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/citizen/?theme=light&lang=tg#/life/biz');
  await expect(page.locator('#lifeTitle')).toHaveText('Тиҷорат мекушоям');
  const metrics = await page.evaluate(() => {
    const number = document.querySelector('.life-step__n').getBoundingClientRect();
    const text = document.querySelector('.life-step__text').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // on a phone the body drops the desktop indent and starts on the number's edge
      indent: Math.round(text.left - number.left),
    };
  });
  expect(metrics.overflow).toBeLessThanOrEqual(1);
  expect(metrics.indent).toBe(0);
});
