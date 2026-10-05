import { test, expect } from '@playwright/test';
import { completeCitizenLogin } from '../helpers/citizen-auth.js';

/* design-guide §3 «Citizen service page»: before Apply a citizen can tell
   whether this is the right service, what it needs and what happens next */

test('a catalogue row opens the service overview, a linkable route with crumbs back to its section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light#/category/certs');
  const row = page.locator('#cpList .svc-row', { hasText: 'Справка о наличии или отсутствии судимости' });
  await expect(row).toHaveAttribute('href', /^#\/service\/certs\/[a-z0-9]+$/);
  await row.click();

  await expect(page).toHaveURL(/#\/service\/certs\/[a-z0-9]+$/);
  await expect(page.locator('#svcTitle')).toHaveText('Справка о наличии или отсутствии судимости');
  await expect(page.locator('#svcTitle')).toHaveCSS('font-size', '28px');

  // the trail names ancestors only — the h1 is the current step
  const crumbs = page.locator('#svcRoot .ekh-crumbs a');
  await expect(crumbs).toHaveText(['Главная', 'Справки и выписки']);

  // four essentials: what you receive, cost, time, documents
  await expect(page.locator('.svc-fact dt')).toHaveText(['Вы получите', 'Стоимость', 'Срок', 'Нужны документы']);
  await expect(page.locator('.svc-fact').first()).toContainText('действует 90 дней');
  await expect(page.locator('.svc-steps .e-step')).toHaveCount(4);

  // title, crumbs and facts share the content edge; the decision lines up with the title
  const edges = await page.evaluate(() => {
    const left = s => Math.round(document.querySelector(s).getBoundingClientRect().left);
    const crumb = document.createRange();
    crumb.selectNodeContents(document.querySelector('#svcRoot .ekh-crumbs a'));
    return {
      title: left('#svcTitle'), facts: left('.svc-facts'), crumb: Math.round(crumb.getBoundingClientRect().left),
      titleTop: Math.round(document.querySelector('#svcTitle').getBoundingClientRect().top),
      asideTop: Math.round(document.querySelector('.svc-aside').getBoundingClientRect().top),
    };
  });
  expect(edges.crumb).toBe(edges.title);
  expect(edges.facts).toBe(edges.title);
  expect(edges.asideTop).toBe(edges.titleTop);

  // depth waits behind disclosures
  const legal = page.locator('#svc-d-legal');
  await expect(legal).not.toHaveAttribute('open', '');
  await legal.locator('summary').click();
  await expect(legal).toHaveAttribute('open', '');
  await expect(legal).toContainText('Налоговый кодекс');

  // reload lands on the same service; Back returns to the section
  await page.reload();
  await expect(page.locator('#svcTitle')).toHaveText('Справка о наличии или отсутствии судимости');
  await page.goBack();
  await expect(page.locator('#scr-category')).toBeVisible();
  await expect(page).toHaveURL(/#\/category\/certs/);
});

test('a stale service key falls back to its section', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/service/transport/zzzz');
  await expect(page.locator('#scr-category')).toBeVisible();
  await expect(page).toHaveURL(/#\/category\/transport$/);
});

test('similar services only appear when they share what makes a service distinct', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/category/transport');
  await page.locator('#cpList .svc-row', { hasText: 'Талон (листовка) технического осмотра' }).click();
  await expect(page.locator('.svc-related .svc-row')).toHaveCount(3);
  await expect(page.locator('.svc-related')).toContainText('Талон технического осмотра мотоцикла');

  await page.goBack();
  await page.locator('#cpList .svc-row', { hasText: 'тонированными стеклами' }).click();
  await expect(page.locator('#svcTitle')).toContainText('тонированными');
  await expect(page.locator('.svc-related')).toHaveCount(0);
});

test('the empty search offers everyday requests; typed everyday words find registry services', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light');
  const input = page.locator('#searchInput');
  await input.focus();
  await expect(page.locator('#searchPop')).toHaveClass(/open/);
  await expect(page.locator('#searchHint')).toHaveText('Часто ищут');
  await expect(page.locator('#searchItems .s-item__label')).toHaveText([
    'Справка о несудимости', 'Разрешение на тонировку', 'Загранпаспорт', 'Талон техосмотра', 'Справка с места жительства',
  ]);
  // the open list paints above the section after the hero band
  const top = await page.evaluate(() => {
    const items = document.querySelectorAll('#searchItems .s-item');
    const last = items[items.length - 1].getBoundingClientRect();
    return document.elementFromPoint(last.left + 40, last.top + last.height / 2)?.closest('.s-item') !== null;
  });
  expect(top).toBe(true);

  // the registry says «наличии или отсутствии судимости»; people say «несудимость»
  await input.fill('справка о несудимости');
  await expect(page.locator('#searchItems .s-item__label').first()).toHaveText('Справка о наличии или отсутствии судимости');
  // one shared word is not an intent: no «Открыть бизнес» for a marriage
  await input.fill('регистрация брака');
  await expect(page.locator('#searchItems')).not.toContainText('Открыть бизнес');
  await expect(page.locator('#searchItems .s-item__label').first()).toContainText('регистрация брака');
  // nothing found says so instead of vanishing
  await input.fill('xyzzy');
  await expect(page.locator('#searchHint')).toHaveText('Ничего не найдено. Попробуйте написать иначе.');

  await input.fill('тонировка');
  await input.press('Enter');
  await expect(page).toHaveURL(/#\/service\/transport\//);
  await expect(page.locator('#svcTitle')).toContainText('тонированными стеклами');
});

test('Apply asks to sign in, with help beside the decision that leads into the guide', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/category/certs');
  await page.locator('#cpList .svc-row', { hasText: 'Справка с места жительства' }).click();
  await expect(page.locator('.svc-apply__meta')).toContainText('Вход по номеру телефона');
  await page.locator('[data-svc-apply]').click();
  await expect(page.locator('#loginOverlay')).toHaveClass(/open|is-open/);
  await expect(page.locator('#loginPhone')).toHaveAttribute('aria-describedby', 'loginHelp');
  await expect(page.locator('#loginHelp')).toContainText('Аккаунт создастся сам');

  // the code step answers «no code?» in place — a toast would sit under the scrim
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  await page.locator('#loginResend').click();
  await expect(page.locator('#loginResent')).toHaveText('Новый код отправлен (демо)');
  await page.locator('#loginCancel').click();

  await page.locator('#loginHelp a').click();
  await expect(page.locator('#loginOverlay')).toBeHidden();
  await expect(page).toHaveURL(/#\/help\/sign-in$/);
  await expect(page.locator('[data-help-link="sign-in"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#help-sign-in h2')).toBeFocused();
});

test('signed in, the aside stops explaining sign-in and the birth service opens its built flow', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light#/category/family');
  await page.locator('#cpList .svc-row', { hasText: 'Государственная регистрация рождения' }).click();
  await page.locator('[data-svc-apply]').click();
  await completeCitizenLogin(page);
  await expect(page.locator('#scr-journey')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.svc-apply__meta')).toContainText('Данные подставятся из вашего профиля');
});

test('the help guide is one page with a contents menu that jumps between sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.locator('.hdr-nav a', { hasText: 'Помощь' }).click();
  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.locator('#helpTitle')).toHaveText('Помощь');
  await expect(page.locator('[data-help-link]')).toHaveCount(7);
  await expect(page.locator('[data-help-link="find"]')).toHaveAttribute('aria-current', 'true');

  await page.locator('[data-help-link="pay"]').click();
  await expect(page).toHaveURL(/#\/help\/pay$/);
  await expect(page.locator('#help-pay h2')).toBeFocused();
  await expect(page.locator('#help-pay')).toBeInViewport();
  await expect(page.locator('[data-help-link="pay"]')).toHaveAttribute('aria-current', 'true');

  // section jumps replace the entry: Back leaves the guide instead of replaying the reading
  await page.goBack();
  await expect(page.locator('#scr-home')).toBeVisible();

  // a footer link deep-links a section
  await page.locator('footer a', { hasText: 'Инструкция' }).click();
  await expect(page).toHaveURL(/#\/help\/apply$/);
  await expect(page.locator('#help-apply')).toBeInViewport();
});
