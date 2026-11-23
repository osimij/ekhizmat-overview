import { test, expect } from '@playwright/test';

/* The home's last two bands: the common questions, then a support message
   beside the app download (apps/citizen/js/home-support.js, design guide §3 Citizen home). */

async function openHome(page, query = '') {
  await page.goto(`/citizen/?lang=ru&theme=light${query}`);
  await page.locator('#supportSect').scrollIntoViewIfNeeded();
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
  await expect(page.locator('.faq-foot__link')).toHaveAttribute('href', '#/help');
  await items.nth(2).locator('.faq-more').click();
  await expect(page).toHaveURL(/#\/help\/pay$/);
  await expect(page.locator('#scr-help')).toBeVisible();
});

test('the questions come first, then support and the app share the last band on the content edges', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const box = sel => page.locator(sel).first().evaluate(el => el.getBoundingClientRect().toJSON());
  const [h2, list, card, app, news] = await Promise.all([box('#faqH'), box('#faqList'), box('#supCard'), box('.app-card'), box('.news-media')]);
  /* the questions: title on the content edge, the list in the news grid's right column */
  expect(Math.abs(card.left - h2.left)).toBeLessThan(1);
  expect(Math.abs(list.left - news.left)).toBeLessThan(1);
  expect(list.left).toBeGreaterThan(h2.right);
  /* the form holds the left edge, the app card (a poster's width) the right */
  expect(Math.abs(app.right - list.right)).toBeLessThan(1);
  expect(app.width).toBeLessThanOrEqual(560);
  expect(app.left - card.right).toBeGreaterThan(48);
  /* side by side, one height, and both before the questions */
  expect(app.left).toBeGreaterThan(card.right);
  expect(Math.abs(app.height - card.height)).toBeLessThan(1);
  expect(list.bottom).toBeLessThan(card.top);
});

test('sending says what is missing, once, and focuses the first field', async ({ page }) => {
  await openHome(page);
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

test('a message that the questions already answer points at the answer', async ({ page }) => {
  await openHome(page);
  await page.locator('#supMsg').fill('Не приходит смс с кодом для входа');
  await expect(page.locator('#supMatch')).toBeVisible();
  await expect(page.locator('#supMatchBtn')).toHaveText('Не приходит код из SMS. Что делать?');
  await page.locator('#supMatchBtn').click();
  await expect(page.locator('#faq-sms')).toHaveAttribute('open', '');
  await expect(page.locator('#faq-sms summary')).toBeFocused();
});

test('a sent message keeps the card in place and can be followed by another', async ({ page }) => {
  await openHome(page);
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
});

test('signed in, the profile fills who is writing; signing out takes it away', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth', '1'));
  await page.reload();
  await expect(page.locator('#supName')).toHaveValue('Фируза Раҳимова');
  await expect(page.locator('#supContact')).toHaveValue('+992 93 555 0184');
  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await page.locator('#logoutBtn').click();
  await expect(page.locator('#supName')).toHaveValue('');
  await expect(page.locator('#supContact')).toHaveValue('');
});

test('the form follows the language, errors included', async ({ page }) => {
  await openHome(page);
  await page.locator('#faq-cost summary').click();
  await page.locator('#supSend').click();
  await expect(page.locator('#supNameErr')).toHaveText('Укажите имя');
  /* the language option lives in the preferences flyout; dispatching skips opening it */
  await page.locator('[data-lang="en"][role="option"]').first().dispatchEvent('click');
  await expect(page.locator('#faqH')).toHaveText('Frequently asked questions');
  await expect(page.locator('#supNameErr')).toHaveText('Enter your name');
  await expect(page.locator('#supMsg')).toHaveAttribute('placeholder', /^For example/);
  await expect(page.locator('#faq-cost')).toHaveAttribute('open', '');
  await expect(page.locator('#faq-cost .faq-q')).toHaveText('How much do services cost, and how do I pay?');
});
