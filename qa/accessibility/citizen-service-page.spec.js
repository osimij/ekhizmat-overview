import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function seriousViolations(page, includes = []) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  for (const selector of includes) builder = builder.include(selector);
  const results = await builder.analyze();
  return results.violations.filter((item) => ['serious', 'critical'].includes(item.impact))
    .map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target.join(' ')) }));
}

for (const theme of ['light', 'dark']) {
  test(`service overview, search list and help guide have no serious violations (${theme})`, async ({ page }) => {
    await page.goto(`/citizen/?lang=ru&theme=${theme}#/category/transport`);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await page.locator('#cpList .svc-row', { hasText: 'Талон (листовка) технического осмотра' }).click();
    await page.locator('#svc-d-pay summary').click();
    expect(await seriousViolations(page, ['#scr-service']), 'service').toEqual([]);

    await page.goto(`/citizen/?lang=ru&theme=${theme}`);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await page.locator('#searchInput').focus();
    expect(await seriousViolations(page, ['#searchWrap']), 'search shortcuts').toEqual([]);
    await page.locator('#searchInput').fill('справка');
    expect(await seriousViolations(page, ['#searchWrap']), 'search results').toEqual([]);

    await page.goto(`/citizen/?lang=ru&theme=${theme}#/help/track`);
    expect(await seriousViolations(page, ['#scr-help']), 'help').toEqual([]);
  });
}

test('the sign-in card with its help line has no serious violations', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light#/category/certs');
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.locator('#cpList .svc-row').first().click();
  await page.locator('[data-svc-apply]').click();
  await expect(page.locator('#loginOverlay')).toHaveClass(/open|is-open/);
  expect(await seriousViolations(page, ['#loginOverlay']), 'phone step').toEqual([]);
});
