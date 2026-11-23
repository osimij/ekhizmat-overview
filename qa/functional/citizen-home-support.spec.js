import { test, expect } from '@playwright/test';

/* The home's questions band, its one way on (the help guide or a message to
   us), the support sheet that message opens, and the app card that closes the
   page (apps/citizen/js/home-support.js, design guide §3 Citizen home). */

async function openHome(page, query = '') {
  await page.goto(`/citizen/?lang=ru&theme=light${query}`);
  await page.locator('#supportSect').scrollIntoViewIfNeeded();
}

async function openSheet(page) {
  await page.locator('#supOpen').click();
  await expect(page.locator('#supOverlay')).toHaveClass(/is-open/);
}

test('questions open one at a time and link into the help guide', async ({ page }) => {
  await openHome(page);
  const items = page.locator('#faqList .faq-item');
  await expect(items).toHaveCount(8);
  await items.nth(1).locator('summary').click();
  await expect(items.nth(1)).toHaveAttribute('open', '');
  await items.nth(2).locator('summary').click();
  await expect(items.nth(2)).toHaveAttribute('open', '');
  await expect(items.nth(1)).not.toHaveAttribute('open', '');
  await items.nth(2).locator('.faq-more').click();
  await expect(page).toHaveURL(/#\/help\/pay$/);
  await expect(page.locator('#scr-help')).toBeVisible();
});

test('under the title, on the list\'s last line, one way on: help or a message; the questions close the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const box = sel => page.locator(sel).first().evaluate(el => el.getBoundingClientRect().toJSON());
  const [h2, list, out, news] = await Promise.all([box('#faqH'), box('#faqList'), box('.faq-out'), box('.news-media')]);
  /* the list in the news grid's right column, the way on under the title, ending with the list */
  expect(Math.abs(list.left - news.left)).toBeLessThan(1);
  expect(Math.abs(out.left - h2.left)).toBeLessThan(1);
  expect(out.right).toBeLessThan(list.left);
  expect(Math.abs(out.bottom - list.bottom)).toBeLessThan(1);
  await expect(page.locator('.faq-out a.btn')).toHaveAttribute('href', '#/help');
  await expect(page.locator('.faq-out #supOpen')).toHaveText('Написать нам');
  /* the form is not on the page, and the app band is archived: the questions are the last band */
  await expect(page.locator('#supCard')).toBeHidden();
  await expect(page.locator('#contactSect')).toBeHidden();
});

test('«write to us» opens a full-viewport sheet; Esc closes it and focus goes back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await openSheet(page);
  const sheet = await page.locator('#supOverlay').evaluate(el => el.getBoundingClientRect().toJSON());
  expect(sheet.width).toBe(1440);
  expect(sheet.height).toBe(900);
  await expect(page.locator('#supName')).toBeFocused();
  await expect(page.locator('#supOverlay')).toHaveAttribute('aria-labelledby', 'supH');
  await page.keyboard.press('Escape');
  await expect(page.locator('#supOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('#supOpen')).toBeFocused();
  await openSheet(page);
  await page.locator('#supClose').click();
  await expect(page.locator('#supOverlay')).not.toHaveClass(/open/);
});

test('sending says what is missing, once, and focuses the first field', async ({ page }) => {
  await openHome(page);
  await openSheet(page);
  await page.locator('#supSend').click();
  await expect(page.locator('#supName')).toBeFocused();
  for (const id of ['supName', 'supContact', 'supMsg']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`#${id}Err`)).toBeVisible();
  }
  await page.locator('#supName').fill('Алишер');
  await expect(page.locator('#supNameErr')).toBeHidden();
  await page.locator('#supContact').fill('12ab');
  await expect(page.locator('#supContactErr')).toHaveText('Проверьте номер или почту');
  await page.locator('#supContact').fill('alisher@mail.tj');
  await expect(page.locator('#supContactErr')).toBeHidden();
});

test('a message that the questions already answer closes the sheet on that answer', async ({ page }) => {
  await openHome(page);
  await openSheet(page);
  await page.locator('#supMsg').fill('Не приходит смс с кодом для входа');
  await expect(page.locator('#supMatch')).toBeVisible();
  await expect(page.locator('#supMatchBtn')).toHaveText('Не приходит код из SMS. Что делать?');
  await page.locator('#supMatchBtn').click();
  await expect(page.locator('#supOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('#faq-sms')).toHaveAttribute('open', '');
  await expect(page.locator('#faq-sms summary')).toBeFocused();
});

test('a sent message keeps the sheet in place; the next one starts clear', async ({ page }) => {
  await openHome(page);
  await openSheet(page);
  await expect(page.locator('#supMsg')).toHaveAttribute('placeholder', 'Например: какие документы нужны для загранпаспорта?');
  await page.locator('#supName').fill('Алишер');
  await page.locator('#supContact').fill('+992 90 123 45 67');
  await page.locator('#supMsg').fill('Удобный поиск, спасибо');
  const before = await page.locator('#supCard').evaluate(el => el.offsetHeight);
  await page.locator('#supSend').click();
  await expect(page.locator('#supSend')).toHaveText('Отправляем…');
  await expect(page.locator('#supDoneH')).toBeFocused();
  await expect(page.locator('#supDoneP')).toContainText(/SUP-2026-\d{4}/);
  await expect(page.locator('#supDoneP')).toContainText('+992 90 123 45 67');
  expect(await page.locator('#supCard').evaluate(el => el.offsetHeight)).toBe(before);
  await page.locator('#supAgain').click();
  await expect(page.locator('#supMsg')).toBeFocused();
  await expect(page.locator('#supMsg')).toHaveValue('');
  await expect(page.locator('#supName')).toHaveValue('Алишер');
  /* sent, then closed: opening again starts on a clear message, who is writing kept */
  await page.locator('#supMsg').fill('Ещё один вопрос по оплате');
  await page.locator('#supSend').click();
  await expect(page.locator('#supDoneH')).toBeFocused();
  await page.keyboard.press('Escape');
  await openSheet(page);
  await expect(page.locator('#supForm')).toBeVisible();
  await expect(page.locator('#supMsg')).toHaveValue('');
  await expect(page.locator('#supMsg')).toBeFocused();
});

test('signed in, the profile fills who is writing; signing out takes it away', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth', '1'));
  await page.reload();
  await expect(page.locator('#supName')).toHaveValue('Фируза Раҳимова');
  await expect(page.locator('#supContact')).toHaveValue('+992 93 555 0184');
  /* who is writing is known, so the sheet opens on the message */
  await page.locator('#supportSect').scrollIntoViewIfNeeded();
  await openSheet(page);
  await expect(page.locator('#supMsg')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await page.locator('#logoutBtn').click();
  await expect(page.locator('#supName')).toHaveValue('');
  await expect(page.locator('#supContact')).toHaveValue('');
});

test('the way on and the form follow the language, errors included', async ({ page }) => {
  await openHome(page);
  await page.locator('#faq-cost summary').click();
  await openSheet(page);
  await page.locator('#supSend').click();
  await expect(page.locator('#supNameErr')).toHaveText('Укажите имя');
  /* the language option lives in the preferences flyout; dispatching skips opening it */
  await page.locator('[data-lang="en"][role="option"]').first().dispatchEvent('click');
  await expect(page.locator('#supH')).toHaveText('Write to us');
  await expect(page.locator('#supNameErr')).toHaveText('Enter your name');
  await expect(page.locator('#supMsg')).toHaveAttribute('placeholder', /^For example/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#faqH')).toHaveText('Frequently asked questions');
  await expect(page.locator('#supOpen')).toHaveText('Write to us');
  await expect(page.locator('#faq-cost')).toHaveAttribute('open', '');
  await expect(page.locator('#faq-cost .faq-q')).toHaveText('How much do services cost, and how do I pay?');
});
