import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const routes = ['/', '/citizen/', '/tson/', '/ministry/', '/admin/', '/admin/services.html', '/admin/new-service.html', '/admin/builder.html', '/design-system/styleguide.html'];

for (const route of routes) {
  test(`${route} loads without page errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('launcher exposes exactly four real platform links', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.platform-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')))).resolves.toEqual([
    '/citizen/',
    '/tson/',
    '/ministry/',
    '/admin/',
  ]);
});

test('shared brand assets use the uploaded agency logo geometry', async () => {
  const [sourceSvg, standalone, sprite] = await Promise.all([
    readFile(new URL('../../agency-logo.svg', import.meta.url), 'utf8'),
    readFile(new URL('../../design-system/assets/logo.svg', import.meta.url), 'utf8'),
    readFile(new URL('../../design-system/assets/icons.svg', import.meta.url), 'utf8'),
  ]);
  const paths = (svg) => [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
  const symbol = sprite.match(/<symbol id="i-logo"[\s\S]*?<\/symbol>/)[0];
  expect(paths(standalone)).toEqual(paths(sourceSvg));
  expect(paths(symbol)).toEqual(paths(sourceSvg));
  expect(standalone.match(/<svg[^>]*viewBox="([^"]+)"/)[1]).toBe('0 0 112 105');
  expect(symbol.match(/viewBox="([^"]+)"/)[1]).toBe('0 0 112 105');
});

test('canonical stroke icons never fall back to a black SVG fill', async ({ page }) => {
  await page.goto('/');
  const launcherFills = await page.locator('.platform-icon svg').evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).fill),
  );
  expect(launcherFills).toEqual(['none', 'none', 'none', 'none']);

  await page.goto('/citizen/');
  const citizenFills = await page.locator('.cat .tile svg').evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).fill),
  );
  expect(new Set(citizenFills)).toEqual(new Set(['none']));
});

test('citizen category cards keep identical dimensions', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  const sizes = await page.locator('.cat').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const icon = element.querySelector('.tile').getBoundingClientRect();
    const title = element.querySelector('span:last-child').getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      iconTopGap: Math.round(icon.top - rect.top),
      titleBottomGap: Math.round(rect.bottom - title.bottom),
    };
  }));
  expect(new Set(sizes.map(({ width }) => width)).size).toBe(1);
  expect(sizes[0].width).toBe(117);
  expect(new Set(sizes.map(({ height }) => height)).size).toBe(1);
  expect(sizes[0].height).toBe(120);
  expect(new Set(sizes.map(({ iconTopGap }) => iconTopGap)).size).toBe(1);
  expect(new Set(sizes.map(({ titleBottomGap }) => titleBottomGap)).size).toBe(1);
});

test('every platform renders with the bundled Google Sans font', async ({ page }) => {
  const routes = ['/', '/citizen/', '/tson/', '/ministry/', '/admin/', '/design-system/styleguide.html'];
  for (const route of routes) {
    await page.goto(`${route}?present=1&theme=light&lang=tg`);
    await page.evaluate(() => document.fonts.ready);
    const typography = await page.evaluate(() => ({
      family: getComputedStyle(document.body).fontFamily,
      tajikAvailable: document.fonts.check('16px "Google Sans"', 'Ғғ Ӣӣ Ққ Ӯӯ Ҳҳ Ҷҷ'),
    }));
    expect(typography.family).toContain('Google Sans');
    expect(typography.tajikAvailable).toBe(true);
  }
});

test('every interface keeps visible controls named and within the viewport', async ({ page }) => {
  for (const route of routes) {
    await page.goto(`${route}?present=1&theme=light&lang=tg`, { waitUntil: 'networkidle' });
    const audit = await page.evaluate(() => {
      const isVisible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0;
      };
      const hasReferencedText = (element, attribute) => (element.getAttribute(attribute) || '')
        .split(/\s+/)
        .filter(Boolean)
        .some((id) => document.getElementById(id)?.textContent.trim());
      const hasName = (element) => {
        if ((element.getAttribute('aria-label') || '').trim()) return true;
        if (hasReferencedText(element, 'aria-labelledby')) return true;
        if ((element.textContent || '').trim()) return true;
        if (element instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(element.type) && element.value.trim()) return true;
        if (element.closest('label')) return true;
        if (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)) return true;
        return false;
      };
      const describe = (element) => {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join('');
        return `${element.tagName.toLowerCase()}${id}${classes}`;
      };
      const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')]
        .filter(isVisible)
        .filter((element) => !hasName(element))
        .map(describe);
      const actions = [...document.querySelectorAll('button, a[href]')]
        .filter(isVisible)
        .filter((element) => !hasName(element))
        .map(describe);
      const negativeTracking = [...document.querySelectorAll('body *')]
        .filter(isVisible)
        .filter((element) => Number.parseFloat(getComputedStyle(element).letterSpacing) < 0)
        .map(describe);
      const mismatchedActionHeights = [...document.querySelectorAll('.login__actions, .j-acts, .pv-foot, .modal__foot, .ekh-dialog__actions, .s-result__foot')]
        .filter(isVisible)
        .map((group) => {
          const buttons = [...group.querySelectorAll(':scope > .btn:not(.btn--icon)')].filter(isVisible);
          const heights = buttons.map((button) => Math.round(button.getBoundingClientRect().height));
          return heights.length > 1 && Math.max(...heights) - Math.min(...heights) > 1
            ? `${describe(group)}: ${heights.join(',')}`
            : null;
        })
        .filter(Boolean);
      return {
        unnamed: [...controls, ...actions],
        negativeTracking,
        mismatchedActionHeights,
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      };
    });
    expect(audit.unnamed, `${route} has unnamed visible controls`).toEqual([]);
    expect(audit.negativeTracking, `${route} has visible text with negative letter spacing`).toEqual([]);
    expect(audit.mismatchedActionHeights, `${route} has mismatched sibling action heights`).toEqual([]);
    expect(audit.horizontalOverflow, `${route} overflows horizontally`).toBeLessThanOrEqual(1);
  }
});

test('launcher theme and language follow navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /забон/i }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: /тема/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.platform-card--citizen').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('citizen search, sign-in dialog and shared switcher work', async ({ page }) => {
  await page.goto('/citizen/');
  await page.locator('#searchInput').fill('шиноснома');
  await expect(page.locator('#searchPop')).toHaveClass(/open/);
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginOverlay')).toHaveClass(/is-open/);
  await expect(page.locator('#loginPhone')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#loginOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
});

test('admin registry to builder route remains intact', async ({ page }) => {
  await page.goto('/admin/services.html');
  await expect(page.locator('.bp-bar')).toBeHidden();
  await page.getByRole('link', { name: /Хизмати нав/ }).first().click();
  await expect(page).toHaveURL(/new-service\.html/);
  await page.goto('/admin/builder.html');
  await expect(page.locator('.bld-work')).toBeVisible();
  await page.locator('#addField').click();
  await expect(page.locator('#paletteModal')).toHaveClass(/is-open/);
});

test('ministry and TSON boot their operational gates', async ({ page }) => {
  await page.goto('/ministry/');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
  await page.goto('/tson/');
  await expect(page.locator('#screen')).not.toBeEmpty();
  await expect(page.locator('[data-shared-platform-switcher]')).toBeVisible();
  await expect(page.locator('.fatal')).toHaveCount(0);
  await expect(page.getByText('АРМ не запустился', { exact: false })).toHaveCount(0);
});

test('developer mode can reset only the current platform demo state', async ({ page }) => {
  await page.goto('/admin/?dev=1&lang=ru');
  await page.evaluate(() => localStorage.setItem('ekh.admin.rail', '1'));
  const tools = page.locator('[data-demo-tools]');
  await expect(tools).toBeVisible();
  await tools.getByRole('button', { name: 'Сбросить платформу' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ekh.admin.rail'))).toBeNull();
});
