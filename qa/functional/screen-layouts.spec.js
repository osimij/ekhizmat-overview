import { test, expect } from '@playwright/test';
import { completeCitizenLogin } from '../helpers/citizen-auth.js';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

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

test('launcher splits one content column: intro left, destination stack right', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?present=1&theme=dark&lang=tg');

  const layout = await page.evaluate(() => {
    const intro = document.querySelector('.launch-intro').getBoundingClientRect();
    const list = document.querySelector('.platform-list').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.platform-card')].map((element) => element.getBoundingClientRect());
    const chrome = document.querySelector('.launch-chrome').getBoundingClientRect();
    const langGlyph = document.querySelector('#langToggle svg').getBoundingClientRect();
    const h1 = document.querySelector('h1');
    const logo = document.querySelector('.brand-lockup').getBoundingClientRect();
    const title = h1.getBoundingClientRect();
    return {
      introLeft: intro.left,
      introRight: intro.right,
      listLeft: list.left,
      introMidY: intro.top + intro.height / 2,
      listMidY: list.top + list.height / 2,
      cardXs: cards.map((card) => Math.round(card.left)),
      cardWidths: cards.map((card) => Math.round(card.width)),
      chromeBottom: innerHeight - chrome.bottom,
      chromeGlyphLeft: langGlyph.left,
      titleLeft: title.left,
      listRight: list.right,
      stageMidY: (intro.top + intro.height / 2 + list.top + list.height / 2) / 2,
      logoAboveTitle: logo.bottom <= title.top + 1,
      headerCount: document.querySelectorAll('.launch-header').length,
      titleSize: Number.parseFloat(getComputedStyle(h1).fontSize),
      titleHeight: title.height,
      overflowX: document.documentElement.scrollWidth - innerWidth,
    };
  });

  expect(layout.headerCount).toBe(0);
  expect(layout.logoAboveTitle).toBe(true);
  expect(layout.listLeft).toBeGreaterThan(layout.introRight);
  expect(new Set(layout.cardXs).size).toBe(1);
  expect(new Set(layout.cardWidths).size).toBe(1);
  expect(Math.abs(layout.introMidY - layout.listMidY)).toBeLessThan(48);
  // The stage centers on the viewport, not on what the bottom chrome leaves.
  expect(Math.abs(layout.stageMidY - 500)).toBeLessThan(8);
  // Destinations end on the content edge; preferences start on the other one.
  expect(layout.listRight).toBeGreaterThan(layout.titleLeft + 800);
  expect(Math.abs(layout.chromeGlyphLeft - layout.titleLeft)).toBeLessThanOrEqual(1);
  expect(layout.chromeBottom).toBeLessThan(80);
  // Figma --fs-36, presented at --launch-scale (.85), on one line.
  expect(layout.titleSize).toBeCloseTo(30.6, 1);
  expect(layout.titleHeight).toBeLessThan(45);
  expect(layout.overflowX).toBeLessThanOrEqual(1);
});

test('launcher stacks below 960px and never overflows across viewports', async ({ page }) => {
  const viewports = [
    [360, 800],
    [620, 800],
    [768, 1024],
    [960, 700],
    [1280, 720],
    [1440, 700],
    [1920, 1080],
  ];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto('/?present=1&theme=light&lang=tg');
    const layout = await page.evaluate(() => {
      const intro = document.querySelector('.launch-intro').getBoundingClientRect();
      const list = document.querySelector('.platform-list').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.platform-card')].map((element) => element.getBoundingClientRect());
      return {
        stacked: list.top >= intro.bottom - 1,
        sideBySide: list.left >= intro.right - 1,
        cardColumns: new Set(cards.map((card) => Math.round(card.left))).size,
        overflowX: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(layout.overflowX, `${width}x${height}`).toBeLessThanOrEqual(1);
    expect(layout.cardColumns, `${width}x${height}`).toBe(1);
    if (width <= 960) expect(layout.stacked, `${width}x${height}`).toBe(true);
    else expect(layout.sideBySide, `${width}x${height}`).toBe(true);
  }
});

test('Authentication gates follow the responsive Figma composition across platforms', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });

  for (const platform of ['ministry', 'tson']) {
    await page.goto(`/${platform}/?lang=ru&theme=light`);
    await expect(page.locator('.login__inner')).toBeVisible();
    await expect(page.locator('.login__heading h1')).toHaveText('Вход в сессию');
    await expect(page.locator('.login__subtitle')).toHaveCount(0);
    await expect(page.locator('.login__legend')).toHaveText('Сессия действует только на этом рабочем месте');

    const gate = await page.evaluate(() => {
      const form = document.querySelector('.login__form--credentials');
      const card = document.querySelector('.login__card');
      const input = document.querySelector('.login__card .field__input');
      const button = document.querySelector('.login__card .btn--l');
      const label = document.querySelector('label[for="l-pass"]');
      const brand = document.querySelector('.login__brand').getBoundingClientRect();
      const wordmark = document.querySelector('.login__brand b');
      const wordmarkStyle = getComputedStyle(wordmark);
      const footer = document.querySelector('.login__legend').getBoundingClientRect();
      const canvas = document.querySelector('.login').getBoundingClientRect();
      const innerStyle = getComputedStyle(document.querySelector('.login__inner'));
      const innerMatrix = new DOMMatrixReadOnly(innerStyle.transform);
      return {
        formWidth: form.getBoundingClientRect().width,
        cardBackground: getComputedStyle(card).backgroundColor,
        cardBorder: getComputedStyle(card).borderTopWidth,
        cardRadius: Number.parseFloat(getComputedStyle(card).borderRadius),
        inputHeight: input.getBoundingClientRect().height,
        buttonHeight: button.getBoundingClientRect().height,
        inputRadius: Number.parseFloat(getComputedStyle(input).borderRadius),
        inputFontSize: Number.parseFloat(getComputedStyle(input).fontSize),
        titleFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.login__heading h1')).fontSize),
        titleFontWeight: getComputedStyle(document.querySelector('.login__heading h1')).fontWeight,
        labelFontSize: Number.parseFloat(getComputedStyle(label).fontSize),
        labelTracking: Number.parseFloat(getComputedStyle(label).letterSpacing) || 0,
        inputPaddingStart: Number.parseFloat(getComputedStyle(input).paddingInlineStart),
        usernameLabelTransform: getComputedStyle(document.querySelector('label[for="l-user"]')).transform,
        passwordLabelTransform: getComputedStyle(label).transform,
        legendFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.login__legend')).fontSize),
        brandLeft: brand.left,
        brandTop: brand.top,
        wordmarkTracking: Number.parseFloat(wordmarkStyle.letterSpacing),
        wordmarkFontSize: Number.parseFloat(wordmarkStyle.fontSize),
        footerBottom: innerHeight - footer.bottom,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        canvasHeight: canvas.height,
        contentScale: Math.hypot(innerMatrix.a, innerMatrix.b),
      };
    });
    expect(gate.formWidth).toBeCloseTo(320, 1);
    expect(gate.cardBackground).toBe('rgba(0, 0, 0, 0)');
    expect(gate.cardBorder).toBe('0px');
    expect(gate.cardRadius).toBe(0);
    expect(gate.inputHeight).toBeCloseTo(56, 1);
    expect(gate.buttonHeight).toBeCloseTo(56, 1);
    expect(gate.inputRadius).toBeGreaterThanOrEqual(35);
    expect(gate.inputFontSize).toBe(20);
    expect(gate.titleFontSize).toBe(28);
    expect(gate.titleFontWeight).toBe('500');
    expect(gate.labelFontSize).toBe(18);
    expect(gate.labelTracking).toBe(0);
    expect(gate.inputPaddingStart).toBe(36);
    expect(gate.usernameLabelTransform).not.toBe(gate.passwordLabelTransform);
    expect(gate.legendFontSize).toBe(14);
    expect(gate.brandLeft).toBeCloseTo(23.04, 1);
    expect(gate.brandTop).toBeCloseTo(19.2, 1);
    expect(gate.wordmarkTracking).toBeCloseTo(-0.02 * gate.wordmarkFontSize, 2);
    expect(gate.footerBottom).toBeCloseTo(32, 1);
    expect(gate.overflow).toBeLessThanOrEqual(1);
    expect(gate.verticalOverflow).toBeLessThanOrEqual(1);
    expect(gate.canvasHeight).toBe(1024);
    expect(gate.contentScale).toBeCloseTo(.8, 3);

    if (platform === 'tson') {
      const chrome = await page.evaluate(() => {
        const prefs = document.querySelector('#topbar > .btn');
        const switcher = document.querySelector('[data-shared-platform-switcher]');
        const probe = document.createElement('span');
        probe.style.color = 'var(--ink-2)';
        document.body.append(probe);
        const ink2 = getComputedStyle(probe).color;
        probe.remove();
        const prefsRect = prefs.getBoundingClientRect();
        const switcherRect = switcher.getBoundingClientRect();
        return {
          prefsColor: getComputedStyle(prefs).color,
          ink2,
          topbarWidth: document.querySelector('#topbar').getBoundingClientRect().width,
          prefsWidth: prefsRect.width,
          prefsTop: prefsRect.top,
          switcherTop: switcherRect.top,
          viewportHeight: innerHeight,
        };
      });
      expect(chrome.prefsColor).toBe(chrome.ink2);
      expect(chrome.topbarWidth).toBeCloseTo(chrome.prefsWidth, 1);
      expect(chrome.prefsTop).toBeCloseTo(gate.brandTop, 1);
      expect(chrome.switcherTop).toBeGreaterThan(chrome.viewportHeight / 2);
    }

    await page.locator('#l-pass').focus();
    await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => getComputedStyle(label).transform))
      .toBe(gate.usernameLabelTransform);
    await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => Number.parseFloat(getComputedStyle(label).fontSize)))
      .toBe(18);
    await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => {
      const style = getComputedStyle(label);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return Number.parseFloat(style.fontSize) * Math.hypot(matrix.a, matrix.b);
    })).toBeCloseTo(14, 1);
    await expect.poll(() => page.locator('label[for="l-pass"]').evaluate((label) => getComputedStyle(label).fontWeight))
      .toBe('500');

    await page.locator('#l-pass').fill('demo');
    await page.locator('[data-act="login-next"]').click();
    await expect(page.locator('.otp__cell')).toHaveCount(6);
    const mfa = await page.evaluate(() => ({
      width: document.querySelector('.login__form--mfa').getBoundingClientRect().width,
      otpWidth: document.querySelector('.otp').getBoundingClientRect().width,
      cellHeight: document.querySelector('.otp__cell').getBoundingClientRect().height,
      actionWidth: document.querySelector('.login__actions').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(mfa.width).toBeCloseTo(390.4, 1);
    expect(mfa.cellHeight).toBeCloseTo(76.8, 1);
    expect(mfa.actionWidth).toBeCloseTo(mfa.otpWidth, 1);
    expect(mfa.overflow).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const platform of ['ministry', 'tson']) {
    await page.goto(`/${platform}/?lang=tg&theme=light`);
    await expect(page.locator('.login__inner')).toBeVisible();
    await expectPageFits(page);
    await expect(page.locator('.login__form--credentials')).toHaveCSS('width', '400px');
    const mobileGate = await page.evaluate(() => ({
      formWidth: document.querySelector('.login__form--credentials').getBoundingClientRect().width,
      inputHeight: document.querySelector('.login__card .field__input').getBoundingClientRect().height,
      canvasHeight: document.querySelector('.login').getBoundingClientRect().height,
      verticalOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));
    expect(mobileGate.formWidth).toBeCloseTo(320, 1);
    expect(mobileGate.inputHeight).toBeCloseTo(48, 1);
    expect(mobileGate.canvasHeight).toBe(844);
    expect(mobileGate.verticalOverflow).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto('/tson/?lang=ru&theme=dark');
  await expect(page.locator('.login__inner')).toBeVisible();
  const dark = await page.evaluate(() => ({
    canvas: getComputedStyle(document.querySelector('.login')).backgroundColor,
    input: getComputedStyle(document.querySelector('.login__card .field__input')).backgroundColor,
  }));
  expect(dark.canvas).toBe(dark.input);

  await page.goto('/citizen/?lang=ru&theme=light');
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginOverlay .modal')).toBeVisible();
  await expect(page.locator('#loginOverlay .s-locked__brand')).toBeVisible();
  await expect(page.locator('#loginOverlay .login-field--floating')).toBeVisible();
  await expect(page.locator('#loginOverlay .modal')).toHaveCSS('border-radius', '32px');
  const citizenLogin = await page.evaluate(() => {
    const brand = document.querySelector('#loginOverlay .s-locked__brand');
    return {
      brandLeft: brand.getBoundingClientRect().left,
      headerBlurred: document.querySelector('header').classList.contains('is-blurred'),
    };
  });
  expect(citizenLogin.brandLeft).toBeLessThan(80);
  expect(citizenLogin.headerBlurred).toBe(true);
  await expect.poll(() => page.locator('#loginPhone').evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(56, 1);
});

test('Citizen deep screens, profile panes, and dialogs fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/citizen/?lang=tg&theme=light');

  await page.locator('#loginBtn').click();
  await expectLayerFits(page, page.locator('#loginOverlay .modal'));
  await completeCitizenLogin(page);

  for (const destination of ['category', 'journey', 'emergency', 'notifs']) {
    if (destination === 'category') await page.locator('.cat').first().click();
    else await page.locator(`[data-go="${destination}"]`).first().click();
    await expect(page.locator(`#scr-${destination}`)).toBeVisible();
    await expectPageFits(page);
    await page.locator(`#scr-${destination} [data-back]`).click();
  }

  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
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
  await completeMinistryLogin(page);

  const queueGeometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const main = document.querySelector('.app__main').getBoundingClientRect();
    const queueRow = document.querySelector('.q-row').getBoundingClientRect();
    return { viewportWidth, mainWidth: main.width, mainRight: main.right, queueRowRight: queueRow.right };
  });
  expect(queueGeometry.mainWidth).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);
  expect(queueGeometry.mainRight).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);
  expect(queueGeometry.queueRowRight).toBeLessThanOrEqual(queueGeometry.viewportWidth + 1);

  /* «batch» is gone: bulk processing is a temporary mode revealed by the
     contextual batch bar when rows are selected, not a permanent destination
     (rule 45). */
  for (const view of ['queue', 'all', 'overdue', 'interop', 'reports', 'forms']) {
    if (view !== 'queue') {
      await page.locator('[data-act="nav-toggle"]').click();
      await page.locator(`.ekh-side__item[data-view="${view}"]`).click();
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
  await page.locator('[data-act="nav-toggle"]').click();
  await page.locator('.ekh-side__user[data-act="profile-open"]').click();
  await expectLayerFits(page, page.locator('#pop.ekh-profile-pop'));
  /* Escape closes the top layer only, so the drawer is still open underneath. */
  await page.keyboard.press('Escape');
  await page.locator('.ekh-side__item[data-view="queue"]').click();
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
  await completeMinistryLogin(page);
  await page.locator('.ekh-side__item[data-view="forms"]').click();
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
    phoneRatio: document.querySelector('.pv-phone').getBoundingClientRect().height / document.querySelector('.pv-phone').getBoundingClientRect().width,
    fakeStatusBars: document.querySelectorAll('.mfb-phone__status').length,
    phoneCaptionBelow: document.querySelector('.pv-caption').getBoundingClientRect().top > document.querySelector('.pv-phone').getBoundingClientRect().top,
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
  /* §6 device previews: the shared .pv-phone, no fake OS status content, and
     the caption below the device. */
  expect(ministry.fakeStatusBars).toBe(0);
  expect(ministry.phoneCaptionBelow).toBe(true);
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

test('Admin builder keeps both side panels visible while the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 520 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  /* one toolbar: identity, status, version and comments, then the actions */
  await expect(page.locator('.bld-top .bld-name')).toBeVisible();
  await expect(page.locator('.lc-builder')).toHaveCount(0);

  const initialTop = await page.locator('.bld-pipe').evaluate((element) => element.getBoundingClientRect().top);
  await page.locator('.bld-edit').evaluate((element) => element.scrollTo(0, element.scrollHeight));
  const layout = await page.evaluate((topBeforeScroll) => {
    const readPanel = (selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        top: rect.top,
        bottom: rect.bottom,
        position: style.position,
        overflowY: style.overflowY,
      };
    };
    return {
      scrollY,
      pageOverflow: document.documentElement.scrollHeight - innerHeight,
      editorScrollTop: document.querySelector('.bld-edit').scrollTop,
      editorScrollbarWidth: getComputedStyle(document.querySelector('.bld-edit')).scrollbarWidth,
      topBeforeScroll,
      pipeline: readPanel('.bld-pipe'),
      preview: readPanel('.bld-prev'),
    };
  }, initialTop);

  expect(layout.scrollY).toBe(0);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.editorScrollTop).toBeGreaterThan(0);
  expect(layout.editorScrollbarWidth).toBe('thin');
  for (const panel of [layout.pipeline, layout.preview]) {
    expect(panel.position).toBe('static');
    expect(panel.overflowY).toBe('auto');
    expect(panel.top).toBeCloseTo(layout.topBeforeScroll, 0);
    expect(panel.bottom).toBeLessThanOrEqual(521);
  }
});

test('Admin builder reserves pipeline label emphasis for the selected step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  const weights = await page.evaluate(() => {
    const selected = document.querySelector('.bld-pipe .stg[aria-selected="true"] .tt b');
    const unselected = document.querySelector('.bld-pipe .stg:not([aria-selected="true"]) .tt b');
    return {
      selected: getComputedStyle(selected).fontWeight,
      unselected: getComputedStyle(unselected).fontWeight,
    };
  });

  expect(weights.unselected).toBe('400');
  expect(weights.selected).toBe('500');
});

test('Admin selected pipeline step uses a solid blue icon tile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  const tiles = await page.evaluate(() => {
    const selected = document.querySelector('.bld-pipe .stg[aria-selected="true"] .stg-ic');
    const unselected = document.querySelector('.bld-pipe .stg:not([aria-selected="true"]) .stg-ic');
    return {
      selectedBg: getComputedStyle(selected).backgroundColor,
      selectedColor: getComputedStyle(selected).color,
      unselectedBg: getComputedStyle(unselected).backgroundColor,
    };
  });
  expect(tiles.selectedBg).toBe('rgb(0, 114, 214)');
  expect(tiles.selectedColor).toBe('rgb(255, 255, 255)');
  expect(tiles.unselectedBg).not.toBe('rgb(0, 114, 214)');
});

test('Admin builder centers the phone above its quiet preview caption', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  const caption = await page.evaluate(() => {
    const bar = document.querySelector('.pv-bar');
    const stage = document.querySelector('.pv-stage');
    const badge = document.querySelector('.pv-badge');
    const badgeStyle = getComputedStyle(badge);
    const stageRect = stage.getBoundingClientRect();
    const phone = document.querySelector('.pv-phone');
    const phoneRect = phone.getBoundingClientRect();
    return {
      barOrder: getComputedStyle(bar).order,
      stageOrder: getComputedStyle(stage).order,
      stageFlex: getComputedStyle(stage).flexGrow,
      stageAlignItems: getComputedStyle(stage).alignItems,
      phoneBezelWidth: Number.parseFloat(getComputedStyle(phone).paddingTop),
      phoneOffsetTop: phoneRect.top - stageRect.top,
      phoneOffsetBottom: stageRect.bottom - phoneRect.bottom,
      badgeBackground: badgeStyle.backgroundColor,
      dotCount: badge.querySelectorAll('.dot').length,
    };
  });

  expect(caption.barOrder).toBe('2');
  expect(caption.stageOrder).toBe('1');
  expect(caption.stageFlex).toBe('1');
  expect(caption.stageAlignItems).toBe('center');
  expect(caption.phoneBezelWidth).toBe(9);
  expect(Math.abs(caption.phoneOffsetTop - caption.phoneOffsetBottom)).toBeLessThanOrEqual(1);
  expect(caption.badgeBackground).toBe('rgba(0, 0, 0, 0)');
  expect(caption.dotCount).toBe(0);
});

test('Mobile preview actions keep touch height and give long labels a full row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');

  const layout = await page.evaluate(() => {
    const actions = document.querySelector('.edit-pane:not([hidden]) .mobile-preview-actions');
    const buttons = [...actions.querySelectorAll(':scope > .btn')];
    const first = buttons[0].getBoundingClientRect();
    const second = buttons[1].getBoundingClientRect();
    buttons[1].textContent = 'Фиристодани ариза барои гирифтани маълумотнома';
    const long = buttons[1].getBoundingClientRect();
    const group = actions.getBoundingClientRect();
    const groupStyle = getComputedStyle(actions);
    return {
      heights: buttons.map((button) => button.getBoundingClientRect().height),
      initialSharedRow: Math.abs(first.top - second.top) <= 1,
      longOnOwnRow: long.top > first.top,
      longWidth: long.width,
      availableWidth: group.width - Number.parseFloat(groupStyle.paddingLeft) - Number.parseFloat(groupStyle.paddingRight),
      longLineHeight: buttons[1].scrollHeight,
      longClientHeight: buttons[1].clientHeight,
    };
  });

  expect(layout.heights.every((height) => height >= 48)).toBe(true);
  expect(layout.initialSharedRow).toBe(true);
  expect(layout.longOnOwnRow).toBe(true);
  expect(layout.longWidth).toBeCloseTo(layout.availableWidth, 0);
  expect(layout.longLineHeight).toBe(layout.longClientHeight);
});

test('Admin review keeps its tall context sidebar within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/admin/review.html?lang=ru&theme=light');
  await page.getByRole('combobox', { name: 'Роль в процессе' }).selectOption('reviewer');
  await page.locator('.lc-queue-row').first().click();

  const sidebar = page.locator('.lc-review-side');
  await expect(sidebar).toBeVisible();
  const reviewTop = await page.locator('.lc-review-grid').evaluate((element) =>
    element.getBoundingClientRect().top + scrollY,
  );
  await page.evaluate((top) => window.scrollTo(0, top), reviewTop);
  await expect.poll(() => page.evaluate((top) => Math.abs(scrollY - top), reviewTop)).toBeLessThanOrEqual(1);

  const layout = await sidebar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      top: rect.top,
      bottom: rect.bottom,
      position: style.position,
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });

  expect(layout.position).toBe('sticky');
  expect(layout.overflowY).toBe('auto');
  expect(layout.top).toBeCloseTo(76, 0);
  expect(layout.bottom).toBeLessThanOrEqual(685);
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
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
  for (const panel of ['confirm', 'fields', 'delivery', 'review', 'checks', 'route', 'issue', 'meta', 'rules', 'templates', 'sandbox', 'versions', 'access']) {
    const tab = page.locator(`.stg[data-tab="${panel}"]`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(page.locator(`.bld-edit [data-panel="${panel}"]`)).toBeVisible();
    await expectPageFits(page);
  }

  /* fields come from the bound form now: the picker replaced the field palette */
  await page.locator('.stg[data-tab="fields"]').click();
  await page.locator('[data-open="serviceFormPicker"]').click();
  await expectLayerFits(page, page.locator('#serviceFormPicker .modal'));
  await page.locator('#serviceFormPicker [data-close]').first().click();
});

test('Builder issue preview shows the issued certificate in the wallet, not a delivery row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  await page.locator('.stg[data-tab="issue"]').click();

  const preview = page.locator('.pv-app [data-panel="issue"]');
  await expect(preview).toBeVisible();
  await expect(preview.locator('.opt')).toHaveCount(0);
  await expect(preview.locator('.pv-cert')).toBeVisible();
  await expect(preview.locator('.pv-cert h4')).toHaveText('Справка о составе семьи');
  await expect(preview.locator('.pv-cert__who')).toContainText('Рахимова Фируза Далеровна');
  await expect(preview.locator('.pv-cert__family')).toContainText('Зарина');
  await expect(preview.locator('.pv-cert__qr[data-qr]')).toBeVisible();
  const qr = await preview.locator('.pv-cert__qr').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(qr.width).toBeGreaterThanOrEqual(72);
  expect(qr.height).toBeGreaterThanOrEqual(72);
});

test('TSON session catalog, citizen data, form, documents, and result remain readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/tson/?dev=1&lang=ru&theme=light');
  await page.locator('input[name="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();
  const idleTools = page.locator('.s-idle__tools');
  await expect(idleTools).toBeVisible();
  await expect(idleTools).toHaveClass(/row/);
  const toolsLayout = await idleTools.evaluate((el) => {
    const buttons = [...el.querySelectorAll('.btn')];
    const a = buttons[0].getBoundingClientRect();
    const b = buttons[1].getBoundingClientRect();
    return {
      flexDirection: getComputedStyle(el).flexDirection,
      sameRow: Math.abs(a.top - b.top) < 2,
      sideBySide: b.left >= a.right,
      labelsFit: buttons.every((button) => button.scrollWidth <= button.clientWidth),
    };
  });
  expect(toolsLayout.flexDirection).toBe('row');
  expect(toolsLayout.sameRow).toBe(true);
  expect(toolsLayout.sideBySide).toBe(true);
  expect(toolsLayout.labelsFit).toBe(true);

  const recentList = page.locator('.s-idle__recent-list');
  await expect(recentList.locator('.status-icon')).toHaveCount(10);
  await expect(recentList.locator('.s-idle__recent-row:not(.s-idle__recent-row--empty)')).toHaveCount(10);
  await expect(recentList.locator('.s-idle__recent-row--empty')).toHaveCount(5);
  const recentLayout = await recentList.evaluate((el) => {
    const rows = [...el.querySelectorAll('.s-idle__recent-row')].map((row) => row.getBoundingClientRect());
    const list = el.getBoundingClientRect();
    const kpis = document.querySelector('.s-idle__kpis')?.getBoundingClientRect();
    const panelEl = el.closest('.s-idle__recent');
    const panel = panelEl?.getBoundingClientRect();
    const panelCs = panelEl ? getComputedStyle(panelEl) : null;
    const rowCs = getComputedStyle(el.querySelector('.s-idle__recent-row'));
    const mark = el.querySelector('.status-icon');
    const padTop = panelCs ? parseFloat(panelCs.paddingTop) : 0;
    const padBottom = panelCs ? parseFloat(panelCs.paddingBottom) : 0;
    const rowPad = parseFloat(rowCs.paddingBottom);
    return {
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      twoColumns: Math.abs(rows[0].top - rows[5].top) < 2,
      stacked: rows[1].top > rows[0].bottom - 1,
      secondColumnCloser: rows[5].left < list.left + list.width / 2,
      thirdEmpty: rows[10].left >= rows[5].right - 1 && rows[10].width > 0,
      continuousRule: Math.abs(rows[0].right - rows[5].left) < 2
        && Math.abs(rows[5].right - rows[10].left) < 2
        && Math.abs(rows[0].left - list.left) < 2
        && Math.abs(rows[10].right - list.right) < 2
        && Math.abs(rows[0].bottom - rows[5].bottom) < 2
        && Math.abs(rows[5].bottom - rows[10].bottom) < 2,
      sameHeightAsKpis: kpis && panel ? Math.abs(kpis.height - panel.height) < 2 : false,
      markFill: mark ? getComputedStyle(mark).backgroundColor : null,
      padBottomLtTop: padBottom < padTop,
      padBalancesTop: Math.abs(rowPad + padBottom - padTop) < 1,
    };
  });
  expect(recentLayout.columns).toBe(3);
  expect(recentLayout.twoColumns).toBe(true);
  expect(recentLayout.stacked).toBe(true);
  expect(recentLayout.secondColumnCloser).toBe(true);
  expect(recentLayout.thirdEmpty).toBe(true);
  expect(recentLayout.continuousRule).toBe(true);
  expect(recentLayout.sameHeightAsKpis).toBe(true);
  expect(recentLayout.markFill).toMatch(/^(transparent|rgba?\(0,\s*0,\s*0,\s*0\))$/);
  expect(recentLayout.padBottomLtTop).toBe(true);
  expect(recentLayout.padBalancesTop).toBe(true);

  const kpiCentered = await page.locator('.s-idle__kpis .kpi').first().evaluate((el) => {
    const value = el.querySelector('.kpi__value')?.getBoundingClientRect();
    const label = el.querySelector('.kpi__label')?.getBoundingClientRect();
    const card = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!value || !label) return { ok: false };
    const innerTop = card.top + parseFloat(cs.paddingTop);
    const innerBottom = card.bottom - parseFloat(cs.paddingBottom);
    const contentMid = (value.top + label.bottom) / 2;
    const innerMid = (innerTop + innerBottom) / 2;
    return {
      justify: cs.justifyContent,
      valueFirst: value.top < label.top,
      centered: Math.abs(contentMid - innerMid) < 2,
    };
  });
  expect(kpiCentered.justify).toBe('center');
  expect(kpiCentered.valueFirst).toBe(true);
  expect(kpiCentered.centered).toBe(true);

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
  await expectLayerFits(page, page.locator('.ekh-dialog'));
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
  const confirmation = page.locator('.ekh-dialog-backdrop .ekh-dialog');
  await expectLayerFits(page, confirmation);
  await confirmation.locator('.check__input').check();
  await confirmation.locator('.modal__foot .btn--primary').click();
  await expect(page.locator('.s-result')).toBeVisible();
  await expectPageFits(page);
});
