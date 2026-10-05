import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {completeMinistryLogin} from '../helpers/ministry-auth.js';
for(const [theme,lang] of [['light','ru'],['dark','tg']]) test(`Entire Ministry workspace accessibility ${theme} ${lang}`,async({page})=>{
 await page.goto(`/ministry/?theme=${theme}&lang=${lang}&present=1`);await completeMinistryLogin(page);
 const audit=async name=>{
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.evaluate(()=>document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()}));
  const {violations}=await new AxeBuilder({page}).analyze();
  expect(violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),name).toEqual([]);
 };
 for(const view of ['all','overdue','interop','reports','forms']){await page.locator(`.ekh-side__item[data-view="${view}"]`).click();await audit(view)}
 await page.locator('.ekh-side__item[data-view="queue"]').click(); await page.locator('.q-row[data-id="a1"] .q-service__name').click();
 for(const tab of ['docs','interop','history']) {await page.locator(`[data-tab="${tab}"]`).click();await audit('application '+tab)}
 for(const action of ['act-request','act-return','act-decide']) {await page.locator(`[data-act="${action}"]`).click();await audit(action);await page.keyboard.press('Escape')}
 await page.locator('.ekh-side__item[data-view="all"]').click(); await page.locator('.q-row[data-id="a9"] .q-service__name').click();await page.locator('[data-act="result-open"]').click();await audit('issued result');await page.keyboard.press('Escape');
 await page.locator('[data-act="notif-open"]').click();await audit('notifications');await page.keyboard.press('Escape');
 await page.locator('[data-act="profile-open"]').click();await page.locator('[data-act="lock"]').click();await audit('locked');await page.locator('#lock-pass').fill('demo');await page.locator('[data-act="unlock"]').click();
 await page.locator('.ekh-side__item[data-view="forms"]').click();
 await page.locator('[data-act="form-create"]').click();
 for(const step of ['confirm','fields','delivery','review','checks','route','issue']){await page.locator(`.mfb-step[data-id="${step}"]`).click();await audit(step)}
 await page.setViewportSize({width:390,height:844});await page.locator('.mfb-preview-toggle').click();await audit('mobile certificate');await page.keyboard.press('Escape');
});
