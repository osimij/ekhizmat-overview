import {test,expect} from '@playwright/test';
import {completeMinistryLogin} from '../helpers/ministry-auth.js';
const step = (page,id) => page.locator(`.mfb-step[data-id="${id}"]`).click();

test('Ministry form settings survive steps, saving, reopening and review handoff', async ({page}) => {
  await page.goto('/ministry/?lang=ru&theme=light'); await completeMinistryLogin(page);
  await page.locator('.ekh-side__item[data-view="forms"]').click();
  await page.locator('[data-act="form-create"]').click();
  await page.locator('[data-form-name="ru"]').fill('Сервис проверки');
  await page.locator('[data-form-name="tg"]').fill('Хизмати санҷиш');
  await expect(page.locator('#main h1')).toHaveCount(1);
  await step(page,'confirm'); await page.locator('[data-form-config="address"]').check();
  await step(page,'delivery'); await page.locator('[data-form-config="paper"]').check();
  await page.locator('[name="form-cost"][value="paid"]').check(); await page.locator('[data-form-config="amount"]').fill('75');
  await step(page,'review'); await page.locator('[data-form-config="consent"]').fill('Согласие заявителя');
  await step(page,'checks'); await page.locator('[data-form-config="files"]').check();
  await step(page,'route'); await page.locator('[data-form-config="days"]').fill('7'); await page.locator('[data-form-config="unit"]').selectOption('legal');
  await step(page,'issue'); await page.locator('[data-form-config="resultTitle"]').fill('Свидетельство');
  await expect(page.locator('.ministry-certificate__title')).toHaveText('Свидетельство');
  await page.locator('[data-act="form-save"]').click(); await page.locator('[data-act="form-back"]').click();
  await page.locator('[data-act="form-open"]').click();
  for(const [id,key,value] of [['confirm','address',true],['delivery','amount','75'],['review','consent','Согласие заявителя'],['checks','files',true],['route','days','7'],['issue','resultTitle','Свидетельство']]) {
    await step(page,id);
    if(value === true) await expect(page.locator(`[data-form-config="${key}"]`)).toBeChecked();
    else await expect(page.locator(`[data-form-config="${key}"]`)).toHaveValue(value);
  }
  await step(page,'route'); await page.locator('[data-form-config="days"]').fill('0'); await page.locator('[data-act="form-send"]').click();
  await expect(page.locator('[data-form-config="days"]')).toBeFocused();
  await expect(page.locator('[data-act="form-send"]')).toBeVisible();
  await page.locator('[data-form-config="days"]').fill('7'); await page.locator('[data-act="form-send"]').click();
  await expect(page.locator('.form-lock-note')).toBeVisible();
  await expect(page.locator('[data-form-config="days"]')).toBeDisabled();
});

test('Ministry registries search independently and URL filters restore',async({page})=>{
 await page.goto('/ministry/?lang=tg&theme=dark');await completeMinistryLogin(page);
 await page.locator('.ekh-side__item[data-view="forms"]').click();
 await page.locator('#top-search').fill('no matching form');await expect(page.locator('.form-row')).toHaveCount(0);
 await page.locator('.empty [data-act="forms-clear"]').click();await expect(page.locator('.form-row')).toHaveCount(4);
 await page.locator('[data-act="forms-facet"][data-val="published"]').click();await expect(page).toHaveURL(/formState=published/);
 await page.reload();await expect(page.locator('.form-row')).toHaveCount(2);
 await page.locator('[data-act="forms-clear"]').click();
 await page.locator('[data-act="form-open-static"][data-id="extract"]').click();
 await expect(page.locator('.mfb-meta')).toContainText('0.9');
 await expect(page.locator('.mfb-title h1')).toHaveText('Иқтибос аз феҳристи шахсони ҳуқуқӣ');
 await page.locator('[data-act="form-back"]').click();await page.locator('.ekh-side__item[data-view="interop"]').click();
 await page.locator('.interop-record').first().click();await expect(page.locator('[data-tab="interop"]')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.card__main .spin')).toHaveCount(0);
});

test('Ministry document details and report download have working actions',async({page})=>{
 await page.goto('/ministry/?lang=ru&theme=light');await completeMinistryLogin(page);
 await page.locator('.q-row[data-id="a1"] .q-service__name').click();await page.locator('[data-tab="docs"]').click();
 const opener=page.locator('[data-act="document-open"]').first();await opener.click();
 await expect(page.locator('.modal--document')).toContainText('Исходный файл не приложен');await page.keyboard.press('Escape');await expect(opener).toBeFocused();
 await page.locator('.ekh-side__item[data-view="reports"]').click();
 const totals=await page.locator('.report-panel').first().locator('.report-row:not(.report-row--head) .report-row__num').allTextContents();
 const sum=totals.reduce((n,v,i)=>n+(i%2===0?Number(v):0),0);await expect(page.locator('.stat__v').first()).toHaveText(String(sum));
 const download=page.waitForEvent('download');await page.locator('[data-act="report-export"]').click();expect((await download).suggestedFilename()).toBe('ministry-2026-07.csv');
 await page.locator('.filter-select--period .filter-select__trigger').click();await page.locator('[data-filter-name="period"][data-val="2026-06"]').click();
 await expect(page.locator('.stat__v').first()).toHaveText('391');
 const specialistTotals=await page.locator('.report-secondary .report-row:not(.report-row--head) .report-row__num').allTextContents();
 expect(specialistTotals.reduce((sum,value,index)=>sum+(index%2===0?Number(value):0),0)).toBe(391);
});

test('Ministry mobile preview traps focus and Escape restores its trigger',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/ministry/?lang=tg&theme=dark');await completeMinistryLogin(page);
 await page.locator('[data-act="nav-toggle"]').click();await page.locator('.ekh-side__item[data-view="forms"]').click();await page.locator('[data-act="form-create"]').click();
 await step(page,'issue');await page.locator('.mfb-preview-toggle').click();
 await expect(page.locator('#formPreview')).toHaveAttribute('aria-modal','true');await expect(page.locator('.mfb-preview__close')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.locator('.mfb-preview__close')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('.mfb-preview-toggle')).toBeFocused();await expect(page.locator('#formPreview')).toBeHidden();
 await expect(page.locator('.mfb-top')).not.toHaveAttribute('inert','');
});
