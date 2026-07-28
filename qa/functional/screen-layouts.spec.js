import { test, expect } from '@playwright/test';

async function expectPageFits(page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectLayerFits(page, layer) {
  await expect(layer).toBeVisible();
  // Drawers and dialogs enter with a short transition. Poll their settled
  // position so the assertion measures the usable layer, not an animation
  // frame while it is still sliding in from outside the viewport.
  await expect.poll(async () => layer.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= -1 && rect.top >= -1
      && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
  })).toBe(true);
  const bounds = await layer.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight + 1);
}

test('Citizen deep screens, profile panes, and dialogs fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/citizen/?lang=tg&theme=light');

  await page.locator('#loginBtn').click();
  await expectLayerFits(page, page.locator('#loginOverlay .modal'));
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();

  for (const destination of ['category', 'journey', 'emergency', 'notifs']) {
    if (destination === 'category') await page.locator('.cat').first().click();
    else await page.locator(`[data-go="${destination}"]`).first().click();
    await expect(page.locator(`#scr-${destination}`)).toBeVisible();
    await expectPageFits(page);
    await page.locator(`#scr-${destination} [data-go="home"]`).click();
  }

  await page.locator('[data-go="profile"]').first().click();
  for (const pane of ['data', 'docs', 'apps', 'contact', 'family', 'sec', 'access']) {
    await page.locator(`[data-pane="${pane}"]`).click();
    await expect(page.locator(`#pane-${pane}`)).toBeVisible();
    await expectPageFits(page);
  }

  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-qr]').first().click();
  await expectLayerFits(page, page.locator('#qrOverlay .modal'));
});

test('Ministry operational views, popovers, and dialogs fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ministry/?lang=ru&theme=light');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await page.locator('[data-act="login-enter"]').click();

  for (const view of ['queue', 'all', 'overdue', 'batch', 'interop', 'reports']) {
    if (view !== 'queue') {
      await page.locator('[data-act="nav-toggle"]').click();
      await page.locator(`.nav-item[data-view="${view}"]`).click();
    }
    await expect(page.locator('.app__main')).not.toBeEmpty();
    await expectPageFits(page);
  }

  await page.locator('[data-act="notif-open"]').click();
  await expectLayerFits(page, page.locator('.notif-pop'));
  await page.keyboard.press('Escape');
  await page.locator('[data-act="user-open"]').click();
  await expectLayerFits(page, page.locator('.user-pop'));
  await page.keyboard.press('Escape');

  await page.locator('[data-act="nav-toggle"]').click();
  await page.locator('.nav-item[data-view="queue"]').click();
  await page.locator('.q-row').first().click();
  await expectPageFits(page);
  const request = page.locator('[data-act="act-request"]');
  if (await request.count()) {
    await request.click();
    await expectLayerFits(page, page.locator('#overlay .modal'));
    await page.locator('[data-act="modal-cancel"]').click();
  }
  const decide = page.locator('[data-act="act-decide"]');
  if (await decide.count()) {
    await decide.click();
    await expectLayerFits(page, page.locator('#overlay .modal'));
  }
});

test('Admin wizard, builder panels, and dialogs fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/new-service.html?lang=tg&theme=light');
  await expectPageFits(page);
  for (let step = 2; step <= 4; step += 1) {
    await page.locator('[data-step]:not([hidden]) [data-next]').click();
    await expect(page.locator(`[data-step="${step}"]`)).toBeVisible();
    await expectPageFits(page);
  }

  await page.goto('/admin/builder.html?lang=tg&theme=light');
  for (const panel of ['confirm', 'fields', 'delivery', 'review', 'checks', 'route', 'issue', 'rules', 'templates', 'sandbox', 'versions', 'access']) {
    const tab = page.locator(`.stg[data-tab="${panel}"]`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(page.locator(`.bld-edit [data-panel="${panel}"]`)).toBeVisible();
    await expectPageFits(page);
  }

  await page.locator('.stg[data-tab="fields"]').click();
  await page.locator('#addField').click();
  await expectLayerFits(page, page.locator('#paletteModal .modal'));
  await page.locator('#paletteModal [data-close]').click();
  await page.locator('#publishBtn').click();
  await expectLayerFits(page, page.locator('#publishModal .modal'));
});

test('TSON session catalog, citizen data, form, documents, and result remain readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/tson/?dev=1&lang=ru&theme=light');
  await page.locator('input[name="password"]').fill('demo');
  await page.locator('form').getByRole('button', { name: 'Войти' }).click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();

  await page.keyboard.press('`');
  const demo = page.locator('.demo');
  await expect(demo).toBeVisible();
  await demo.getByRole('button', { name: 'Начать приём', exact: true }).click();
  await demo.getByRole('button', { name: 'Идентифицирован (push)', exact: true }).click();
  await demo.getByRole('button', { name: 'Согласие: подтвердить', exact: true }).click();
  await expect(page.locator('.s-catalog')).toBeVisible();
  await demo.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expectPageFits(page);

  await page.locator('.sessionbar__who').click();
  await expect(page.locator('.s-data')).toBeVisible();
  await expectPageFits(page);
  await page.locator('.s-data__head .btn').click();
  await expect(page.locator('.s-catalog')).toBeVisible();

  await page.locator('.s-catalog__freq').first().click();
  await expectLayerFits(page, page.locator('.drawer'));
  await page.locator('.s-drawer__cta').click();
  await expectLayerFits(page, page.locator('.modal'));
  await page.locator('.s-scope__foot .btn--primary').click();
  await page.keyboard.press('`');
  await expect(demo).toBeVisible();
  // This panel stands in for the citizen's external phone. Invoke its event
  // directly: a forced pointer click would correctly hit the operator-facing
  // backdrop instead of the simulated phone behind it.
  await demo.getByRole('button', { name: /Выдать «Семья»/ }).evaluate((button) => button.click());
  await expect(page.locator('.s-scope')).toHaveCount(0);
  await demo.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.locator('.s-form')).toBeVisible();
  await expect(page.locator('.s-form [name="full"]')).not.toHaveValue('');
  await expect(page.locator('.s-form [name="phone"]')).not.toHaveValue('');
  await expectPageFits(page);

  await page.locator('.s-form__foot .btn--primary').click();
  await expect(page.locator('.s-docs')).toBeVisible();
  await expectPageFits(page);
  await page.locator('.s-docs__foot .btn--primary').click();
  const confirmation = page.locator('.overlay .modal');
  await expectLayerFits(page, confirmation);
  await confirmation.locator('.check__input').check();
  await confirmation.locator('.modal__foot .btn--primary').click();
  await expect(page.locator('.s-result')).toBeVisible();
  await expectPageFits(page);
});
