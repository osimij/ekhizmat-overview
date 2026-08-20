import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function seriousViolations(page, includes=[]) {
  let builder=new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']);
  for(const selector of includes)builder=builder.include(selector);
  const results=await builder.analyze();
  return results.violations.filter(item=>['serious','critical'].includes(item.impact));
}

test('new admin dashboard has no serious accessibility violations', async ({ page }) => {
  await page.goto('/admin/?lang=ru&theme=light');
  expect(await seriousViolations(page)).toEqual([]);
});

test('new citizen application, payment and document surfaces have no serious violations', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.evaluate(()=>localStorage.setItem('ekh.citizen.auth','1'));
  await page.reload();
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await page.waitForTimeout(400);
  for (const pane of ['data','apps','payments','docs']) {
    await page.locator(`[data-pane="${pane}"]`).click();
    const targets={data:['#pane-data'],apps:['#applicationsRoot'],payments:['#paymentsRoot'],docs:['#docGrid','.received-documents']}[pane];
    expect(await seriousViolations(page,targets),pane).toEqual([]);
  }
  await page.locator('[data-doc-id="passport"] .doc-open').click();
  await page.waitForTimeout(300);
  expect(await seriousViolations(page,['#documentDetailOverlay']),'document detail').toEqual([]);
  await page.locator('#documentDetailClose').click();
  await page.locator('[data-pane="payments"]').click();
  await page.locator('[data-receipt-id]').click();
  await page.waitForTimeout(300);
  expect(await seriousViolations(page,['#receiptOverlay']),'receipt').toEqual([]);
});
