import { test, expect } from '@playwright/test';
import { completeCitizenLogin } from '../helpers/citizen-auth.js';
import { completeMinistryLogin } from '../helpers/ministry-auth.js';

async function expectSameActionHeight(page, selector, count=2) {
  const group = page.locator(selector);
  const buttons = group.locator('.btn:visible');
  await expect(buttons).toHaveCount(count);
  const before = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.max(...before)-Math.min(...before)).toBeLessThanOrEqual(1);
  await buttons.last().hover();
  const hovered = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.max(...hovered)-Math.min(...hovered)).toBeLessThanOrEqual(1);
}

test('Citizen category, profile, wallet, QR and logout flow', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light');
  await page.locator('.cat').first().click();
  await expect(page.locator('#scr-category')).toBeVisible();
  await page.locator('#scr-category [data-back]').click();

  await page.locator('#loginBtn').click();
  await completeCitizenLogin(page);
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'in');

  await page.locator('[data-go="journey"]:visible').first().click();
  await expect(page.locator('#scr-journey')).toBeVisible();
  await page.locator('#childName').fill('Сомон');
  await page.locator('#toStep2').click();
  await expectSameActionHeight(page, '#jstep-2 .j-acts');
  await page.locator('#scr-journey [data-back]').click();

  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await expect(page.locator('#scr-profile')).toBeVisible();
  await expect(page.locator('.prof-head .eyebrow')).toHaveCount(0);
  await expect(page.locator('.prof-verified')).toHaveAttribute('aria-label', 'Ҳисоби тасдиқшуда');
  await expect(page.locator('.prof-verified__shield')).toHaveCount(1);
  await expect(page.locator('.prof-verified__check')).toHaveCount(1);
  await page.locator('.prof-verified').hover();
  await expect(page.locator('.prof-verified__tooltip')).toBeVisible();
  await page.locator('[data-pane="docs"]').click();
  await page.locator('[data-qr]').first().click();
  await expect(page.locator('#qrOverlay')).toHaveClass(/is-open/);
  await page.locator('#qrClose').click();
  await page.locator('#logoutBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-auth', 'out');
});

test('Citizen guest appointment, cabinet categories, child validation and biometric demo work', async ({ page }) => {
  await page.goto('/citizen/?lang=ru&theme=light');
  await page.locator('.dd.acct .dd-btn').click();
  await page.locator('[data-acct="guest"]').click();
  await expect(page.locator('#guestStrip')).toBeVisible();
  await expect(page.locator('.cat')).toHaveCount(4);
  await page.locator('#guestAvatar').click();
  await expect(page.locator('#loginOverlay #loginSub')).toContainText('личный кабинет');
  await page.locator('#loginCancel').click();
  await page.locator('.cat').first().click();
  await page.locator('[data-go="guestService"]').click();
  await page.locator('#guestCenter').selectOption('sino');
  await page.locator('#guestDate').fill('2026-08-12');
  await page.locator('#guestEmail').fill('guest@example.tj');
  await page.locator('#guestConsent').check();
  await page.locator('#guestSubmit').click();
  await expect(page.locator('#guestSuccessId')).toHaveText('GST-2026-0042');
  await expect(page.locator('#guestSuccessTitle')).toContainText('Демо-заявка');

  await page.locator('#guestSuccessLogin').click();
  await completeCitizenLogin(page);
  await page.locator('#profileTrigger').click();
  await page.locator('#citizenProfilePop [data-go="profile"]').first().click();
  await page.locator('[data-pane="apps"]').click();
  // the pane opens straight on the list: no category hub in between
  await expect(page.locator('.application-category')).toHaveCount(0);
  await expect(page.locator('.application-row')).toHaveCount(16);
  await expect(page.locator('#applicationsRoot .app-kpi')).toHaveCount(4);
  await expect(page.locator('#applicationsRoot .app-kpi strong')).toHaveText(['16', '5', '2', '5']);
  await expect(page.locator('.application-row .tile')).toHaveCount(0);
  await page.locator('[data-app-status="action"]').click();
  await expect(page).toHaveURL(/status=action/);
  await expect(page.locator('.application-row')).toHaveCount(2);
  await page.locator('.application-row').first().click();
  await expect(page.locator('.application-detail')).toBeVisible();
  await expect(page).toHaveURL(/#\/profile\/apps\/TJ-/);
  await page.goBack();
  await expect(page.locator('.application-row')).toHaveCount(2);
  await expect(page.locator('.app-kpi[data-app-status="action"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-app-status="all"]').click();

  await page.locator('[data-pane="family"]').click();
  await page.locator('[data-child-action="add"]').first().click();
  await page.locator('#familyName').fill('Взрослый пользователь');
  await page.locator('#familyDob').fill('1990-01-01');
  await page.locator('#familyDocument').fill('DEMO-12345');
  await page.locator('#familyRelation').selectOption('parent');
  await page.locator('#childSave').click();
  await expect(page.locator('#childError')).toBeVisible();
  await page.locator('#familyDob').fill('2015-01-01');
  await page.locator('#childSave').click();
  await expect(page.locator('#childrenRoot .pr')).toHaveCount(2);

  await page.locator('[data-pane="sec"]').click();
  await expect(page.locator('#twoFactorToggle')).toBeChecked();
  await expect(page.locator('#twoFactorStatus')).toHaveText('Включено');
  await page.locator('#twoFactorToggle').click();
  await page.locator('#twoFactorConfirm').click();
  await expect(page.locator('#twoFactorToggle')).not.toBeChecked();
  await expect(page.locator('#twoFactorStatus')).toHaveText('Выключено');
  await page.locator('#twoFactorToggle').check();
  await page.locator('#biometricSetup').click();
  const modalBox = await page.locator('#biometricOverlay .biometric-modal').boundingBox();
  const scanBox = await page.locator('#biometricOverlay .facescan').boundingBox();
  expect(modalBox).not.toBeNull();
  expect(scanBox).not.toBeNull();
  expect(Math.abs((modalBox.x + modalBox.width / 2) - (scanBox.x + scanBox.width / 2))).toBeLessThanOrEqual(1);
  await expect(page.locator('#biometricStart')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#biometricOverlay')).not.toHaveClass(/open|is-open/);
  await expect(page.locator('#biometricSetup')).toBeFocused();
  await page.locator('#biometricSetup').click();
  await page.locator('#biometricFail').click();
  await expect(page.locator('#biometricScan')).toHaveClass(/facescan--error/);
  await page.locator('#biometricStart').click();
  await expect(page.locator('#biometricScan')).toHaveClass(/facescan--success/, { timeout: 3000 });
  await expect(page.locator('#biometricDemoBadge')).toContainText(/камера/i);
});

test('Authentication never pre-fills a password or verification code', async ({ page }) => {
  await page.goto('/citizen/?lang=tg&theme=light');
  await page.locator('#loginBtn').click();
  await expect(page.locator('#loginPhone')).toHaveValue('');
  await page.locator('#loginPhone').fill('+992 90 000 00 00');
  await page.locator('#loginGo').click();
  const citizenOtp = page.locator('#loginOverlay .otp__cell');
  await expect(citizenOtp).toHaveCount(6);
  for (const cell of await citizenOtp.all()) await expect(cell).toHaveValue('');

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
  await page.locator('[data-act="login-next"]').click();
  for (const cell of await page.locator('.otp__cell').all()) await expect(cell).toHaveValue('');
});

test('TSON login settings menu toggles closed and has no globe on the language row', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light');
  const prefs = page.getByRole('button', { name: 'Настройки' });
  await prefs.click();
  await expect(prefs).toHaveAttribute('aria-expanded', 'true');
  const menu = page.locator('#layers .popover.menu:not(.menu--flyout):not([inert])');
  await expect(menu).toBeVisible();
  const langRow = menu.locator('.menu__item.menu__row');
  await expect(langRow).toContainText('Язык');
  await expect(langRow.locator('.menu__value')).toHaveText('Русский');
  await expect(langRow.locator('use[href$="#i-globe"]')).toHaveCount(0);
  await expect(langRow.locator('use[href$="#i-chev-r"]')).toHaveCount(1);

  await prefs.click();
  await expect(prefs).toHaveAttribute('aria-expanded', 'false');

  await prefs.click();
  await page.locator('.login__heading h1').click();
  await expect(prefs).toHaveAttribute('aria-expanded', 'false');

  await prefs.click();
  await page.keyboard.press('Escape');
  await expect(prefs).toHaveAttribute('aria-expanded', 'false');

  await prefs.click();
  await langRow.click();
  await expect(langRow).toHaveAttribute('aria-expanded', 'true');
  await langRow.click();
  await expect(langRow).toHaveAttribute('aria-expanded', 'false');
});

test('Ministry MFA, queue, detail tabs and decision dialogs flow', async ({ page }) => {
  await page.goto('/ministry/?lang=ru&theme=light');
  const legendGeometry = await page.locator('.login__legend').evaluate((legend) => {
    const text = legend.querySelector('span').getBoundingClientRect();
    return {
      display: getComputedStyle(legend).display,
      textAlign: getComputedStyle(legend).textAlign,
      iconCount: legend.querySelectorAll('.icon').length,
      textWidth: text.width,
    };
  });
  expect(legendGeometry.display).toBe('flex');
  expect(legendGeometry.textAlign).toBe('center');
  expect(legendGeometry.iconCount).toBe(0);
  expect(legendGeometry.textWidth).toBeGreaterThan(0);
  await expect(page.locator('#l-pass')).toHaveValue('');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  await expectSameActionHeight(page, '.login__actions');
  await expect(page.locator('#l-otp')).toBeVisible();
  await expect(page.locator('#login-error')).toBeHidden();
  await expect(page.locator('.otp__cell')).toHaveCount(6);
  const ministryOtp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await ministryOtp.nth(index).fill(String(index + 1));
  await expect(page.locator('#app')).toBeVisible();
  const profileRow = await page.locator('.ekh-side__user').evaluate((row) => {
    const avatar = row.querySelector('.ekh-side__avatar').getBoundingClientRect();
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
      name: size('.ekh-side__identity b'),
      division: size('.ekh-side__identity span'),
      title: size('.view__titles .h2'),
      nameSpacing: spacing('.ekh-side__identity b'),
      divisionSpacing: spacing('.ekh-side__identity span'),
      titleSpacing: spacing('.view__titles .h2'),
    };
  });
  expect(ministryTypeScale.division).toBeLessThan(ministryTypeScale.name);
  expect(ministryTypeScale.name - ministryTypeScale.division).toBe(1);
  expect(ministryTypeScale.title).toBe(28);
  expect(ministryTypeScale.nameSpacing).toBe(0);
  expect(ministryTypeScale.divisionSpacing).toBe(0);
  expect(ministryTypeScale.titleSpacing).toBe(0);
  const alertValueColor = await page.locator('.stat--alert .stat__v').evaluate((value) => ({
    value: getComputedStyle(value).color,
    defaultText: getComputedStyle(document.body).color,
  }));
  expect(alertValueColor.value).toBe(alertValueColor.defaultText);
  await expect(page.locator('.q-head')).toHaveCSS('border-bottom-width', '0px');
  /* Guest is a fact about the applicant, and the queue row already says so in
     the applicant cell — the badge belongs to the card header, where the status
     of the request is the primary content (§3, rule 6). */
  const guestRow = page.locator('.q-row', { hasText: 'GST-2026-0042' });
  await expect(guestRow).toBeVisible();
  await guestRow.click();
  await expect(page.locator('.card-head__meta .audience-badge--guest')).toBeVisible();
  await page.locator('.ekh-side__item[data-view="queue"]').click();

  await page.locator('.ekh-side__item[data-view="reports"]').click();
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
  await page.locator('.ekh-side__item[data-view="queue"]').click();

  /* §3: the right side is the bell only — the prototype platform switcher is
     dev chrome and is hidden in presentation mode. */
  await expect(page.locator('.topbar__actions > button')).toHaveCount(1);
  await expect(page.locator('.topbar__actions [data-act="notif-open"]')).toBeVisible();
  const profileTrigger = page.locator('.ekh-side__user[data-act="profile-open"]');
  await profileTrigger.click();
  await expect(profileTrigger).toHaveAttribute('aria-expanded', 'true');
  const profilePop = page.locator('#pop.ekh-profile-pop');
  await expect(profilePop).toBeVisible();
  const langRow = profilePop.locator('.dd.lang .dd-btn');
  await expect(langRow).toContainText('Язык');
  await expect(langRow.locator('#langCur')).toHaveText('Русский');
  /* §3: no leading globe beside the word "Язык" — the compact glyph exists
     only for the collapsed rail, where the label itself is hidden. */
  await expect(langRow.locator('.ekh-profile-pop__compact-icon')).toBeHidden();
  await expect(langRow.locator('.ekh-profile-pop__chev')).toBeVisible();
  await expect(profilePop.locator('[data-theme-choice="system"]')).toHaveAttribute('aria-pressed', /true|false/);
  await expect(profilePop.locator('[data-theme-choice]')).toHaveCount(3);
  await page.locator('[data-act="lock"]').click();
  /* Rule 42: the same lock component as ЦОН — modal on the blurred shell, not
     a second login canvas. */
  const ministryLock = page.locator('#lock-root .s-locked');
  await expect(ministryLock.locator('h1')).toHaveText('Рабочее место заблокировано');
  await expect(ministryLock.locator('.s-locked__brand')).toBeVisible();
  await expect(page.locator('#lock-pass')).toHaveValue('');
  const ministryLockLayout = await ministryLock.evaluate((element) => {
    const card = element.querySelector('.s-locked__card');
    const title = element.querySelector('h1');
    const cardStyle = getComputedStyle(card);
    return {
      overlay: getComputedStyle(element).backgroundColor,
      cardBackground: cardStyle.backgroundColor,
      cardRadius: cardStyle.borderRadius,
      padTop: cardStyle.paddingTop,
      padLeft: cardStyle.paddingLeft,
      titleSize: getComputedStyle(title).fontSize,
      titleWeight: getComputedStyle(title).fontWeight,
      inputHeight: element.querySelector('.field__input').getBoundingClientRect().height,
      buttonHeight: element.querySelector('.btn--primary').getBoundingClientRect().height,
      shellBlurred: document.getElementById('app').classList.contains('is-blurred'),
      dialog: card.getAttribute('role') + '/' + card.getAttribute('aria-modal'),
    };
  });
  expect(ministryLockLayout.overlay).not.toBe('rgba(0, 0, 0, 0)');
  expect(ministryLockLayout.cardBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(ministryLockLayout.cardRadius).toBe('32px');
  expect(ministryLockLayout.padTop).toBe('40px');
  expect(ministryLockLayout.padLeft).toBe('32px');
  expect(ministryLockLayout.titleSize).toBe('24px');
  expect(ministryLockLayout.titleWeight).toBe('500');
  expect(ministryLockLayout.inputHeight).toBeCloseTo(56, 1);
  expect(ministryLockLayout.buttonHeight).toBeCloseTo(56, 1);
  expect(ministryLockLayout.shellBlurred).toBe(true);
  expect(ministryLockLayout.dialog).toBe('dialog/true');
  /* Escape must not lift the lock, and an empty password must not either. */
  await page.keyboard.press('Escape');
  await expect(ministryLock).toBeVisible();
  await page.locator('[data-act="unlock"]').click();
  await expect(page.locator('#lock-error')).toBeVisible();
  await expect(ministryLock).toBeVisible();
  await page.locator('#lock-pass').fill('demo');
  await page.locator('[data-act="unlock"]').click();
  await expect(page.locator('#lock-root')).toHaveCount(0);

  await page.locator('.ekh-side__item[data-view="overdue"]').click();
  const overdueBanner = page.locator('.banner--error').first();
  await expect(overdueBanner).toBeVisible();
  const overdueColors = await overdueBanner.evaluate((element) => ({
    text: getComputedStyle(element).color,
    icon: getComputedStyle(element.querySelector('.icon')).color,
  }));
  expect(overdueColors.icon).toBe(overdueColors.text);
  await page.locator('.ekh-side__item[data-view="queue"]').click();

  await page.locator('#top-search').fill('ТҶ');
  await page.locator('#top-search').fill('');
  await page.locator('.q-row').first().click();
  await expect(page.locator('#tabpanel')).toBeVisible();
  const ministryTabs = await page.locator('.card .tabs').evaluate((tabs) => {
    const selected = tabs.querySelector('.tab[aria-selected="true"]');
    return {
      radius: getComputedStyle(tabs).borderRadius,
      background: getComputedStyle(tabs).backgroundColor,
      selectedBackground: getComputedStyle(selected).backgroundColor,
      selectedBorderBottom: getComputedStyle(selected).borderBottomWidth,
    };
  });
  expect(ministryTabs.radius).toBe('999px');
  expect(ministryTabs.selectedBackground).not.toBe(ministryTabs.background);
  expect(ministryTabs.selectedBorderBottom).toBe('0px');
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

test('Ministry MFA error stays hidden until the code step itself fails', async ({ page }) => {
  await page.goto('/ministry/?lang=tg&theme=light');
  await page.locator('#l-pass').fill('demo');
  await page.locator('#l-pass').press('Enter');
  await expect(page.locator('.login__form--mfa')).toBeVisible();
  await expect(page.locator('#login-error')).toBeHidden();
  await page.locator('[data-act="login-enter"]').click();
  await expect(page.locator('#login-error')).toBeVisible();
  await expect(page.locator('#login-error')).toHaveText('Ҳамаи 6 рақами рамзи тасдиқро ворид кунед.');
  await expect(page.locator('.login__form--mfa')).toBeVisible();
});

test('Ministry Tajik mode localizes service and application details', async ({ page }) => {
  await page.goto('/ministry/?lang=tg&theme=light');
  await completeMinistryLogin(page);

  await expect(page.locator('.ekh-side__identity span')).toHaveText('Раёсати бақайдгирии ТҒТ');
  const accreditation = page.locator('.q-row[data-id="a8"]');
  await expect(accreditation).toContainText('Аккредитатсияи филиали ташкилоти хориҷӣ');
  await accreditation.click();

  await expect(page.locator('.card-head h1')).toHaveText('Аккредитатсияи филиали ташкилоти хориҷӣ');
  await expect(page.locator('.card-head__meta')).toContainText('Аккредитатсия');
  await expect(page.locator('.card-head__meta')).toContainText('Қарори чор чашм');
  await expect(page.locator('.card__main .panel').first()).toContainText('Аризадиҳанда');
  const mainLabels = await page.locator('.card__main .def__key').allTextContents();
  expect(mainLabels).toEqual(expect.arrayContaining(['Ном', 'РМА', 'Рақами бақайдгирӣ', 'Роҳбар', 'Телефон', 'Суроға', 'Номи ташкилоти асосӣ']));
  const sideLabels = await page.locator('.card__side .def__key').allTextContents();
  /* Status appears once, in the card header where it is the primary content
     (§3, rule 6) — the side list no longer repeats it. */
  expect(sideLabels).toEqual(expect.arrayContaining(['Афзалият', 'Иҷрокунанда', 'Раёсат', 'Боҷ']));
  expect(sideLabels).not.toContain('Ҳолат');
  await expect(page.locator('.card-head__meta .status-pill')).toBeVisible();
  await expect(page.locator('.card__side')).toContainText('Баланд');
  await expect(page.locator('.card__side .panel__title', { hasText: 'Амалҳо' })).toBeVisible();
});

test('Ministry workers can create a form and hand it to the shared review queue', async ({ page }) => {
  await page.goto('/ministry/?lang=ru&theme=light');
  await completeMinistryLogin(page);

  await page.locator('.ekh-side__item[data-view="forms"]').click();
  await expect(page.locator('.forms-catalog')).toBeVisible();
  await expect(page.locator('.form-row')).toHaveCount(4);
  /* Rule 26: the version strip carries status by background, with the text in
     title + .sr-only — no separate status pill wrapping a status icon. */
  await expect(page.locator('.form-row .form-mini-version')).toHaveCount(4);
  await expect(page.locator('.form-row .form-status')).toHaveCount(0);
  /* Identity lives in the profile popover, not on a catalogue panel head. */
  await expect(page.locator('.form-role')).toHaveCount(0);
  await expect(page.locator('.forms-catalog__head p')).toHaveCount(0);

  await page.locator('[data-act="form-create"]').click();
  await expect(page.locator('.form-builder-grid')).toBeVisible();
  await expect(page.locator('.mfb-step')).toHaveCount(7);
  await expect(page.locator('.mfb-step[aria-selected="true"]')).toContainText('Новые поля');
  /* Rule 22: the rail carries titles only — no per-step subtitle, no unexplained
     dot, no "7 шагов" counter restating the list. */
  await expect(page.locator('.mfb-step__text span')).toHaveCount(0);
  await expect(page.locator('.mfb-step__dot')).toHaveCount(0);
  await expect(page.locator('.mfb-pipeline__head span')).toHaveCount(0);
  /* Rule 6: status shows once, in the title row. */
  await expect(page.locator('.mfb-meta .form-status')).toHaveCount(0);
  await expect(page.locator('.form-builder-head .form-status')).toHaveCount(1);
  await page.locator('[data-form-name="ru"]').fill('Онлайн-регистрация общественного объединения');
  await page.locator('[data-form-name="tg"]').fill('Бақайдгирии онлайнии иттиҳодияи ҷамъиятӣ');
  await page.locator('[data-form-audience="guest"]').check();
  await page.locator('[data-act="form-add-field"]').click();
  await expect(page.locator('.mfb-palette')).toBeVisible();
  await page.locator('[data-act="form-add-field-type"][data-id="select"]').click();
  await expect(page.locator('.form-field-row')).toHaveCount(2);
  await page.locator('.form-field-row').last().locator('[data-form-field-label]').fill('Цель обращения');
  const ministryPreview = page.locator('.mfb-preview');
  if (!(await ministryPreview.isVisible())) {
    await page.locator('.mfb-preview-toggle').click();
    await expect(ministryPreview).toHaveClass(/is-open/);
  }
  await expect(ministryPreview).toContainText('Цель обращения');
  if (await page.locator('.mfb-preview__close').isVisible()) {
    await page.locator('.mfb-preview__close').click();
  }
  await page.locator('.mfb-step[data-id="route"]').click();
  await expect(page.locator('.mfb-editor')).toContainText('Ответственное подразделение');
  await page.locator('.mfb-step[data-id="fields"]').click();
  await page.locator('[data-act="form-save"]').click();
  await expect(page.locator('.form-builder-head .form-status .status-icon')).toHaveAttribute('aria-label', 'На stage');
  await page.locator('[data-act="form-send"]').click();
  await expect(page.locator('.form-builder-head .form-status .status-icon')).toHaveAttribute('aria-label', 'На проверке');
  await expect(page.locator('.form-lock-note')).toBeVisible();
  await expect(page.locator('[data-act="form-send"]')).toHaveCount(0);

  await page.goto('/admin/review.html?lang=ru&theme=light');
  await page.locator('[data-lc-role]').selectOption('reviewer');
  /* The reviewer queue lists the catalogue record, so it shows that record's
     own name — what this asserts is the hand-off itself: the service Ministry
     just sent is waiting in the reviewer's in-review queue. */
  const reviewRow = page.locator('#lowCodeReview .lc-queue-row[data-lc-service="ngo-registration"]');
  await expect(reviewRow).toBeVisible();
  await expect(reviewRow.locator('.status-icon[aria-label="На рассмотрении"]')).toBeVisible();
});

test('TSON MFA reaches the shift dashboard and exposes operational start', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  await expect(page.locator('.otp')).toBeVisible();
  await expectSameActionHeight(page, '.login__actions');
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();
  await expect(page).toHaveURL(/#\/idle/);
  await expect(page.locator('.topbar__bind')).toHaveText('Окно 1 - ЦОН район Сино');
  await page.goto('/tson/?lang=tg&theme=light');
  await expect(page.locator('.topbar__bind')).toHaveText('Тирезаи 1 - ЦОН ноҳияи Сино');
  await page.goto('/tson/?lang=ru&theme=light');
  await expect(page.locator('.topbar__bind')).toHaveText('Окно 1 - ЦОН район Сино');

  const operatorMenu = page.getByRole('button', { name: /меню оператора/i });
  await operatorMenu.click();
  await expect(operatorMenu).toHaveAttribute('aria-expanded', 'true');
  const menu = page.locator('#layers [role="menu"]');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: /^Руководство/ }).locator('use').first())
    .toHaveAttribute('href', '/design-system/assets/icons.svg#i-manager');
  await expect(menu.getByRole('menuitem', { name: 'Завершить смену' }).locator('use'))
    .toHaveAttribute('href', '/design-system/assets/icons.svg#i-clock-check');
  const systemThemeChoice = menu.getByRole('button', { name: 'Как в системе' });
  await expect(systemThemeChoice.locator('use'))
    .toHaveAttribute('href', '/design-system/assets/icons.svg#i-theme-system');
  const menuGeometry = await menu.evaluate((element) => {
    const style = (node) => getComputedStyle(node);
    const systemIcon = element.querySelector('[aria-label="Как в системе"] .icon');
    const shortcut = element.querySelector('.menu__kbd');
    return {
      systemIcon: [style(systemIcon).width, style(systemIcon).height],
      shortcut: {
        padding: [style(shortcut).paddingTop, style(shortcut).paddingRight],
        radius: style(shortcut).borderRadius,
        fontSize: style(shortcut).fontSize,
      },
      dividerMargins: [...element.querySelectorAll(':scope > .rule')]
        .map((rule) => [style(rule).marginTop, style(rule).marginBottom]),
    };
  });
  expect(menuGeometry.systemIcon).toEqual(['16px', '16px']);
  expect(menuGeometry.shortcut).toEqual({ padding: ['4px', '8px'], radius: '14px', fontSize: '13px' });
  expect(menuGeometry.dividerMargins).toEqual(expect.arrayContaining([['8px', '8px']]));
  await operatorMenu.click();
  await expect(operatorMenu).toHaveAttribute('aria-expanded', 'false');

  await page.locator('.s-idle__start').click();
  const identify = page.locator('.s-identify');
  await expect(identify).toBeVisible();
  await expect(identify.locator('.s-gate__lead')).toHaveCount(0);
  await expect(identify.locator('.s-identify__steps')).toHaveCount(0);
  const identifyLayout = await identify.evaluate((element) => {
    const title = element.querySelector('h1');
    const card = element.querySelector('.s-identify__card');
    const body = element.querySelector('.s-identify__body');
    return {
      titleSize: getComputedStyle(title).fontSize,
      titleWeight: getComputedStyle(title).fontWeight,
      cardWidth: Math.round(card.getBoundingClientRect().width),
      bodyDisplay: getComputedStyle(body).display,
      nestedPanels: body.querySelectorAll('.panel').length,
    };
  });
  expect(identifyLayout.titleSize).toBe('28px');
  expect(identifyLayout.titleWeight).toBe('600');
  expect(identifyLayout.cardWidth).toBe(560);
  expect(identifyLayout.bodyDisplay).toBe('flex');
  expect(identifyLayout.nestedPanels).toBe(0);

  await page.getByRole('tab', { name: 'Face ID' }).click();
  const faceTile = identify.locator('.facescan--embed');
  await expect(faceTile).toBeVisible();
  await expect(faceTile.locator('.facescan__stroke')).toHaveCount(0);
  await expect(faceTile.locator('use')).toHaveAttribute('href', /#i-face$/);
  await expect(faceTile).toHaveClass(/facescan--scanning/, { timeout: 5000 });
  await expect(identify.locator('.facescan__caption')).toContainText('Наведите камеру');

  await page.keyboard.press('Control+l');
  const lock = page.locator('.s-locked');
  const card = page.locator('.s-locked__card');
  await expect(lock.locator('h1')).toHaveText('Рабочее место заблокировано');
  await expect(lock.locator('.s-locked__brand')).toBeVisible();
  await expect(lock.locator('.s-locked__legend')).toContainText('Сессия действует только на этом рабочем месте');
  const lockLayout = await lock.evaluate((element) => {
    const card = element.querySelector('.s-locked__card');
    const title = element.querySelector('h1');
    const hint = element.querySelector('.login__heading p');
    const input = element.querySelector('.field__input');
    const button = element.querySelector('.btn--primary');
    const icon = element.querySelector('.s-locked__icon');
    const brand = element.querySelector('.s-locked__brand');
    const cardStyle = getComputedStyle(card);
    const iconBox = icon.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const hintBox = hint.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    return {
      overlay: getComputedStyle(element).backgroundColor,
      cardBackground: cardStyle.backgroundColor,
      cardRadius: cardStyle.borderRadius,
      padTop: cardStyle.paddingTop,
      padRight: cardStyle.paddingRight,
      padBottom: cardStyle.paddingBottom,
      padLeft: cardStyle.paddingLeft,
      titleWeight: getComputedStyle(title).fontWeight,
      titleSize: getComputedStyle(title).fontSize,
      hintWeight: getComputedStyle(hint).fontWeight,
      titleLines: title.getClientRects().length,
      titleHeight: titleBox.height,
      inputHeight: inputBox.height,
      buttonHeight: buttonBox.height,
      iconSize: iconBox.width,
      brandLeft: brand.getBoundingClientRect().left,
      iconToTitle: titleBox.top - iconBox.bottom,
      titleToHint: hintBox.top - titleBox.bottom,
      hintToInput: inputBox.top - hintBox.bottom,
      inputToButton: buttonBox.top - inputBox.bottom,
      shellBlurred: document.getElementById('shell').classList.contains('is-blurred'),
    };
  });
  expect(lockLayout.overlay).not.toBe('rgba(0, 0, 0, 0)');
  expect(lockLayout.cardBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(lockLayout.cardRadius).toBe('32px');
  expect(lockLayout.padTop).toBe('40px');
  expect(lockLayout.padRight).toBe('32px');
  expect(lockLayout.padBottom).toBe('32px');
  expect(lockLayout.padLeft).toBe('32px');
  expect(lockLayout.titleWeight).toBe('500');
  expect(lockLayout.titleSize).toBe('24px');
  expect(lockLayout.hintWeight).toBe('400');
  expect(lockLayout.titleLines).toBe(1);
  expect(lockLayout.titleHeight).toBeCloseTo(23.0, 1);
  expect(lockLayout.inputHeight).toBeCloseTo(56, 1);
  expect(lockLayout.buttonHeight).toBeCloseTo(56, 1);
  expect(lockLayout.iconSize).toBeCloseTo(51.2, 1);
  expect(lockLayout.brandLeft).toBeLessThan(80);
  expect(lockLayout.iconToTitle).toBeCloseTo(25.6, 1);
  expect(lockLayout.titleToHint).toBeCloseTo(6.4, 1);
  expect(lockLayout.hintToInput).toBeCloseTo(25.6, 1);
  expect(lockLayout.inputToButton).toBeCloseTo(12.8, 1);
  expect(lockLayout.shellBlurred).toBe(true);
  await expect(card).toBeVisible();
});

test('TSON and Ministry operator session survives a normal reload', async ({ page }) => {
  await page.goto('/tson/?lang=ru&theme=light');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const tsonOtp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await tsonOtp.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle__start')).toBeVisible();
  await page.locator('.s-idle__start').click();
  await expect(page.locator('.s-identify')).toBeVisible();
  await page.reload();
  await expect(page.locator('.s-idle__start')).toBeVisible();
  await expect(page.locator('.login')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/idle/);

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'R', metaKey: true, ctrlKey: true, shiftKey: true, bubbles: true,
  })));
  await page.reload();
  await expect(page.locator('.login')).toBeVisible();
  await expect(page.locator('.s-idle__start')).toHaveCount(0);

  await page.goto('/ministry/?lang=ru&theme=light');
  await completeMinistryLogin(page);
  await expect(page.locator('#app')).toBeVisible();
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('.login')).toHaveCount(0);
});

test('TSON demo roles expose both dashboards, drill-down and guest reception', async ({ page }) => {
  // dev=1 because the dashboard's simulated states (high queue, empty, loading,
  // error) moved out of the page's own chrome into the demo panel, where the
  // rest of the simulation lives. Without developer mode they are unreachable,
  // which is the point: an operator can no longer "select an error".
  await page.goto('/tson/?lang=ru&theme=light&dev=1');
  await page.locator('input[type="password"]').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const cells = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await cells.nth(index).fill(String(index + 1));
  await expect(page.locator('.s-idle')).toHaveCSS('padding-top', '56px');
  const idleKpis = page.locator('.s-idle__kpi');
  await expect(idleKpis).toHaveCount(3);
  for (const [index, iconName] of ['calendar', 'clock', 'cat-cert'].entries()) {
    await expect(idleKpis.nth(index).locator('.s-idle__kpi-icon use'))
      .toHaveAttribute('href', `/design-system/assets/icons.svg#i-${iconName}`);
  }
  const idleKpiColors = await idleKpis.locator('.s-idle__kpi-icon').evaluateAll((icons) =>
    icons.map(icon => getComputedStyle(icon).color));
  expect(new Set(idleKpiColors).size).toBe(3);
  await expect(idleKpis.locator('.kpi__label').first()).toHaveCSS('font-weight', '400');
  await expect(page.locator('.s-idle__recent')).toHaveCSS('padding-bottom', '0px');
  await expect(page.locator('.s-idle__tools .btn--ghost').first()).toHaveCSS('font-size', '15px');
  await expect(page.locator('.s-idle__tools .btn--ghost').first()).toHaveCSS('font-weight', '400');
  const operatorMenuColor = await page.locator('.topbar__operator').evaluate((button) => ({
    actual: getComputedStyle(button).color,
    expected: getComputedStyle(document.body).color,
  }));
  expect(operatorMenuColor.actual).toBe(operatorMenuColor.expected);

  await page.getByRole('button', { name: /меню оператора/i }).click();
  await page.getByRole('menuitemradio', { name: /Руководитель отделения/ }).click();
  await expect(page).toHaveURL(/#\/dashboard-center/);
  await expect(page.locator('.dashboard-kpis .kpi')).toHaveCount(5);
  await expect(page.locator('.dashboard')).toHaveCSS('padding-top', '56px');
  await expect(page.getByText(/Демо-данные/)).toHaveCount(0);
  await expect(page.locator('.dashboard-period-filter .ekh-filter__field')).toHaveCSS('width', '140px');
  const centerOverviewGaps = await page.locator('.dashboard-overview').evaluate((overview) => {
    const kpis = overview.querySelector(':scope > .dashboard-kpis');
    const grid = overview.querySelector(':scope > .dashboard-grid');
    const panels = [...grid.children];
    return {
      vertical: grid.getBoundingClientRect().top - kpis.getBoundingClientRect().bottom,
      horizontal: panels[1].getBoundingClientRect().left - panels[0].getBoundingClientRect().right,
    };
  });
  expect(centerOverviewGaps.vertical).toBeCloseTo(centerOverviewGaps.horizontal, 0);
  expect(centerOverviewGaps.vertical).toBeCloseTo(16, 0);
  const centerKpiAlignment = await page.locator('.dashboard-kpis .kpi').evaluateAll((cards) => ({
    heights: cards.map(card => card.getBoundingClientRect().height),
    contextBottoms: cards.map(card => card.querySelector('.kpi__context').getBoundingClientRect().bottom),
  }));
  expect(new Set(centerKpiAlignment.heights).size).toBe(1);
  expect(Math.max(...centerKpiAlignment.contextBottoms) - Math.min(...centerKpiAlignment.contextBottoms))
    .toBeLessThan(0.5);
  await expect(page.locator('.dashboard-table-section > .h3'))
    .toHaveCSS('margin-bottom', '0px');
  const centerTableGeometry = await page.locator('.dashboard-table-section').evaluate((section) => {
    const table = section.querySelector('.window-table');
    const lastCells = [...table.querySelectorAll('tbody tr:last-child td')];
    const sectionRect = section.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const firstCellStyle = getComputedStyle(table.querySelector('tbody td'));
    const lastCellStyle = getComputedStyle(lastCells[0]);
    return {
      sectionLeft: sectionRect.left,
      sectionRight: sectionRect.right,
      tableLeft: tableRect.left,
      tableRight: tableRect.right,
      sectionPaddingTop: getComputedStyle(section).paddingTop,
      sectionPaddingBottom: getComputedStyle(section).paddingBottom,
      sectionOverflow: getComputedStyle(section).overflow,
      rowPaddingBottom: firstCellStyle.paddingBottom,
      lastBorderBottom: lastCellStyle.borderBottomWidth,
    };
  });
  expect(centerTableGeometry.tableLeft).toBeCloseTo(centerTableGeometry.sectionLeft + 1, 0);
  expect(centerTableGeometry.tableRight).toBeCloseTo(centerTableGeometry.sectionRight - 1, 0);
  expect(centerTableGeometry.sectionPaddingTop).toBe('20px');
  expect(centerTableGeometry.sectionPaddingBottom).toBe('0px');
  expect(centerTableGeometry.sectionOverflow).toBe('hidden');
  expect(centerTableGeometry.rowPaddingBottom).toBe('12px');
  expect(centerTableGeometry.lastBorderBottom).toBe('0px');
  const columnAlignment = await page.locator('.window-table').evaluate((table) => {
    const headers = [...table.querySelectorAll('thead th:not(.data-table__go)')];
    const cells = [...table.querySelectorAll('tbody tr:first-child td:not(.data-table__go)')];
    return headers.map((header, index) => {
      const titleRange = document.createRange();
      titleRange.selectNodeContents(header);
      const titleRect = titleRange.getBoundingClientRect();
      const valueRect = cells[index].querySelector('.table-title-align__value').getBoundingClientRect();
      return {
        headerAlign: getComputedStyle(header).textAlign,
        cellAlign: getComputedStyle(cells[index]).textAlign,
        centerDifference: Math.abs(
          (titleRect.left + titleRect.width / 2) - (valueRect.left + valueRect.width / 2),
        ),
      };
    });
  });
  for (const column of columnAlignment) {
    expect(column.headerAlign).toBe('left');
    expect(column.cellAlign).toBe('left');
    expect(column.centerDifference).toBeLessThan(0.5);
  }
  const queueGeometry = await page.locator('.dashboard-queue-section').evaluate((section) => {
    const grid = section.querySelector('.queue-grid');
    const card = section.querySelector('.queue-card');
    const metrics = card.querySelector('.queue-card__metrics');
    const sectionRect = section.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    return {
      background: getComputedStyle(card).backgroundColor,
      borderStyle: getComputedStyle(card).borderStyle,
      cardHeight: cardRect.height,
      cardsBottomInset: sectionRect.bottom - gridRect.bottom,
      sectionBottomPadding: parseFloat(getComputedStyle(section).paddingBottom),
      metricsBelowTitle: metrics.getBoundingClientRect().top > card.querySelector('.queue-card__head').getBoundingClientRect().bottom,
    };
  });
  expect(queueGeometry.background).toBe('rgba(0, 0, 0, 0)');
  expect(queueGeometry.borderStyle).toBe('dashed');
  expect(queueGeometry.cardHeight).toBeGreaterThanOrEqual(160);
  expect(queueGeometry.cardsBottomInset).toBeCloseTo(queueGeometry.sectionBottomPadding + 1, 0);
  expect(queueGeometry.metricsBelowTitle).toBe(true);
  const queueHeadAlignment = await page.locator('.dashboard-queue-head').evaluate((head) => {
    const title = head.querySelector('h2').getBoundingClientRect();
    const caption = head.querySelector('span').getBoundingClientRect();
    return {
      direction: getComputedStyle(head).flexDirection,
      leftDifference: Math.abs(title.left - caption.left),
      captionGap: caption.top - title.bottom,
    };
  });
  expect(queueHeadAlignment.direction).toBe('column');
  expect(queueHeadAlignment.leftDifference).toBeLessThan(0.5);
  expect(queueHeadAlignment.captionGap).toBeCloseTo(4, 0);
  await expect(page.locator('.window-table .status-icon').first())
    .toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.window-table .status-icon[aria-label="Перерыв"] use'))
    .toHaveAttribute('href', '/design-system/assets/icons.svg#i-pause');
  await expect(page.locator('.window-table .status-icon[aria-label="Закрыто"] use'))
    .toHaveAttribute('href', '/design-system/assets/icons.svg#i-x-strong');
  const scenario = async (name) => {
    await page.keyboard.press('`');
    await page.locator('.demo').getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('`');
  };
  await scenario('Высокая очередь');
  await expect(page.locator('.banner--error')).toBeVisible();
  await scenario('Пустой период');
  await expect(page.locator('.dashboard-state')).toContainText('За выбранный период визитов нет');
  await scenario('Загрузка');
  await expect(page.locator('.dashboard .skel').first()).toBeVisible();
  await scenario('Ошибка');
  await expect(page.locator('.dashboard-state')).toContainText('Не удалось обновить данные');
  await scenario('Обычный');
  await page.getByRole('button', { name: /меню оператора/i }).click();
  await page.getByRole('menuitemradio', { name: /^Руководство/ }).click();
  await expect(page).toHaveURL(/#\/dashboard-leadership/);
  await expect(page.locator('.dashboard')).toHaveCSS('padding-top', '56px');
  await expect(page.locator('.dashboard-head')).toHaveCSS('align-items', 'center');
  await expect(page.locator('.dashboard-period-filter .ekh-filter__field')).toHaveCSS('width', '140px');
  // Cross-document view transitions briefly overlay the old and new dashboard
  // geometry. Wait for the final 16px overview gap before measuring both axes.
  await page.waitForFunction(() => {
    const overview = document.querySelector('.dashboard-overview');
    const kpis = overview?.querySelector(':scope > .dashboard-kpis');
    const grid = overview?.querySelector(':scope > .dashboard-grid');
    if (!kpis || !grid) return false;
    return Math.abs(grid.getBoundingClientRect().top - kpis.getBoundingClientRect().bottom - 16) < 0.5;
  });
  const overviewGaps = await page.locator('.dashboard-overview').evaluate((overview) => {
    const kpis = overview.querySelector(':scope > .dashboard-kpis');
    const grid = overview.querySelector(':scope > .dashboard-grid');
    const panels = [...grid.children];
    return {
      vertical: grid.getBoundingClientRect().top - kpis.getBoundingClientRect().bottom,
      horizontal: panels[1].getBoundingClientRect().left - panels[0].getBoundingClientRect().right,
    };
  });
  expect(overviewGaps.vertical).toBeCloseTo(overviewGaps.horizontal, 0);
  expect(overviewGaps.vertical).toBeCloseTo(16, 0);
  const leadershipHeaderGap = await page.locator('.dashboard-head').evaluate((header) =>
    header.nextElementSibling.getBoundingClientRect().top - header.getBoundingClientRect().bottom);
  expect(leadershipHeaderGap).toBeCloseTo(46, 0);
  await expect(page.locator('.dashboard-table-section > .row:first-child'))
    .toHaveCSS('margin-bottom', '0px');
  const networkColumnAlignment = await page.locator('.dashboard-table-section .data-table').evaluate((table) => {
    const headers = [...table.querySelectorAll('thead th:not(.data-table__go)')].slice(1);
    const cells = [...table.querySelectorAll('tbody tr:first-child td:not(.data-table__go)')].slice(1);
    return {
      identityColumnIsLeftAligned: !table.querySelector('tbody tr:first-child td:first-child .table-title-align'),
      columns: headers.map((header, index) => {
        const titleRange = document.createRange();
        titleRange.selectNodeContents(header);
        const titleRect = titleRange.getBoundingClientRect();
        const valueRect = cells[index].querySelector('.table-title-align__value').getBoundingClientRect();
        return Math.abs((titleRect.left + titleRect.width / 2) - (valueRect.left + valueRect.width / 2));
      }),
    };
  });
  expect(networkColumnAlignment.identityColumnIsLeftAligned).toBe(true);
  for (const difference of networkColumnAlignment.columns) expect(difference).toBeLessThan(0.5);
  const weekChart = page.locator('.week-chart');
  const weekDays = await weekChart.locator('.week-chart__day').allTextContents();
  expect(weekDays.map((day) => day.replace(/\.$/, ''))).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  await expect(weekChart.locator('.week-chart__row')).toHaveCount(7);
  await expect(weekChart.locator('.week-chart__row').first()).not.toHaveClass(/week-chart__row--peak/);
  await expect(weekChart.locator('.week-chart__row').last()).toHaveClass(/week-chart__row--peak/);
  await expect(weekChart.locator('.week-chart__row--peak .week-chart__value')).toHaveText(/2\s486/);
  const weekFills = await weekChart.locator('.week-chart__fill').evaluateAll((fills) =>
    fills.map((el) => el.getBoundingClientRect().width),
  );
  expect(Math.max(...weekFills)).toBe(weekFills.at(-1));
  const networkTotal = await page.locator('.dashboard-table-section tbody .data-row td:nth-child(2)').evaluateAll((cells) =>
    cells.reduce((sum, cell) => sum + Number(cell.textContent.trim()), 0),
  );
  expect(networkTotal).toBe(2486);
  // The audience filter is gone: it only hid bars in one section while sitting
  // beside filters that change the whole screen. Distribution always shows all
  // three audiences, and the region filter now syncs to the URL (§7).
  await expect(page.locator('.audience-bar')).toHaveCount(3);
  await expect(page.locator('.audience-bar__value')).toHaveText(['69%', '33%', '16%']);
  const audienceChart = await page.locator('.dashboard-section:has(.audience-bars)').evaluate((section) => {
    const title = section.querySelector('.h3');
    const value = section.querySelector('.audience-bar__value');
    const fill = section.querySelector('.audience-bar__fill');
    const fillStyle = getComputedStyle(fill);
    const fills = [...section.querySelectorAll('.audience-bar__fill')].map((el, index) => {
      const box = el.getBoundingClientRect();
      const label = section.querySelectorAll('.audience-bar__label')[index];
      return {
        width: box.width,
        height: box.height,
        fillToLabel: label.getBoundingClientRect().top - box.bottom,
      };
    });
    return {
      titleLines: title.getClientRects().length,
      titleWhiteSpace: getComputedStyle(title).whiteSpace,
      titleToValue: value.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
      plotMinHeight: getComputedStyle(section.querySelector('.audience-bars')).minHeight,
      radius: {
        top: fillStyle.borderTopLeftRadius,
        bottom: fillStyle.borderBottomLeftRadius,
      },
      fills,
    };
  });
  expect(audienceChart.titleLines).toBe(1);
  expect(audienceChart.titleWhiteSpace).toBe('nowrap');
  expect(audienceChart.titleToValue).toBeGreaterThanOrEqual(20);
  expect(audienceChart.titleToValue).toBeLessThan(36);
  expect(audienceChart.plotMinHeight).toBe('190px');
  expect(audienceChart.radius).toEqual({ top: '8px', bottom: '8px' });
  expect(audienceChart.fills.every((bar) => bar.fillToLabel >= 12)).toBe(true);
  expect(audienceChart.fills).toHaveLength(3);
  expect(audienceChart.fills[0].width).toBeCloseTo(64, 0);
  expect(audienceChart.fills[0].height).toBeGreaterThan(audienceChart.fills[0].width);
  expect(audienceChart.fills[0].height).toBeGreaterThan(audienceChart.fills[1].height);
  expect(audienceChart.fills[1].height).toBeGreaterThan(audienceChart.fills[2].height);
  await page.getByLabel('Регион', { exact: true }).selectOption('sughd');
  await expect(page).toHaveURL(/region=sughd/);
  await expect(page.locator('.dashboard-table-section tbody .data-row')).toHaveCount(1);
  await page.getByLabel('Регион', { exact: true }).selectOption('all');
  await page.locator('.dashboard-table-section tbody .data-row').first().click();
  await expect(page).toHaveURL(/#\/dashboard-center/);

  await page.getByRole('button', { name: /меню оператора/i }).click();
  await page.getByRole('menuitemradio', { name: /^Оператор/ }).click();
  await page.locator('.s-idle__start').click();
  await page.getByRole('button', { name: /Продолжить как гость/ }).click();
  await expect(page.locator('.srv-row .audience-badge--guest')).toBeVisible();
  await expect(page.locator('.sessionbar .audience-badge--guest')).toBeVisible();
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

  const dialog = page.locator('.ekh-dialog-backdrop .ekh-dialog[role="dialog"]');
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
  // `start` and `left` are the same axis in an LTR document. The dialog no
  // longer hard-codes `left`: it inherits the document default now that the
  // card is the shared .ekh-dialog rather than an app-local copy of .modal.
  const leftish = ['left', 'start'];
  expect(leftish).toContain(geometry.modalAlign);
  expect(leftish).toContain(geometry.titleAlign);
  expect(leftish).toContain(geometry.keyAlign);
  expect(leftish).toContain(geometry.valueAlign);
  expect(Math.abs(geometry.actions[0].top - geometry.actions[1].top)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actions[0].height - geometry.actions[1].height)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actions[0].width - geometry.actions[1].width)).toBeLessThanOrEqual(1);
});

test('Admin wizard → builder → review: the full authoring and publishing loop', async ({ page }) => {
  await page.goto('/admin/services.html');
  await page.evaluate(() => localStorage.removeItem('ekh.demo.lowcode.v2'));

  /* the wizard sets the audience and ends in the constructor */
  await page.goto('/admin/new-service.html?lang=tg&theme=light');
  await expect(page.locator('[name="audience"]')).toHaveCount(3);
  await expect(page.locator('[data-lc-audience="guest"]')).toBeChecked();
  for (let step = 2; step <= 4; step += 1) {
    await page.locator('[data-step]:not([hidden]) [data-next]').click();
    await expect(page.locator(`[data-step="${step}"]`)).toBeVisible();
    await expectSameActionHeight(page, `[data-step="${step}"] .j-acts`, step === 4 ? 3 : 2);
  }
  await page.locator('#openServiceBuilder').click();
  await expect(page).toHaveURL(/builder\.html/);

  /* the builder has one toolbar and reads its fields from the bound form */
  await page.goto('/admin/builder.html?lang=tg&theme=light');
  await expect(page.locator('.lc-builder')).toHaveCount(0);
  await expect(page.locator('#fbList')).toHaveCount(0);
  await expect(page.locator('.bld-top [data-lc-role]')).toHaveCount(1);
  await expect(page.locator('#serviceFormSelection .attached-form-card')).toBeVisible();
  const bound = await page.locator('#serviceFormReadonlyFields .service-readonly-field').count();
  await expect(page.locator('#stgFieldsCount')).toHaveText(String(bound));
  await expect(page.locator('#publishBtn')).toBeDisabled();

  /* the demo role drives what the queue offers, and the workflow moves */
  await page.goto('/admin/review.html?lang=ru&theme=light');
  await page.locator('[data-lc-role]').selectOption('reviewer');
  await page.locator('[data-lc-service="ngo-registration"]').click();
  await expect(page.locator('.lc-detail-head h1')).toBeVisible();
  await expect(page.locator('.lc-overview-banner')).toHaveCount(0);
  await expect(page).toHaveURL(/service=ngo-registration/);

  await page.locator('#lcComment').fill('Уточните срок действия выписки.');
  await page.locator('[data-lc-action="ADD_COMMENT"]').click();
  await expect(page.locator('.lc-comment')).toHaveCount(1);
  await page.locator('[data-lc-action="APPROVE"]').click();
  await expect(page.locator('.lc-detail-head .status-icon[aria-label="Подтверждено"]')).toBeVisible();

  await page.locator('[data-lc-role]').selectOption('portal-admin');
  await page.locator('[data-lc-service="ngo-registration"]').click();
  await page.locator('[data-lc-action="PUBLISH"]').click();
  await page.locator('[data-lc-confirm="PUBLISH"]').click();
  await expect(page.locator('.lc-detail-head .status-icon[aria-label="Опубликовано"]')).toBeVisible();
});
