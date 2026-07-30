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

test('Authentication forms stay vertically centered across platforms', async ({ page }) => {
  await page.setViewportSize({ width: 1357, height: 987 });

  await page.goto('/ministry/?lang=ru&theme=light');
  const ministry = await page.evaluate(() => {
    const surface = document.querySelector('.login').getBoundingClientRect();
    const content = document.querySelector('.login__inner').getBoundingClientRect();
    const subtitleRange = document.createRange();
    subtitleRange.selectNodeContents(document.querySelector('.login__subtitle'));
    return {
      centerDelta: Math.abs((content.top + content.height / 2) - (surface.top + surface.height / 2)),
      legendText: document.querySelector('.login__legend-copy').textContent.trim(),
      legendBlockCount: document.querySelector('.login__legend').children.length,
      legendBreakCount: document.querySelectorAll('.login__legend-copy br').length,
      legendTextAlign: getComputedStyle(document.querySelector('.login__legend')).textAlign,
      legendIconCount: document.querySelectorAll('.login__legend .icon').length,
      fieldGap: Number.parseFloat(getComputedStyle(document.querySelector('.login__card .field')).gap),
      groupGap: Number.parseFloat(getComputedStyle(document.querySelector('.login__card > .stack')).gap),
      fieldGroupGap: Number.parseFloat(getComputedStyle(document.querySelector('.login__fields')).gap),
      fieldGroupMarginBottom: Number.parseFloat(getComputedStyle(document.querySelector('.login__fields')).marginBottom),
      cardHeight: document.querySelector('.login__card').getBoundingClientRect().height,
      cardRadius: Number.parseFloat(getComputedStyle(document.querySelector('.login__card')).borderRadius),
      cardPaddingTop: Number.parseFloat(getComputedStyle(document.querySelector('.login__card')).paddingTop),
      cardPaddingBottom: Number.parseFloat(getComputedStyle(document.querySelector('.login__card')).paddingBottom),
      buttonTopMargin: Number.parseFloat(getComputedStyle(document.querySelector('.login__card .btn')).marginTop),
      subtitleLineCount: subtitleRange.getClientRects().length,
      inputRadius: Number.parseFloat(getComputedStyle(document.querySelector('.login__card .field__input')).borderRadius),
      inputHeight: document.querySelector('.login__card .field__input').getBoundingClientRect().height,
      buttonHeight: document.querySelector('.login__card .btn--l').getBoundingClientRect().height,
      inputOutline: getComputedStyle(document.querySelector('.login__card .field__input')).boxShadow,
      buttonBackground: getComputedStyle(document.querySelector('.login__card .btn--primary')).backgroundColor,
      inputFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.login__card .field__input')).fontSize),
      loginLabelFontSize: Number.parseFloat(getComputedStyle(document.querySelector('label[for="l-pass"]')).fontSize),
      loginLabelFontWeight: getComputedStyle(document.querySelector('label[for="l-pass"]')).fontWeight,
      loginLabelLetterSpacing: getComputedStyle(document.querySelector('label[for="l-pass"]')).letterSpacing,
      usernameLabelTransform: getComputedStyle(document.querySelector('label[for="l-user"]')).transform,
      passwordLabelTransform: getComputedStyle(document.querySelector('label[for="l-pass"]')).transform,
      loginLabelTextTransform: getComputedStyle(document.querySelector('label[for="l-pass"]')).textTransform,
    };
  });
  expect(ministry.centerDelta).toBeLessThanOrEqual(1);
  expect(ministry.legendIconCount).toBe(0);
  expect(ministry.legendBlockCount).toBe(1);
  expect(ministry.legendBreakCount).toBe(1);
  expect(ministry.legendTextAlign).toBe('center');
  expect(ministry.fieldGap).toBe(0);
  expect(ministry.groupGap).toBe(12);
  expect(ministry.fieldGroupGap).toBe(12);
  expect(ministry.fieldGroupMarginBottom).toBe(20);
  expect(ministry.cardHeight).toBe(300);
  expect(ministry.cardRadius).toBe(28);
  expect(ministry.cardPaddingTop).toBe(36);
  expect(ministry.cardPaddingBottom).toBe(32);
  expect(ministry.buttonTopMargin).toBe(0);
  expect(ministry.subtitleLineCount).toBe(1);
  expect(ministry.inputRadius).toBeGreaterThanOrEqual(ministry.inputHeight / 2);
  expect(ministry.inputHeight).toBe(ministry.buttonHeight);
  expect(ministry.inputOutline).not.toBe('none');
  expect(ministry.buttonBackground).not.toBe('rgb(0, 0, 0)');
  expect(ministry.inputFontSize).toBe(16);
  expect(ministry.loginLabelFontSize).toBe(16);
  expect(ministry.loginLabelFontWeight).toBe('400');
  expect(ministry.loginLabelLetterSpacing).toBe('normal');
  expect(ministry.usernameLabelTransform).not.toBe(ministry.passwordLabelTransform);
  expect(ministry.loginLabelTextTransform).toBe('none');
  expect(ministry.legendText).toContain('Доступ по усиленной аутентификации (МФА).');
  expect(ministry.legendText).toContain('Все действия фиксируются в журнале аудита.');

  await page.locator('#l-pass').focus();
  await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => getComputedStyle(label).transform))
    .toBe(ministry.usernameLabelTransform);
  await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => Number.parseFloat(getComputedStyle(label).fontSize)))
    .toBe(16);
  await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => {
    const style = getComputedStyle(label);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return Number.parseFloat(style.fontSize) * Math.hypot(matrix.a, matrix.b);
  })).toBeCloseTo(13, 1);
  await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => getComputedStyle(label).fontWeight))
    .toBe('500');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ministry/?lang=tg&theme=light');
  await expectPageFits(page);
  const ministryMobileDelta = await page.evaluate(() => {
    const surface = document.querySelector('.login').getBoundingClientRect();
    const content = document.querySelector('.login__inner').getBoundingClientRect();
    return Math.abs((content.top + content.height / 2) - (surface.top + surface.height / 2));
  });
  expect(ministryMobileDelta).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1357, height: 987 });
  await page.goto('/tson/?lang=ru&theme=light');
  await expect(page.locator('.s-login__inner')).toBeVisible();
  const tson = await page.evaluate(() => {
    const surface = document.querySelector('.s-login').getBoundingClientRect();
    const content = document.querySelector('.s-login__inner').getBoundingClientRect();
    return Math.abs((content.top + content.height / 2) - (surface.top + surface.height / 2));
  });
  expect(tson).toBeLessThanOrEqual(1);

  await page.goto('/citizen/?lang=ru&theme=light');
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginOverlay .modal')).toBeVisible();
  await expect.poll(() => page.locator('#loginOverlay .modal').evaluate((element) => {
    const modal = element.getBoundingClientRect();
    return Math.abs((modal.top + modal.height / 2) - innerHeight / 2);
  })).toBeLessThanOrEqual(1);
});

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

  const queueGeometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const main = document.querySelector('.app__main').getBoundingClientRect();
    const queueRow = document.querySelector('.q-row').getBoundingClientRect();
    return { viewportWidth, mainWidth: main.width, mainRight: main.right, queueRowRight: queueRow.right };
  });
  expect(queueGeometry.mainWidth).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);
  expect(queueGeometry.mainRight).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);
  expect(queueGeometry.queueRowRight).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);

  for (const view of ['queue', 'all', 'overdue', 'batch', 'interop', 'reports', 'forms']) {
    if (view !== 'queue') {
      await page.locator('[data-act="nav-toggle"]').click();
      await page.locator(`.nav-item[data-view="${view}"]`).click();
    }
    await expect(page.locator('.app__main')).not.toBeEmpty();
    await expectPageFits(page);
  }

  await page.locator('[data-act="form-create"]').click();
  await expect(page.locator('.form-builder-grid')).toBeVisible();
  await expectPageFits(page);
  await page.locator('[data-act="form-add-field"]').click();
  await expectPageFits(page);
  await page.locator('[data-act="form-add-field-type"][data-id="date"]').click();
  await page.locator('.mfb-preview-toggle').click();
  await expectLayerFits(page, page.locator('.mfb-preview.is-open'));
  await page.locator('.mfb-preview__close').click();

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

test('Ministry and Admin form builders share the same desktop layout geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/ministry/?lang=ru&theme=light');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await page.locator('[data-act="login-enter"]').click();
  await page.locator('.nav-item[data-view="forms"]').click();
  await page.locator('[data-act="form-create"]').click();

  const ministry = await page.evaluate(() => ({
    pipeline: document.querySelector('.mfb-pipeline').getBoundingClientRect().width,
    editor: document.querySelector('.mfb-editor__inner').getBoundingClientRect().width,
    preview: document.querySelector('.mfb-preview').getBoundingClientRect().width,
    input: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-name-grid .input')).height),
    fieldLayout: getComputedStyle(document.querySelector('.mfb-field-item.is-open')).display,
    fieldWidth: document.querySelector('.mfb-field-item.is-open').getBoundingClientRect().width,
    fieldHeadWidth: document.querySelector('.mfb-field-item.is-open .mfb-field-head').getBoundingClientRect().width,
    fieldBodyWidth: document.querySelector('.mfb-field-item.is-open .mfb-field-body').getBoundingClientRect().width,
    tipCount: document.querySelectorAll('.mfb-tip').length,
    requiredCopyCount: [...document.querySelectorAll('.mfb-field-title > span')].filter((node) => /обязательно/i.test(node.textContent)).length,
    requiredMarkCount: document.querySelectorAll('.mfb-required-mark').length,
    requiredMarkDisplay: getComputedStyle(document.querySelector('.mfb-required-mark')).display,
    fieldLabelFont: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-name-grid .field__label')).fontSize),
    phoneRatio: document.querySelector('.mfb-phone').getBoundingClientRect().height / document.querySelector('.mfb-phone').getBoundingClientRect().width,
    previewAudienceRows: new Set([...document.querySelectorAll('.mfb-preview-audiences .form-audience')].map((node) => Math.round(node.getBoundingClientRect().top))).size,
    previewAudienceOrder: [...document.querySelectorAll('.mfb-preview-audiences .form-audience')].map((node) => ['person', 'business', 'guest'].find((id) => node.classList.contains(`form-audience--${id}`))),
    previewTitleFont: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-preview-body h2')).fontSize),
    previewIntroFont: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-preview-body > p')).fontSize),
    previewLabelFont: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-preview-body .field__label')).fontSize),
    previewInputFont: Number.parseFloat(getComputedStyle(document.querySelector('.mfb-preview-body .input')).fontSize),
    editorHeadGap: document.querySelector('.mfb-name-grid').getBoundingClientRect().top - document.querySelector('.mfb-editor__head').getBoundingClientRect().bottom,
    nameFieldGap: document.querySelector('.mfb-field-list').getBoundingClientRect().top - document.querySelector('.mfb-name-grid').getBoundingClientRect().bottom,
    requiredCenterDelta: Math.abs(
      document.querySelector('.mfb-required .check__input').getBoundingClientRect().top + document.querySelector('.mfb-required .check__input').getBoundingClientRect().height / 2
      - document.querySelector('.mfb-required > span').getBoundingClientRect().top - document.querySelector('.mfb-required > span').getBoundingClientRect().height / 2
    ),
  }));

  await page.setViewportSize({ width: 912, height: 690 });
  const medium = await page.evaluate(() => {
    const title = document.querySelector('.mfb-title h1');
    const previewToggle = document.querySelector('.mfb-preview-toggle').getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    return {
      titleClipped: title.scrollWidth > title.clientWidth + 1,
      titleBottom: titleRect.bottom,
      controlsTop: previewToggle.top,
    };
  });
  await expectPageFits(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.locator('[data-act="form-back"]').click();
  await page.locator('[data-act="form-open-static"][data-id="apostille"]').click();
  const published = await page.evaluate(() => ({
    fieldEditorCount: document.querySelectorAll('.mfb-field-body').length,
    fieldButtonCount: document.querySelectorAll('button.mfb-field-open').length,
    readonlyNotice: document.querySelector('.form-lock-note')?.textContent.trim(),
  }));

  await page.goto('/admin/builder.html?lang=ru&theme=light');
  const admin = await page.evaluate(() => ({
    pipeline: document.querySelector('.bld-pipe').getBoundingClientRect().width,
    editor: document.querySelector('.bld-edit .edit-pane:not([hidden])').getBoundingClientRect().width,
    preview: document.querySelector('.bld-prev').getBoundingClientRect().width,
    input: Number.parseFloat(getComputedStyle(document.querySelector('.bld-edit .input')).height),
    phoneRatio: document.querySelector('.pv-phone').getBoundingClientRect().height / document.querySelector('.pv-phone').getBoundingClientRect().width,
  }));

  expect(ministry.pipeline).toBeCloseTo(admin.pipeline, 0);
  expect(ministry.preview).toBeCloseTo(admin.preview, 0);
  expect(ministry.editor).toBeLessThanOrEqual(681);
  expect(admin.editor).toBeLessThanOrEqual(681);
  expect(ministry.input).toBe(admin.input);
  expect(ministry.input).toBe(52);
  expect(ministry.fieldLayout).toBe('block');
  expect(ministry.fieldHeadWidth).toBeCloseTo(ministry.fieldWidth, 0);
  expect(ministry.fieldBodyWidth).toBeCloseTo(ministry.fieldWidth, 0);
  expect(ministry.tipCount).toBe(0);
  expect(ministry.requiredCopyCount).toBe(0);
  expect(ministry.requiredMarkCount).toBeGreaterThan(0);
  expect(ministry.requiredMarkDisplay).toBe('inline');
  expect(ministry.fieldLabelFont).toBe(12);
  expect(ministry.phoneRatio).toBeGreaterThanOrEqual(2);
  expect(ministry.previewAudienceRows).toBe(1);
  expect(ministry.previewAudienceOrder).toEqual([...ministry.previewAudienceOrder].sort((a, b) => ['person', 'business', 'guest'].indexOf(a) - ['person', 'business', 'guest'].indexOf(b)));
  expect(ministry.previewTitleFont).toBeGreaterThan(ministry.previewIntroFont);
  expect(ministry.previewIntroFont).toBeGreaterThan(ministry.previewLabelFont);
  expect(ministry.previewInputFont).toBeLessThan(ministry.previewTitleFont);
  expect(admin.phoneRatio).toBeGreaterThanOrEqual(2);
  expect(ministry.editorHeadGap).toBeGreaterThanOrEqual(24);
  expect(ministry.nameFieldGap).toBeGreaterThanOrEqual(24);
  expect(ministry.requiredCenterDelta).toBeLessThanOrEqual(1);
  expect(medium.titleClipped).toBe(false);
  expect(medium.controlsTop).toBeGreaterThanOrEqual(medium.titleBottom);
  expect(published.fieldEditorCount).toBe(0);
  expect(published.fieldButtonCount).toBe(0);
  expect(published.readonlyNotice).toContain('Просмотр опубликованной версии');
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
    await page.locator('#approveBtn').click();
    await expectLayerFits(page, page.locator('#lowCodeActionOverlay .modal'));
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
