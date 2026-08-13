import { test, expect } from '@playwright/test';

test('Admin new-service keeps blank and copy paths distinct in Russian', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=ru&theme=light');

  const headerSpacing=await page.locator('.wz-h').evaluate(header=>{
    const title=header.querySelector('h1').getBoundingClientRect();
    const subtitle=header.querySelector('p').getBoundingClientRect();
    return subtitle.top-title.bottom;
  });
  expect(headerSpacing).toBeLessThanOrEqual(8);

  const firstStepPolish=await page.locator('[data-step="1"]').evaluate(step=>{
    const title=step.querySelector('h2');
    const lead=step.querySelector('.lead');
    const option=step.querySelector('.opt');
    const radio=option.querySelector('input[type="radio"]');
    const titleBox=title.getBoundingClientRect();
    const leadBox=lead.getBoundingClientRect();
    const optionBox=option.getBoundingClientRect();
    const radioBox=radio.getBoundingClientRect();
    return {
      titleWeight:Number.parseFloat(getComputedStyle(title).fontWeight),
      titleLeadGap:leadBox.top-titleBox.bottom,
      radioCenterDelta:Math.abs((radioBox.top+radioBox.height/2)-(optionBox.top+optionBox.height/2)),
      radioBorder:getComputedStyle(radio).borderTopColor
    };
  });
  expect(firstStepPolish.titleWeight).toBeLessThanOrEqual(550);
  expect(firstStepPolish.titleLeadGap).toBeLessThanOrEqual(4);
  expect(firstStepPolish.radioCenterDelta).toBeLessThanOrEqual(1);
  expect(firstStepPolish.radioBorder).toBe('rgb(201, 202, 206)');

  await page.locator('[name="method"][value="blank"]').check();
  await expect(page.locator('#basisStep')).toBeHidden();
  await page.locator('#methodNext').click();
  await expect(page.locator('[data-step="3"]')).toBeVisible();
  await expect(page.locator('[data-step="2"]')).toBeHidden();
  await expect(page.locator('#ntg')).toHaveValue('');
  await expect(page.locator('#nru')).toHaveValue('');
  await expect(page.locator('#sla')).toHaveValue('1 рабочий день');
  await page.locator('[data-step="3"] [data-next]').click();
  await expect(page.locator('#rvBase')).toHaveText('С нуля');
  await expect(page.locator('#rvProcess')).toHaveText('Пустой процесс — готовых шагов нет.');
  await expect(page.locator('#createServiceForm')).toHaveAttribute('href', /new=1.*source=blank.*lang=ru/);

  await page.goto('/admin/new-service.html?lang=ru&theme=light');
  await page.locator('[name="method"][value="copy"]').check();
  await expect(page.locator('#copyPicker')).toBeVisible();
  await expect(page.locator('.copy-service')).toHaveCount(8);
  await expect(page.locator('#methodNext')).toBeDisabled();
  await page.locator('#copySearch').fill('налог');
  await expect(page.locator('.copy-service:visible')).toHaveCount(2);
  await page.locator('.copy-service:visible input[value="SVC-TAX-04"]').check();
  await expect(page.locator('#methodNext')).toBeEnabled();
  await page.locator('#methodNext').click();
  await expect(page.locator('[data-step="3"]')).toBeVisible();
  await expect(page.locator('#nru')).toHaveValue('Копия — Справка — налоговая задолженность');
  await expect(page.locator('#createServiceForm')).toHaveAttribute('href', /new=1.*source=copy.*service=SVC-TAX-04/);
});

test('Blank builder starts with no seeded fields and copy keeps the chosen name', async ({ page }) => {
  await page.goto('/admin/builder.html?source=blank&lang=ru&theme=light');
  await expect(page.locator('#svcName')).toHaveValue('Новая услуга');
  await expect(page.locator('#serviceFormSelection')).toBeVisible();
  await expect(page.locator('#serviceFormSelection')).toContainText('v2');

  await page.goto('/admin/builder.html?source=copy&service=SVC-TAX-04&lang=ru&theme=light');
  await expect(page.locator('#svcName')).toHaveValue('Копия — Справка — налоговая задолженность');
  await expect(page.locator('#serviceFormSelection')).toBeVisible();
});

test('Admin can assign a new service to a catalogue category', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=ru&theme=light');
  await page.locator('[data-step="1"] [data-next]').click();
  await page.locator('[data-step="2"] [data-next]').click();

  const category = page.locator('#serviceCategory');
  await expect(category).toBeVisible();
  await expect(category.locator('option')).toHaveCount(14);
  await category.selectOption('land');
  await expect(category).toHaveValue('land');

  await page.locator('[data-step="3"] [data-next]').click();
  await expect(page.locator('#rvCat')).toHaveText('Земля и недвижимость');
  await expect(page.locator('#createServiceForm')).toHaveAttribute('href', /category=land/);

  const headingLeft=await page.locator('[data-step="4"] h2').evaluate(element=>element.getBoundingClientRect().left);
  const labelLeft=await page.locator('.review--creation-summary .k').first().evaluate(element=>element.getBoundingClientRect().left);
  const backLeft=await page.locator('.j-acts--split [data-back]').evaluate(element=>element.getBoundingClientRect().left);
  expect(Math.abs(labelLeft-headingLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(backLeft-headingLeft)).toBeLessThanOrEqual(1);
});

test('Admin can save the new service as a draft and see its status in the registry', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=ru&theme=light');
  await page.locator('[data-step="1"] [data-next]').click();
  await page.locator('[data-step="2"] [data-next]').click();
  await page.locator('#ntg').fill('Хизмати санҷишӣ');
  await page.locator('#nru').fill('Тестовая услуга');
  await page.locator('[data-step="3"] [data-next]').click();

  await expect(page.locator('#saveServiceDraft')).toBeVisible();
  await expect(page.locator('#createServiceForm')).toBeVisible();
  await page.locator('#saveServiceDraft').click();

  await expect(page).toHaveURL(/services\.html.*saved=service-/);
  const created=page.locator('[data-created-service]');
  await expect(created).toHaveCount(1);
  await expect(created).toContainText('Тестовая услуга');
  await expect(created.locator('.status-icon')).toHaveAttribute('aria-label', 'черновик');
  await expect(page.locator('#draftServiceCount')).toHaveText('9');
});

test('Admin can continue directly into a form prefilled for the new service', async ({ page }) => {
  await page.goto('/admin/new-service.html?lang=ru&theme=light');
  await page.locator('[data-step="1"] [data-next]').click();
  await page.locator('[data-step="2"] [data-next]').click();
  await page.locator('#ntg').fill('Ариза барои чорабинӣ');
  await page.locator('#nru').fill('Заявление на мероприятие');
  await page.locator('[data-step="3"] [data-next]').click();
  await page.locator('#createServiceForm').click();

  await expect(page).toHaveURL(/form-builder\.html.*new=1.*service=service-/);
  await expect(page.locator('#formNameTg')).toHaveValue('Ариза барои чорабинӣ');
  await expect(page.locator('#formNameRu')).toHaveValue('Заявление на мероприятие');
  await expect(page.locator('#formBackLabel')).toHaveText('Услуги');
});
