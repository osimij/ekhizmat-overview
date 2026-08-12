import { test, expect } from '@playwright/test';

async function openCabinet(page, pane='data', query='') {
  await page.goto(`/citizen/?lang=ru&theme=light${query}`);
  await page.evaluate(() => localStorage.setItem('ekh.citizen.auth','1'));
  await page.reload();
  await page.locator('.avatar').click();
  await page.locator(`[data-pane="${pane}"]`).click();
}

test('document card opens details and its corner QR opens directly', async ({ page }) => {
  await openCabinet(page,'docs');
  const passport=page.locator('[data-doc-id="passport"]');
  await passport.click({position:{x:40,y:80}});
  await expect(page.locator('#documentDetailOverlay')).toHaveClass(/open|is-open/);
  await expect(page.locator('.document-page')).toHaveCount(2);
  await page.locator('#documentDetailClose').click();
  await expect(passport.locator('.doc-open')).toBeFocused();
  await passport.locator('.doc-qr').click();
  await expect(page.locator('#qrOverlay')).toHaveClass(/open|is-open/);
  await expect(page.locator('#qrDocName')).toHaveText('Паспорт');
  await page.locator('#qrClose').click();
  await expect(passport.locator('.doc-qr')).toBeFocused();
});

test('applications are newest first and filters combine with URL state', async ({ page }) => {
  await openCabinet(page,'apps');
  await page.locator('.application-summary').click();
  const dates=await page.locator('.application-row').evaluateAll(rows=>rows.map(row=>Date.parse(row.dataset.updatedAt)));
  expect(dates).toEqual([...dates].sort((a,b)=>b-a));
  await page.locator('[data-app-filter="status"]').selectOption('review');
  await page.locator('[data-app-filter="agency"]').selectOption('zags');
  await expect(page).toHaveURL(/status=review/);
  await expect(page).toHaveURL(/agency=zags/);
  await expect(page.locator('.application-row')).toHaveCount(1);
  await page.locator('[data-app-action="reset"]').click();
  await expect(page).not.toHaveURL(/status=/);
  await page.locator('[data-app-filter="type"]').selectOption('service-3');
  await expect(page.locator('.application-row')).toHaveCount(1);
});

test('payments show status dates and receipt is restricted to paid item', async ({ page }) => {
  await openCabinet(page,'payments');
  await expect(page.locator('.payment-item')).toHaveCount(3);
  await expect(page.locator('.payment-date')).toHaveCount(3);
  await expect(page.locator('[data-receipt-id]')).toHaveCount(1);
  await page.locator('[data-receipt-id]').click();
  await expect(page.locator('#receiptOverlay')).toHaveClass(/open|is-open/);
  await expect(page.locator('.receipt-rows .rv')).toHaveCount(9);
  expect(await page.locator('#receiptQr rect').count()).toBeGreaterThan(0);
  const receiptDownload=page.waitForEvent('download');
  await page.locator('#receiptDownload').click();
  await receiptDownload;
});

test('completed baby journey adds owner-filtered certificate and receipt files', async ({ page }) => {
  await openCabinet(page,'data');
  await page.locator('#scr-profile [data-go="home"]').click();
  await page.locator('[data-go="journey"]:visible').first().click();
  await page.locator('#childName').fill('Зарина');
  await page.locator('#toStep2').click();
  await page.locator('#toStep3').click();
  await page.locator('#consent').check();
  await page.locator('#submitAll').click();
  await page.locator('#jstep-4 [data-go="wallet"]').click();
  await expect(page.locator('.received-file-row')).toHaveCount(1);
  await expect(page.locator('.received-file-row')).toContainText('Свидетельство');
  const fileDownload=page.waitForEvent('download');
  await page.locator('[data-file-download]').click();
  await fileDownload;
  await page.locator('[data-own="me"]').click();
  await expect(page.locator('.received-file-row')).toContainText('Квитанция');
  await page.locator('[data-own="parents"]').click();
  await expect(page.locator('.received-empty')).toBeVisible();
});

test('active services render on dashboard and open transparent history', async ({ page }) => {
  await openCabinet(page,'data');
  await expect(page.locator('.tracking-card')).toHaveCount(4);
  await page.locator('.tracking-card [data-track-id]').first().click();
  await expect(page.locator('#pane-apps')).toBeVisible();
  await expect(page.locator('.application-history')).toBeVisible();
  await expect(page.locator('.application-path')).toBeVisible();
});

test('profile photo validates files and never writes a storage key', async ({ page }) => {
  await openCabinet(page,'data');
  await page.locator('#profilePhotoTrigger').click();
  await page.locator('#profilePhotoInput').setInputFiles({name:'not-image.txt',mimeType:'text/plain',buffer:Buffer.from('x')});
  await expect(page.locator('#profilePhotoError')).toBeVisible();
  const before=await page.evaluate(()=>Object.keys(localStorage));
  await page.locator('#profilePhotoCancel').click();
  await page.locator('#profilePhotoTrigger').click();
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  await page.locator('#profilePhotoInput').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:png});
  await page.locator('#profilePhotoSave').click();
  await expect(page.locator('.profile-photo-trigger .avatar-image')).toBeVisible();
  await expect(page.locator('.profile-avatar .avatar-image')).toBeVisible();
  await page.locator('#profilePhotoTrigger').click();
  await page.locator('#profilePhotoRemove').click();
  await expect(page.locator('.profile-photo-trigger .avatar-fallback')).toBeVisible();
  const after=await page.evaluate(()=>Object.keys(localStorage));
  expect(after).toEqual(before);
});
