import {test,expect} from '@playwright/test';
import {completeMinistryLogin} from '../helpers/ministry-auth.js';
for(const [theme,lang] of [['light','ru'],['dark','tg']]) test(`Ministry platform ${theme}/${lang}`, async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.clock.setFixedTime(new Date('2026-09-09T05:00:00Z'));
 await page.goto(`/ministry/?theme=${theme}&lang=${lang}&present=1`);await completeMinistryLogin(page);await page.evaluate(()=>document.fonts.ready);
 const shot=async name=>{await page.mouse.move(0,0);await expect(page).toHaveScreenshot(`${name}-${theme}-${lang}.png`,{animations:'disabled'})};
 for(const view of ['interop','reports','forms']){await page.locator(`.ekh-side__item[data-view="${view}"]`).click();await shot(view)}
 await page.locator('[data-act="form-create"]').click();await page.locator('[data-form-name="ru"]').fill('Регистрация некоммерческой организации');await page.locator('[data-form-name="tg"]').fill('Бақайдгирии ташкилоти ғайритиҷоратӣ');await shot('editor-fields');
 await page.locator('.mfb-step[data-id="issue"]').click();await shot('editor-issue');
 await page.setViewportSize({width:390,height:844});await page.locator('.mfb-preview-toggle').click();await shot('certificate-mobile');await page.keyboard.press('Escape');await shot('editor-mobile');
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-act="form-back"]').click();await page.locator('.ekh-side__item[data-view="queue"]').click();await page.locator('.q-row[data-id="a1"] .q-service__name').click();await page.locator('[data-tab="docs"]').click();await shot('documents');
 await page.locator('[data-act="notif-open"]').click();await shot('notifications');
});
