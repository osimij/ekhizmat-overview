import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/forms.html?lang=ru&theme=light');
  await page.evaluate(() => {
    localStorage.removeItem('ekh.admin.forms.v1');
    localStorage.removeItem('ekh.admin.service-form.v1');
  });
  await page.reload();
});
test('forms chrome uses a neutral selected sidebar item and medium top title', async ({ page }) => {
  const current = page.locator('#admRail .ekh-side__item[aria-current]');
  const treatment = await current.evaluate((item) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolveColor = (token) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    probe.style.backgroundColor = 'var(--hover)';
    const hover = getComputedStyle(probe).backgroundColor;
    probe.style.backgroundColor = 'var(--bg)';
    const values = {
      background: getComputedStyle(item).backgroundColor,
      hover,
      railBackground: getComputedStyle(document.querySelector('#admRail')).backgroundColor,
      canvas: getComputedStyle(probe).backgroundColor,
      text: getComputedStyle(item).color,
      icon: getComputedStyle(item.querySelector('svg')).color,
      count: getComputedStyle(item.querySelector('.ekh-side__count')).color,
      ink: resolveColor('--ink'),
      secondary: resolveColor('--ink-2'),
      blue: resolveColor('--blue-ink'),
    };
    probe.remove();
    return values;
  });
  expect(treatment.background).toBe(treatment.hover);
  expect(treatment.railBackground).toBe(treatment.canvas);
  expect(treatment.text).toBe(treatment.ink);
  expect(treatment.icon).toBe(treatment.secondary);
  expect(treatment.count).toBe(treatment.secondary);
  expect([treatment.text, treatment.icon, treatment.count]).not.toContain(treatment.blue);
  const countBackgrounds = await page.locator('#admRail .ekh-side__count').evaluateAll((counts) =>
    counts.map((count) => getComputedStyle(count).backgroundColor));
  expect(new Set(countBackgrounds)).toEqual(new Set(['rgba(0, 0, 0, 0)']));
  await expect(page.locator('#formsTopTitle')).toHaveCSS('font-weight', '500');
});
test('status filter lives in the URL and KPI shortcuts toggle it', async ({ page }) => {
  await page.locator('[data-st-go="draft"]').click();
  await expect(page).toHaveURL(/status=draft/);
  await expect(page.locator('#formsList .ekh-list-row')).toHaveCount(3);
  await page.locator('#formStatusFilter').selectOption('unused');
  await expect(page).toHaveURL(/status=unused/);
  await expect(page.locator('#formsList .ekh-list-row')).toHaveCount(1);
  await page.locator('[data-st-go="unused"]').click();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.locator('#formsList .ekh-list-row')).toHaveCount(4);
});

test('form KPIs use four distinct semantic icons on the right', async ({ page }) => {
  const cards = page.locator('#formsStats .forms-stat');
  await expect(cards).toHaveCount(4);
  const icons = page.locator('#formsStats .forms-stat__icon');
  await expect(icons).toHaveCount(4);
  const hrefs = await icons.locator('use').evaluateAll((elements) => elements.map((icon) => icon.getAttribute('href')));
  expect(hrefs).toEqual([
    '/design-system/assets/icons.svg#i-check',
    '/design-system/assets/icons.svg#i-edit',
    '/design-system/assets/icons.svg#i-history',
    '/design-system/assets/icons.svg#i-inbox',
  ]);
  const treatment = await cards.evaluateAll((elements) => elements.map((card) => {
    const icon = card.querySelector('.forms-stat__icon');
    const cardRect = card.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    return { color:getComputedStyle(icon).color, rightGap:Math.round(cardRect.right-iconRect.right) };
  }));
  const semanticColors = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolve = (token) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const colors = { green:resolve('--green'), amber:resolve('--amber') };
    probe.remove();
    return colors;
  });
  expect(new Set(treatment.map(item => item.color)).size).toBe(4);
  expect(treatment[0].color).toBe(semanticColors.green);
  expect(treatment[1].color).toBe(semanticColors.amber);
  expect(new Set(treatment.map(item => item.rightGap)).size).toBe(1);
  await expect(cards.first()).toHaveCSS('padding-right', '20px');
});

test('published form version badge uses only a subtle outline', async ({ page }) => {
  await page.goto('/admin/builder.html?lang=ru&theme=light');
  const badge = page.locator('#serviceFormSelection .form-version-badge--published');
  await expect(badge).toBeVisible();

  const treatment = await badge.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.borderColor = 'var(--line)';
    document.body.append(probe);
    const style = getComputedStyle(element);
    const iconStyle = getComputedStyle(element.querySelector('.status-icon'));
    const values = {
      background: style.backgroundColor,
      borderColor: style.borderTopColor,
      borderWidth: style.borderTopWidth,
      line: getComputedStyle(probe).borderTopColor,
      iconBackground: iconStyle.backgroundColor,
    };
    probe.remove();
    return values;
  });

  expect(treatment.background).toBe('rgba(0, 0, 0, 0)');
  expect(treatment.iconBackground).toBe('rgba(0, 0, 0, 0)');
  expect(treatment.borderWidth).toBe('1px');
  expect(treatment.borderColor).toBe(treatment.line);
});

test('published form editor uses a white field body and a clearer live icon', async ({ page }) => {
  await page.goto('/admin/form-builder.html?id=family-certificate&version=3&lang=ru&theme=light');
  const firstField = page.locator('#independentFields .fb-item').first();
  await firstField.locator('[data-field-act="toggle"]').click();
  await expect(firstField.locator('.fb-body')).toBeVisible();
  const treatment = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolveBackground = (value) => {
      probe.style.background = value;
      return getComputedStyle(probe).backgroundColor;
    };
    const values = {
      body: getComputedStyle(document.querySelector('#independentFields .fb-item.open .fb-body')).backgroundColor,
      panel: resolveBackground('var(--panel)'),
      liveIcon: getComputedStyle(document.querySelector('.form-version-item--published .status-icon')).backgroundColor,
      liveCheck: getComputedStyle(document.querySelector('.form-version-item--published .status-icon')).color,
      solidGreen: resolveBackground('var(--green)'),
      baseGreen: resolveBackground('var(--green-tint)'),
    };
    probe.remove();
    return values;
  });

  expect(treatment.body).toBe(treatment.panel);
  expect(treatment.liveIcon).toBe(treatment.solidGreen);
  expect(treatment.liveIcon).not.toBe(treatment.baseGreen);
  expect(treatment.liveCheck).toBe(treatment.panel);
});

test('form library metric columns stay aligned across rows', async ({ page }) => {
  const rows = page.locator('#formsList .ekh-list-row');
  await expect(rows).toHaveCount(4);
  const xs = await rows.evaluateAll((elements) => elements.map((row) => {
    const metric = row.querySelectorAll('.form-library-metric');
    const versions = row.querySelector('.form-version-strip');
    return {
      fields: Math.round(metric[0].getBoundingClientRect().left),
      services: Math.round(metric[1].getBoundingClientRect().left),
      versions: Math.round(versions.getBoundingClientRect().left),
    };
  }));
  expect(new Set(xs.map((box) => box.fields)).size).toBe(1);
  expect(new Set(xs.map((box) => box.services)).size).toBe(1);
  expect(new Set(xs.map((box) => box.versions)).size).toBe(1);
});

test('only the versions column is aligned to its right edge', async ({ page }) => {
  const alignment = await page.locator('#formsCatalog').evaluate((catalog) => {
    const header = catalog.querySelector('.ekh-list-head > :last-child').getBoundingClientRect();
    const rows = [...catalog.querySelectorAll('.ekh-list-row')];
    return {
      headerRight: Math.round(header.right),
      stripRights: rows.map((row) => Math.round(row.querySelector('.form-version-strip').getBoundingClientRect().right)),
      pillRights: rows.map((row) => Math.round(row.querySelector('.form-version-strip > :last-child').getBoundingClientRect().right)),
      fieldsCentered: rows.every((row) => getComputedStyle(row.querySelector('.form-library-metric')).justifySelf === 'center'),
    };
  });
  expect(new Set(alignment.stripRights)).toEqual(new Set([alignment.headerRight]));
  expect(new Set(alignment.pillRights)).toEqual(new Set([alignment.headerRight]));
  expect(alignment.fieldsCentered).toBe(true);
});

test('forms live in a separate library with visible version states', async ({ page }) => {
  await expect(page.locator('#formsList .ekh-list-row')).toHaveCount(4);
  const family = page.locator('#formsList .ekh-list-row').filter({ hasText: 'Справка — состав семьи' });
  await expect(family.locator('.form-mini-version')).toHaveCount(3);
  await expect(family.locator('.form-mini-version').nth(0)).toContainText('v3');
  await expect(family.locator('.form-mini-version').nth(0)).toContainText('Черновик');
  await expect(family.locator('.form-mini-version').nth(1)).toContainText('v2');
  await expect(family.locator('.form-mini-version').nth(1)).toContainText('Опубликована');
  await expect(family.locator('.form-mini-version').nth(2)).toContainText('v1');
  await expect(family.locator('.form-mini-version').nth(2)).toContainText('архив');
});

test('a new form can be built and saved without creating a service', async ({ page }) => {
  await page.getByRole('link', { name: 'Новая форма' }).click();
  await page.locator('#formNameTg').fill('Шакли санҷишӣ');
  await page.locator('#formNameRu').fill('Тестовая независимая форма');
  await page.locator('#formDescription').fill('Форма без услуги');
  await page.locator('#addFormField').click();
  await page.locator('[data-form-add="text"]').click();
  /* the shared composer opens the new field focused on its Tajik label */
  await expect(page.locator('.fb-item')).toHaveCount(1);
  await expect(page.locator('.fb-item.open')).toHaveCount(1);
  await page.locator('.ml-tabs button[data-ml="ru"]').click();
  await page.locator('[data-field-prop="label.ru"]').fill('Контактное лицо');
  await page.locator('[data-form-action="save"]').click();
  await expect(page).toHaveURL(/form-builder\.html\?id=form-/);
  await expect(page.locator('#formEditorStatus')).toContainText('v1');
  await expect(page.locator('#formEditorStatus')).toContainText('Черновик');

  await page.locator('.form-editor-top .back').click();
  await page.locator('#formsSearch').fill('Тестовая независимая форма');
  await expect(page.locator('#formsList .ekh-list-row')).toHaveCount(1);
  await expect(page.locator('#formsList .ekh-list-row')).toContainText('Тестовая независимая форма');
});

test('publishing a draft archives the old live version and services opt in explicitly', async ({ page }) => {
  await page.goto('/admin/form-builder.html?id=family-certificate&version=3&lang=ru&theme=light');
  await page.locator('[data-form-action="publish"]').click();
  await expect(page.locator('#publishFormModal')).toBeVisible();
  await page.locator('#confirmFormPublish').click();
  await expect(page.locator('#formEditorStatus')).toContainText('v3');
  await expect(page.locator('#formEditorStatus')).toContainText('Опубликована');
  await expect(page.locator('[data-version="2"]')).toContainText('В архиве');

  await page.goto('/admin/builder.html?lang=ru&theme=light');
  await expect(page.locator('#serviceFormSelection')).toContainText('v2');
  await expect(page.locator('#serviceFormSelection')).toContainText('Доступна новая версия');
  await page.locator('[data-open="serviceFormPicker"]').click();
  const family = page.locator('.service-form-option').filter({ hasText: 'Справка — состав семьи' });
  await expect(family).toContainText('v3');
  await family.locator('input').check();
  await page.locator('#confirmServiceForm').click();
  await expect(page.locator('#serviceFormSelection')).toContainText('v3');
  await expect(page.locator('#serviceFormSelection')).not.toContainText('Доступна новая версия');
});
