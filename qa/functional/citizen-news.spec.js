import { test, expect } from '@playwright/test';

/* The news list and a story's page (apps/citizen/js/news-page.js, design
   guide §3 Citizen news): both continue the home band — paper, hairlines,
   and the band's 5fr : 8fr line shared with the footer. */

const left = (page, sel) => page.locator(sel).first().evaluate((el) => Math.round(el.getBoundingClientRect().left));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('the home band leads into the news: «read more» to the story on show, «all news» to the list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light');
  const more = page.locator('#newsMore');
  await expect(more).toHaveAttribute('href', '#/news/president-day');
  // the band previews the six newest, however many the list holds
  await expect(page.locator('#newsCount')).toHaveText('01 / 06');
  // turning the story turns the link with it
  await page.locator('[data-news-step="1"]').click();
  await expect(more).toHaveAttribute('href', '#/news/amonatbank');
  await more.click();
  await expect(page).toHaveURL(/#\/news\/amonatbank$/);
  await expect(page.locator('#scr-news')).toBeVisible();
  await expect(page.locator('#newsTitle')).toBeFocused();

  await page.goBack();
  await expect(page.locator('#scr-home')).toBeVisible();
  await page.locator('#newsSect .sect-more').click();
  await expect(page).toHaveURL(/#\/news$/);
  await expect(page.locator('#newsTitle')).toHaveText('Новости и события');
});

test('the list: a front page of the six newest, one big and five small, the rest as compact rows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light#/news');

  await expect(page.locator('.news-head .ekh-crumbs a')).toHaveText(['Главная']);
  const h1 = page.locator('#newsTitle');
  await expect(h1).toHaveCSS('font-size', '28px');
  await expect(h1).toHaveCSS('font-weight', '600');

  // the first view: the newest big on the left, the next five small on the right
  const front = page.locator('.news-front');
  await expect(front.locator('.news-card')).toHaveCount(6);
  const lead = front.locator('.news-card--lead');
  await expect(lead.locator('h2')).toHaveCSS('font-size', '32px');
  await expect(lead.locator('h2 a')).toHaveAttribute('href', '#/news/president-day');
  await expect(lead.locator('.news-card__meta')).toHaveCount(0); // the big story is its photo, title and summary
  const side = front.locator('.news-front__side .news-card--side');
  await expect(side).toHaveCount(5);
  await expect(side.first().locator('h2 a')).toHaveAttribute('href', '#/news/amonatbank');
  await expect(side.first().locator('h2')).toHaveCSS('font-size', '16px');
  // every story shows its photo; only the big one carries a summary
  await expect(front.locator('.news-media')).toHaveCount(6);
  await expect(front.locator('.news-card__sum')).toHaveCount(1);
  const cols = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const [f, l, s, media, thumb] = ['.news-front', '.news-card--lead', '.news-front__side', '.news-card--lead .news-media', '.news-card--side .news-media'].map(box);
    const foot = (sel) => document.querySelector(sel).lastElementChild.getBoundingClientRect().bottom;
    return {
      order: l.right < s.left, tops: Math.round(Math.abs(l.top - s.top)),
      edges: [Math.round(l.left - f.left), Math.round(f.right - s.right)],
      ratio: l.width / s.width,
      // the big story's words end on the front page's foot, and the stack not far above it
      foot: Math.round(f.bottom - foot('.news-card--lead')),
      ragged: f.bottom - foot('.news-front__side'),
      photo: media.width / media.height, thumb: thumb.width / thumb.height,
    };
  });
  expect(cols.order).toBe(true);
  expect(cols.tops).toBe(0);
  expect(cols.edges).toEqual([0, 0]);
  expect(cols.ratio).toBeGreaterThan(1.9);
  expect(cols.foot).toBe(0);
  expect(cols.ragged).toBeLessThan(48);
  expect(cols.thumb).toBeCloseTo(4 / 3, 1);
  // the big story's photo takes up the slack, between 16 : 9 and 4 : 3
  expect(cols.photo).toBeLessThanOrEqual(16 / 9 + 0.01);
  expect(cols.photo).toBeGreaterThanOrEqual(4 / 3 - 0.01);

  // every older story is a row; every story on the page is one link, its title
  const rows = page.locator('.news-list .news-row');
  await expect(rows).toHaveCount(3);
  const hrefs = await page.locator('.news-card, .news-row').evaluateAll((items) => items.map((item) => [...item.querySelectorAll('a')].map((a) => a.getAttribute('href'))));
  expect(hrefs.every((links) => links.length === 1 && /^#\/news\/[a-z-]+$/.test(links[0]))).toBe(true);
  expect(new Set(hrefs.flat()).size).toBe(9);
  await expect(rows.first().locator('time')).toHaveText('20 августа 2026');
  await expect(rows.first().locator('.news-row__meta span')).toHaveText('Портал');
  await expect(rows.first().locator('h2')).toHaveCSS('font-size', '17px');
  await expect(rows.first().locator('h2')).toHaveCSS('font-weight', '600');

  // the rows: the small photo on the content edge, date · topic over the title beside it, no gap column
  const edge = await left(page, '#newsTitle');
  expect(await left(page, '.news-front')).toBe(edge);
  expect(await left(page, '.news-row__media')).toBe(edge);
  expect(await left(page, '.news-row__meta')).toBe(await left(page, '.news-row__copy'));
  expect(await left(page, '.news-row__copy') - edge).toBe(176 + 24);

  // the paper runs edge to edge and the footer meets it: no strip of page ground between them
  const seam = await page.evaluate(() => {
    const scr = document.querySelector('#scr-news').getBoundingClientRect();
    const hdr = document.querySelector('.hdr').getBoundingClientRect();
    const ft = document.querySelector('footer').getBoundingClientRect();
    return [Math.round(scr.top - hdr.bottom), Math.round(ft.top - scr.bottom)];
  });
  expect(seam).toEqual([0, 0]);

  // the whole row is the title's target: a click on the photo opens the story
  const photo = await rows.first().evaluate((row) => {
    const r = row.getBoundingClientRect();
    const m = row.querySelector('.news-row__media').getBoundingClientRect();
    return { x: m.left - r.left + m.width / 2, y: m.top - r.top + m.height / 2 };
  });
  await rows.first().click({ position: photo });
  await expect(page).toHaveURL(/#\/news\/life-moments$/);
});

test('a story: title on the content edge, date and topic beside the photo, what to do beside the text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light#/news/inspection');

  await expect(page.locator('.news-head .ekh-crumbs a')).toHaveText(['Главная', 'Новости и события']);
  const h1 = page.locator('#newsTitle');
  await expect(h1).toContainText('талон техосмотра');
  await expect(h1).toHaveCSS('font-size', '28px');
  await expect(page.locator('.news-art__when time')).toHaveText('11 сентября 2026');
  await expect(page.locator('.news-art__when span')).toHaveText('Транспорт');

  // the text: the summary as its lead, then the body on a measure no wider than the photo
  await expect(page.locator('.news-body__lead')).toHaveCSS('font-size', '18px');
  await expect(page.locator('.news-body > p').nth(1)).toHaveCSS('font-size', '16px');
  await expect(page.locator('.news-body h2')).toHaveCSS('font-size', '20px');
  await expect(page.locator('.news-body .news-note')).toHaveCount(1);
  const geo = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const [h, meta, media, body, rel, ft] = ['#newsTitle', '.news-art__meta', '.news-art .news-media', '.news-body', '.news-art__rel', '.ft-cols'].map(box);
    return {
      edge: [Math.round(h.left), Math.round(meta.left), Math.round(rel.left)],
      line: [Math.round(media.left), Math.round(body.left), Math.round(ft.left)],
      rule: Math.round(meta.top - media.top), ratio: media.width / media.height, measure: body.width <= media.width,
      relPos: getComputedStyle(document.querySelector('.news-art__rel')).position,
    };
  });
  expect(new Set(geo.edge).size).toBe(1);
  expect(new Set(geo.line).size).toBe(1);
  expect(geo.rule).toBe(0); // the column's hairline and the photo's top are one line
  expect(Math.abs(geo.ratio - 16 / 9)).toBeLessThan(0.01);
  expect(geo.measure).toBe(true);
  expect(geo.relPos).toBe('sticky');

  // what the citizen can do about it: the service's own overview, then the life situation
  const rel = page.locator('.news-art__rel .life-svc');
  await expect(rel).toHaveCount(2);
  await expect(rel.first().locator('b')).toHaveText('Талон технического осмотра');
  await expect(rel.first()).toHaveAttribute('href', /^#\/service\/transport\//);
  await expect(rel.first().locator('.tag')).toHaveCount(1);
  await expect(rel.nth(1)).toHaveAttribute('href', '#/life/car');

  // three more stories, never the one being read
  await expect(page.locator('#newsNextH')).toHaveCSS('font-size', '24px');
  const next = await page.locator('.news-next .news-row a').evaluateAll((items) => items.map((a) => a.getAttribute('href')));
  expect(next).toEqual(['#/news/president-day', '#/news/amonatbank', '#/news/civil-registry']);
  await page.locator('.news-next .sect-more').click();
  await expect(page).toHaveURL(/#\/news$/);

  // the service opens its overview
  await page.goBack();
  await rel.first().click();
  await expect(page).toHaveURL(/#\/service\/transport\//);
  await expect(page.locator('#scr-service')).toBeVisible();
});

test('a story with nothing to do on the portal has no «on this topic»; an unknown story lands on the list', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/news/president-day');
  await expect(page.locator('#newsTitle')).toHaveText(/День Президента/);
  await expect(page.locator('.news-art__rel')).toHaveCount(0);

  await page.goto('/citizen/?lang=ru&theme=light#/news/no-such-story');
  await expect(page).toHaveURL(/#\/news$/);
  await expect(page.locator('.news-front .news-card')).toHaveCount(6);
});

test('«copy link» copies the story\'s address and says so in place', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/citizen/?lang=ru&theme=light#/news/civil-registry');
  const share = page.locator('.news-share');
  await expect(share).toHaveText('Скопировать ссылку');
  await share.click();
  await expect(share).toHaveText('Ссылка скопирована');
  // the address of the story, without the prototype's own query
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/citizen\/#\/news\/civil-registry$/);
});

test('the news follows the language and holds in dark', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=tg&theme=dark#/news/civil-registry');
  await expect(page.locator('.news-head .ekh-crumbs a')).toHaveText(['Асосӣ', 'Хабарҳо ва рӯйдодҳо']);
  await expect(page.locator('.news-art__when time')).toHaveText('5 ноябри 2026');
  await expect(page.locator('#newsRelH')).toHaveText('Дар ин мавзӯъ');
  await expect(page.locator('.news-art__rel .life-svc')).toHaveCount(3);
  // the paper is the theme's own panel, not a light island
  const paper = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.background = 'var(--panel)';
    document.body.append(probe);
    const panel = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return getComputedStyle(document.querySelector('#scr-news')).backgroundColor === panel;
  });
  expect(paper).toBe(true);
});

test('on a phone the list and the story are one column with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/citizen/?lang=ru&theme=light#/news');
  expect(await noOverflow(page)).toBe(true);
  // the front page is one column, the big story first, then the five small; a row's topic and date sit over its title
  const order = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const [lead, side, meta, copy] = ['.news-card--lead', '.news-front__side', '.news-row__meta', '.news-row__copy'].map(box);
    return lead.bottom <= side.top && meta.top < copy.top && Math.round(lead.width) === Math.round(side.width);
  });
  expect(order).toBe(true);
  await expect(page.locator('.news-row__copy p').first()).toBeHidden();

  await page.goto('/citizen/?lang=ru&theme=light#/news/inspection');
  expect(await noOverflow(page)).toBe(true);
  await expect(page.locator('#newsTitle')).toHaveCSS('font-size', '24px');
  const story = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const [meta, media, body, rel] = ['.news-art__meta', '.news-art .news-media', '.news-body', '.news-art__rel'].map(box);
    return {
      order: meta.bottom <= media.top && media.bottom <= body.top && body.bottom <= rel.top,
      relPos: getComputedStyle(document.querySelector('.news-art__rel')).position,
    };
  });
  expect(story.order).toBe(true);
  expect(story.relPos).toBe('static');
});
