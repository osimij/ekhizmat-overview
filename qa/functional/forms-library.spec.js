import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/forms.html?lang=ru&theme=light');
  await page.evaluate(() => {
    localStorage.removeItem('ekh.admin.forms.v1');
    localStorage.removeItem('ekh.admin.service-form.v1');
  });
  await page.reload();
});
test('forms live in a separate library with visible version states', async ({ page }) => {
  await expect(page.locator('.form-library-row')).toHaveCount(4);
  const family = page.locator('.form-library-row').filter({ hasText: 'Справка — состав семьи' });
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
  await expect(page.locator('.independent-field')).toHaveCount(1);
  await page.locator('[data-field-prop="label.ru"]').fill('Контактное лицо');
  await page.locator('[data-form-action="save"]').click();
  await expect(page).toHaveURL(/form-builder\.html\?id=form-/);
  await expect(page.locator('#formEditorStatus')).toContainText('v1');
  await expect(page.locator('#formEditorStatus')).toContainText('Черновик');

  await page.locator('.form-editor-top .back').click();
  await page.locator('#formsSearch').fill('Тестовая независимая форма');
  await expect(page.locator('.form-library-row')).toHaveCount(1);
  await expect(page.locator('.form-library-row')).toContainText('Тестовая независимая форма');
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
