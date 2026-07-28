import { test, expect } from '@playwright/test';

async function expectSameActionHeight(page, selector) {
  const group = page.locator(selector);
  const buttons = group.locator('.btn:visible');
  await expect(buttons).toHaveCount(2);
  const before = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.abs(before[0] - before[1])).toBeLessThanOrEqual(1);
  await buttons.last().hover();
  const hovered = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.abs(hovered[0] - hovered[1])).toBeLessThanOrEqual(1);
}

test('Citizen category, profile, wallet, QR and logout flow', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light');
  await page.locator('.cat').first().click();
  await expect(page.locator('#scr-category')).toBeVisible();
  await page.locator('#scr-category [data-go="home"]').click();

  await page.locator('#loginBtn').click();
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'in');

  await page.locator('[data-go="journey"]:visible').first().click();
  await expect(page.locator('#scr-journey')).toBeVisible();
  await page.locator('#childName').fill('Сомон');
  await page.locator('#toStep2').click();
  await expectSameActionHeight(page, '#jstep-2 .j-acts');
  await page.locator('#scr-journey [data-go="home"]').click();

  await page.locator('[data-go="profile"]').first().click();
  await expect(page.locator('#scr-profile')).toBeVisible();
  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-qr]').first().click();
  await expect(page.locator('#qrOverlay')).toHaveClass(/is-open/);
  await page.locator('#qrClose').click();
  await page.locator('#logoutBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'out');
});

test('Authentication never pre-fills a password or verification code', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light');
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginPhone')).toHaveValue('');

  await page.goto('/ministry/?lang=ru&theme=light');
  await expect(page.locator('#l-user')).not.toHaveValue('');
  await expect(page.locator('#l-pass')).toHaveValue('');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  for (const cell of await page.locator('.otp__cell').all()) await expect(cell).toHaveValue('');

  await page.goto('/tson/?lang=ru&theme=light');
  await expect(page.locator('input[name="username"]')).not.toHaveValue('');
  await expect(page.locator('input[name="password"]')).toHaveValue('');
  await page.locator('input[name="password"]').fill('demo');
  await page.locator('form').getByRole('button', { name: 'Войти' }).click();
  for (const cell of await page.locator('.otp__cell').all()) await expect(cell).toHaveValue('');
});

test('Ministry MFA, queue, detail tabs and decision dialogs flow', async ({ page }) => {
  await page.goto('/ministry/?lang=ru&theme=light');
  const legendGeometry = await page.locator('.login__legend').evaluate((legend) => {
    const icon = legend.querySelector('.icon').getBoundingClientRect();
    const text = legend.querySelector('span').getBoundingClientRect();
    return {
      display: getComputedStyle(legend).display,
      iconTop: icon.top,
      iconRight: icon.right,
      textTop: text.top,
      textLeft: text.left,
    };
  });
  expect(legendGeometry.display).toBe('flex');
  expect(Math.abs(legendGeometry.iconTop - legendGeometry.textTop)).toBeLessThanOrEqual(3);
  expect(legendGeometry.iconRight).toBeLessThanOrEqual(legendGeometry.textLeft);
  await expect(page.locator('#l-pass')).toHaveValue('');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  await expectSameActionHeight(page, '.login__actions');
  await expect(page.locator('#l-otp')).toBeVisible();
  await expect(page.locator('.otp__cell')).toHaveCount(6);
  const ministryOtp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await ministryOtp.nth(index).fill(String(index + 1));
  await page.locator('[data-act="login-enter"]').click();
  await expect(page.locator('#app')).toBeVisible();
  const profileRow = await page.locator('.side__foot > .row').evaluate((row) => {
    const avatar = row.querySelector('.avatar').getBoundingClientRect();
    const name = row.querySelector('b').getBoundingClientRect();
    return {
      display: getComputedStyle(row).display,
      direction: getComputedStyle(row).flexDirection,
      avatarRight: avatar.right,
      nameLeft: name.left,
      verticallyOverlapping: avatar.top < name.bottom && avatar.bottom > name.top,
    };
  });
  expect(profileRow.display).toBe('flex');
  expect(profileRow.direction).toBe('row');
  expect(profileRow.avatarRight).toBeLessThanOrEqual(profileRow.nameLeft);
  expect(profileRow.verticallyOverlapping).toBe(true);
  const ministryTypeScale = await page.evaluate(() => {
    const size = (selector) => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
    const spacing = (selector) => Number.parseFloat(getComputedStyle(document.querySelector(selector)).letterSpacing) || 0;
    return {
      name: size('.side__foot b'),
      division: size('.side__division'),
      title: size('.view__titles .h2'),
      nameSpacing: spacing('.side__foot b'),
      divisionSpacing: spacing('.side__division'),
      titleSpacing: spacing('.view__titles .h2'),
    };
  });
  expect(ministryTypeScale.division).toBeLessThan(ministryTypeScale.name);
  expect(ministryTypeScale.name - ministryTypeScale.division).toBe(1);
  expect(ministryTypeScale.title).toBe(24);
  expect(ministryTypeScale.nameSpacing).toBe(0);
  expect(ministryTypeScale.divisionSpacing).toBe(0);
  expect(ministryTypeScale.titleSpacing).toBe(0);
  const alertValueColor = await page.locator('.stat--alert .stat__v').evaluate((value) => ({
    value: getComputedStyle(value).color,
    defaultText: getComputedStyle(document.body).color,
  }));
  expect(alertValueColor.value).toBe(alertValueColor.defaultText);
  await expect(page.locator('.q-head')).toHaveCSS('border-bottom-width', '0px');

  await page.locator('.nav-item[data-view="reports"]').click();
  const reportStyle = await page.evaluate(() => {
    const bodyColor = getComputedStyle(document.body).color;
    const title = document.querySelector('.panel__title').getBoundingClientRect();
    const header = document.querySelector('.report-row--head > :first-child').getBoundingClientRect();
    const specialist = document.querySelector('.report-row__who').getBoundingClientRect();
    return {
      bodyColor,
      onTimeColor: getComputedStyle(document.querySelector('.stat--ok .stat__v')).color,
      meterColors: [...document.querySelectorAll('.meter__fill')].map((meter) => getComputedStyle(meter).backgroundColor),
      titleLeft: title.left,
      headerLeft: header.left,
      specialistLeft: specialist.left,
    };
  });
  expect(reportStyle.onTimeColor).toBe(reportStyle.bodyColor);
  expect(new Set(reportStyle.meterColors)).toEqual(new Set([reportStyle.bodyColor]));
  expect(Math.abs(reportStyle.headerLeft - reportStyle.titleLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(reportStyle.specialistLeft - reportStyle.titleLeft)).toBeLessThanOrEqual(1);
  await page.locator('.nav-item[data-view="queue"]').click();

  await page.locator('[data-act="user-open"]').click();
  await page.locator('[data-act="lock"]').click();
  await expect(page.locator('#lock-root input[name="password"]')).toHaveValue('');
  await page.locator('[data-act="unlock"]').click();

  await page.locator('.nav-item[data-view="overdue"]').click();
  const overdueBanner = page.locator('.banner--error').first();
  await expect(overdueBanner).toBeVisible();
  const overdueColors = await overdueBanner.evaluate((element) => ({
    text: getComputedStyle(element).color,
    icon: getComputedStyle(element.querySelector('.icon')).color,
  }));
  expect(overdueColors.icon).toBe(overdueColors.text);
  await page.locator('.nav-item[data-view="queue"]').click();

  await page.locator('#top-search').fill('ТҶ');
  await page.locator('#top-search').fill('');
  await page.locator('.q-row').first().click();
  await expect(page.locator('#tabpanel')).toBeVisible();
  await page.locator('[data-tab="docs"]').click();
  await page.locator('[data-tab="overview"]').click();

  const request = page.locator('[data-act="act-request"]');
  if (await request.count()) {
    await request.click();
    await expect(page.locator('#rm-type')).toBeVisible();
    await page.locator('[data-act="modal-cancel"]').click();
  }
  const decide = page.locator('[data-act="act-decide"]');
  if (await decide.count()) {
    await decide.click();
    await expect(page.locator('#overlay .modal[role="dialog"]')).toBeVisible();
    await page.locator('[data-act="modal-cancel"]').click();
  }
});

test('TSON MFA reaches the shift dashboard and exposes operational start', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('form').getByRole('button', { name: 'Войти' }).click();
  await expect(page.locator('.otp')).toBeVisible();
  await expectSameActionHeight(page, '.s-login form');
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();
  await expect(page).toHaveURL(/#\/idle/);
});

test('TSON registration confirmation keeps its attestation above the actions', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light&dev=1');

  // The built-in demo panel drives only legal state-machine events and lets
  // this test reach the deep registration screen without faking app internals.
  const demo = page.locator('.demo');
  await expect(demo).toBeAttached();
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: '`', bubbles: true })));
  await demo.getByRole('button', { name: 'MFA пройдена', exact: true }).click();
  await demo.getByRole('button', { name: 'Привязка ок', exact: true }).click();
  await demo.getByRole('button', { name: 'Начать приём', exact: true }).click();
  await demo.getByRole('button', { name: 'Гражданина нет в eKhizmat', exact: true }).click();
  await expect(page).toHaveURL(/#\/enroll/);
  await demo.getByRole('button', { name: 'Закрыть', exact: true }).click();

  const actionBar = page.locator('.s-enroll__foot');
  await expect(actionBar).toBeVisible();
  const actionBarGeometry = await actionBar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      position: style.position,
      borderTopStyle: style.borderTopStyle,
      borderTopWidth: style.borderTopWidth,
      bottomGap: innerHeight - rect.bottom,
      leftGap: rect.left,
      rightGap: innerWidth - rect.right,
    };
  });
  expect(actionBarGeometry.position).toBe('fixed');
  expect(actionBarGeometry.borderTopStyle).toBe('solid');
  expect(actionBarGeometry.borderTopWidth).toBe('1px');
  expect(Math.abs(actionBarGeometry.bottomGap)).toBeLessThanOrEqual(1);
  expect(Math.abs(actionBarGeometry.leftGap)).toBeLessThanOrEqual(1);
  expect(Math.abs(actionBarGeometry.rightGap)).toBeLessThanOrEqual(1);

  const screen = page.locator('#screen');
  await screen.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const scrolledBottomGap = await actionBar.evaluate((element) =>
    innerHeight - element.getBoundingClientRect().bottom,
  );
  expect(Math.abs(scrolledBottomGap)).toBeLessThanOrEqual(1);
  await screen.evaluate((element) => { element.scrollTop = 0; });

  const pages = page.locator('.s-enroll__page');
  await pages.nth(0).click();
  await expect(page.locator('[name="full"]')).not.toHaveValue('');
  await pages.nth(1).click();
  await expect(page.locator('[name="address"]')).not.toHaveValue('');

  const warningBanner = page.locator('.s-enroll__banner .banner--warn');
  await expect(warningBanner).toBeVisible();
  const warningColors = await warningBanner.evaluate((element) => ({
    text: getComputedStyle(element).color,
    icon: getComputedStyle(element.querySelector('.icon')).color,
  }));
  expect(warningColors.icon).toBe(warningColors.text);

  await page.locator('.s-enroll__foot .btn--primary').click();

  const dialog = page.locator('.overlay .modal[role="dialog"]');
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((modal) => {
    const label = modal.querySelector('label.check').getBoundingClientRect();
    const body = modal.querySelector('.modal__body').getBoundingClientRect();
    const foot = modal.querySelector('.modal__foot').getBoundingClientRect();
    return {
      labelWidth: label.width,
      labelRight: label.right,
      labelBottom: label.bottom,
      bodyRight: body.right,
      footTop: foot.top,
      modalAlign: getComputedStyle(modal).textAlign,
      titleAlign: getComputedStyle(modal.querySelector('.modal__title')).textAlign,
      keyAlign: getComputedStyle(modal.querySelector('.def__key')).textAlign,
      valueAlign: getComputedStyle(modal.querySelector('.def__val')).textAlign,
      actions: Array.from(modal.querySelectorAll('.modal__foot .btn')).map((button) => {
        const rect = button.getBoundingClientRect();
        return { top: rect.top, height: rect.height, width: rect.width };
      }),
    };
  });
  expect(geometry.labelWidth).toBeGreaterThan(200);
  expect(geometry.labelRight).toBeLessThanOrEqual(geometry.bodyRight + 1);
  expect(geometry.labelBottom).toBeLessThanOrEqual(geometry.footTop);
  expect(geometry.modalAlign).toBe('left');
  expect(geometry.titleAlign).toBe('left');
  expect(geometry.keyAlign).toBe('left');
  expect(geometry.valueAlign).toBe('left');
  expect(Math.abs(geometry.actions[0].top - geometry.actions[1].top)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actions[0].height - geometry.actions[1].height)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actions[0].width - geometry.actions[1].width)).toBeLessThanOrEqual(1);
});

test('Admin new-service wizard, builder edit and publish gate flow', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=tg&theme=light');
  for (let step = 2; step <= 4; step += 1) {
    await page.locator('[data-step]:not([hidden]) [data-next]').click();
    await expect(page.locator(`[data-step="${step}"]`)).toBeVisible();
    await expectSameActionHeight(page, `[data-step="${step}"] .j-acts`);
  }
  await page.locator('[data-step="4"] a[href="builder.html"]').click();
  await expect(page).toHaveURL(/builder\.html/);

  const before = await page.locator('.fb-item').count();
  await page.locator('#addField').click();
  await page.locator('#paletteModal [data-add="text"]').click();
  await expect(page.locator('.fb-item')).toHaveCount(before + 1);
  await page.locator('#publishBtn').click();
  await expect(page.locator('#publishModal')).toHaveClass(/open/);
  await expect(page.locator('#chkList .chk-row')).not.toHaveCount(0);
});
