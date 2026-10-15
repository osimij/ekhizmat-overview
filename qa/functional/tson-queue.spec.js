import { test, expect } from '@playwright/test';

/* ЦОН · электронная очередь на главной смены (design-guide §3 «Workstation
   queue»). Очередь → вызов → приём → завершение → снова очередь, а также
   неявка, перевод, недоступный перевод и состояния очереди. Набор кнопок и
   причины недоступности присылает сервер очереди (mock/api.js → queue). */

async function signIn(page) {
  await page.goto('/tson/?lang=ru&theme=light&dev=1');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-queue [role="option"]').first()).toBeVisible();
}

const openDemo = page => page.evaluate(() =>
  dispatchEvent(new KeyboardEvent('keydown', { key: '`', bubbles: true })));

async function reasonOf(page, button) {
  const id = await button.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  return page.locator(`#${id}`);
}

test('TSON queue: a called ticket carries the reception from the queue to its result', async ({ page }) => {
  await signIn(page);
  const queue = page.locator('.s-queue');
  const win = page.locator('.s-window');

  // Ticket, service, status, wait and window — nothing about the person.
  await expect(queue.locator('.s-queue__cols span')).toHaveText(['Талон', 'Услуга', 'Статус', 'Ожидание', 'Окно']);
  await expect(queue.locator('[role="option"]')).toHaveCount(13);
  await expect(queue.locator('.s-queue__now')).toHaveText(/^12 ожидают · в среднем \d+ мин$/);
  const columns = await queue.evaluate((element) => [...element.querySelectorAll('.s-queue__cols, .s-queue__row')]
    .map((node) => getComputedStyle(node).gridTemplateColumns));
  expect(new Set(columns).size).toBe(1);
  await expect(queue.locator('[data-ticket="t-B014"] .status-icon')).toHaveAttribute('aria-label', 'Вызван к окну 6');

  // The server suggests the next ticket for this window: the one transferred to it.
  await expect(queue.locator('[aria-selected="true"]')).toHaveAttribute('data-ticket', 't-A028');
  await expect(win.locator('.s-window__no')).toHaveText('A028');
  await expect(win.locator('.s-window__state')).toHaveText('Переведён к вам из окна 3');

  // A ticket this window cannot call keeps its button and says why.
  await queue.locator('[data-ticket="t-B015"]').click();
  const call = win.locator('[data-action="call"]');
  await expect(call).toHaveAttribute('aria-disabled', 'true');
  await expect(await reasonOf(page, call)).toHaveText('Зону «Регистрация» ведут окна 5, 6, 7, 8');

  // The queue is a listbox: arrows move the choice, the window follows it.
  await queue.locator('[data-ticket="t-B015"]').focus();
  await page.keyboard.press('ArrowUp');
  await expect(queue.locator('[aria-selected="true"]')).toHaveAttribute('data-ticket', 't-A028');
  await expect(queue.locator('[data-ticket="t-A028"]')).toBeFocused();
  await expect(call).not.toHaveAttribute('aria-disabled', 'true');

  // Called: the window offers exactly the set the server sent, primary first.
  await call.click();
  await expect(win.locator('.visit-actions__btn')).toHaveText([/^Начать приём/, 'Повторить вызов', 'Неявка', 'Перевести в другое окно']);
  await expect(win.locator('.visit-actions__btn').first()).toHaveClass(/btn--primary/);
  await expect(win.locator('[data-action="noShow"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(win.locator('.visit-actions__reason')).toHaveText(['Неявку можно отметить после повторного вызова']);
  await expect(page.locator('#live')).toHaveText('Талон A028 вызван к окну 1');
  // While the window has its ticket the queue is an overview, not a choice.
  await expect(queue.locator('[role="list"]')).toBeVisible();
  await expect(queue.locator('[role="option"]')).toHaveCount(0);

  // «Начать приём» (F2) belongs to this ticket: it rides in the visit bar from
  // identification through consent…
  await page.keyboard.press('F2');
  await expect(page).toHaveURL(/#\/identify/);
  const bar = page.locator('#sessionbar');
  await expect(bar).toHaveClass(/sessionbar--pre/);
  await expect(bar.locator('.sessionbar__no')).toHaveText('Талон A028');
  await expect(bar.locator('.sessionbar__svc')).toHaveText('Замена паспорта');
  await openDemo(page);
  const demo = page.locator('.demo');
  await demo.getByRole('button', { name: 'Идентифицирован (push)', exact: true }).click();
  await expect(page).toHaveURL(/#\/consent/);
  await expect(bar.locator('.sessionbar__no')).toHaveText('Талон A028');
  await demo.getByRole('button', { name: 'Согласие: подтвердить', exact: true }).click();
  await demo.getByRole('button', { name: 'Закрыть', exact: true }).click();

  // …into the session, beside the masked citizen.
  await expect(page).toHaveURL(/#\/session\/catalog/);
  await expect(bar).not.toHaveClass(/sessionbar--pre/);
  await expect(bar.locator('.sessionbar__no')).toHaveText('Талон A028');
  await expect(bar.locator('.sessionbar__who')).toBeVisible();

  // Finishing asks for the result; «Заявление принято» needs a registered application.
  await page.keyboard.press('F9');
  const dialog = page.locator('.s-finish-dialog');
  await expect(dialog.locator('.s-finish__name')).toHaveText([
    'Консультация', 'Заявление принято', 'Отказ', 'Требуется повторный визит', 'Техническая проблема',
  ]);
  await expect(dialog.locator('input[value="accepted"]')).toBeDisabled();
  await expect(dialog.locator('.s-finish__opt.is-off .s-finish__hint'))
    .toHaveText('В этом приёме заявление не зарегистрировано');
  const finish = dialog.getByRole('button', { name: 'Завершить приём' });
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
  await expect(await reasonOf(page, finish)).toHaveText('Выберите результат');
  // The whole decision fits the 1280 × 720 workstation without scrolling the dialog.
  expect(await dialog.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await dialog.getByText('Консультация', { exact: true }).click();
  await expect(finish).not.toHaveAttribute('aria-disabled', 'true');
  await finish.click();

  // Back to the queue: the ticket is closed, the next one is suggested.
  await expect(page).toHaveURL(/#\/idle/);
  await expect(page.locator('#toasts')).toContainText('A028: консультация');
  await expect(bar).toBeHidden();
  await expect(queue.locator('[data-ticket="t-A028"]')).toHaveCount(0);
  await expect(queue.locator('[aria-selected="true"]')).toHaveAttribute('data-ticket', 't-A027');
});

test('TSON queue: no-show, transfer, an unavailable transfer and the queue states', async ({ page }) => {
  await signIn(page);
  const queue = page.locator('.s-queue');
  const win = page.locator('.s-window');

  // No-show only after a repeat call, and only with a confirmation.
  await win.locator('[data-action="call"]').click();
  await win.locator('[data-action="recall"]').click();
  await expect(win.locator('.s-window__state')).toHaveText(/^Повторный вызов в \d\d:\d\d · 2 из 3$/);
  const noShow = win.locator('[data-action="noShow"]');
  await expect(noShow).not.toHaveAttribute('aria-disabled', 'true');
  await noShow.click();
  const confirm = page.locator('.ekh-dialog');
  await expect(confirm.locator('.modal__title')).toHaveText('Отметить неявку A028?');
  await confirm.getByRole('button', { name: 'Неявка' }).click();
  await expect(page.locator('#toasts')).toContainText('A028: неявка');
  await expect(queue.locator('[data-ticket="t-A028"]')).toHaveCount(0);
  await expect(queue.locator('[aria-selected="true"]')).toHaveAttribute('data-ticket', 't-A027');

  // Transfer: the centre's windows as tiles; unavailable ones stay with a reason;
  // the confirming button names the target.
  await win.locator('[data-action="call"]').click();
  await win.locator('[data-action="transfer"]').click();
  const dialog = page.locator('.s-transfer-dialog');
  await expect(dialog.locator('.s-transfer__win')).toHaveCount(9);
  await expect(dialog.locator('.s-transfer__win', { hasText: 'Окно 9' })).toContainText('Перерыв');
  await expect(dialog.locator('.s-transfer__win', { hasText: 'Окно 10' })).toContainText('Закрыто');
  await expect(dialog.locator('.s-transfer__win', { hasText: 'Окно 5' })).toContainText('Другая зона');
  const send = dialog.locator('.modal__foot .btn--primary');
  await expect(send).toHaveText('Перевести');
  await expect(send).toHaveAttribute('aria-disabled', 'true');
  await expect(await reasonOf(page, send)).toHaveText('Выберите окно');
  await dialog.locator('input[value="4"]').check();
  await expect(send).toHaveText('Перевести в окно 4');
  await send.click();
  await expect(page.locator('#toasts')).toContainText('Талон A027 переведён в окно 4');
  const moved = queue.locator('[data-ticket="t-A027"]');
  await expect(moved.locator('.status-icon')).toHaveAttribute('aria-label', 'Переведён в окно 4');
  await expect(moved.locator('.s-queue__cell').last()).toHaveText('4');

  // A consultation ticket has nowhere to go: the zone's other window is on a break.
  await queue.locator('[data-ticket="t-C009"]').click();
  await win.locator('[data-action="call"]').click();
  const transfer = win.locator('[data-action="transfer"]');
  await expect(transfer).toHaveAttribute('aria-disabled', 'true');
  await expect(await reasonOf(page, transfer))
    .toHaveText('Перевести некуда: зону «Консультации» сейчас не ведёт ни одно открытое окно');

  // Queue states come from the server: unavailable (with retry), loading, empty.
  await openDemo(page);
  const demo = page.locator('.demo');
  await demo.getByRole('button', { name: 'Очередь недоступна' }).click();
  await expect(queue.locator('.s-queue__state')).toContainText('Очередь не загрузилась');
  await expect(queue.getByRole('button', { name: 'Повторить запрос' })).toBeVisible();
  await demo.getByRole('button', { name: 'Очередь грузится' }).click();
  await expect(queue.locator('.s-queue__row--skel')).toHaveCount(6);
  await demo.getByRole('button', { name: 'Пустая очередь' }).click();
  await expect(queue.locator('.s-queue__state')).toContainText('Очередь пуста');
  await expect(queue.locator('.s-queue__now')).toHaveText('');
  // The called ticket stays with its window — the person is still at the desk.
  await expect(win.locator('.s-window__no')).toHaveText('C009');
  await demo.getByRole('button', { name: 'Обычная очередь' }).click();
  await expect(queue.locator('[role="list"] .s-queue__row').first()).toBeVisible();
});

test('TSON queue: the head of center counts the same queue the operator works', async ({ page }) => {
  await signIn(page);
  const operatorNow = page.locator('.s-queue__now');
  const cards = page.locator('.queue-card');
  const centerNow = page.locator('.dashboard-queue-head .small');
  const switchRole = async (name, url) => {
    await page.getByRole('button', { name: /меню оператора/i }).click();
    await page.getByRole('menuitemradio', { name }).click();
    await expect(page).toHaveURL(url);
  };

  await expect(operatorNow).toHaveText(/^12 ожидают · в среднем \d+ мин$/);
  await switchRole(/Руководитель отделения/, /#\/dashboard-center/);
  // One queue, two screens: the zones sum to what the operator sees waiting.
  await expect(cards.locator('.queue-card__name')).toHaveText(['Документы', 'Регистрация', 'Консультации']);
  await expect(cards.locator('strong')).toHaveText(['6', '4', '2']);
  // The unit keeps a non-breaking space (fmtMinutes), hence \s.
  await expect(centerNow).toHaveText(/^12 ожидают · ожидание в среднем \d+\sмин$/);

  // The operator calls a ticket from the documents zone…
  await switchRole(/^Оператор/, /#\/idle/);
  await page.locator('.s-window [data-action="call"]').click();
  await expect(page.locator('.s-window [data-action="start"]')).toBeVisible();
  await expect(operatorNow).toHaveText(/^11 ожидают/);

  // …and the head of center sees one fewer waiting there.
  await switchRole(/Руководитель отделения/, /#\/dashboard-center/);
  await expect(cards.locator('strong')).toHaveText(['5', '4', '2']);
  await expect(centerNow).toHaveText(/^11 ожидают/);

  // A new ticket from the kiosk reaches the open dashboard without a reload.
  await openDemo(page);
  await page.locator('.demo').getByRole('button', { name: 'Новый талон', exact: true }).click();
  await expect(centerNow).toHaveText(/^12 ожидают/);
});
