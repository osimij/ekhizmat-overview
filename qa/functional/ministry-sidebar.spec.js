import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

async function signIn(page) {
  await page.goto('/ministry/?lang=ru&theme=light');
  await page.locator('#l-pass').fill('demo');
  await page.locator('[data-act="login-next"]').click();
  const otp = page.locator('.otp__cell');
  for (let index = 0; index < 6; index += 1) await otp.nth(index).fill(String(index + 1));
  await page.locator('[data-act="login-enter"]').click();
  await expect(page.locator('#app')).toBeVisible();
}

test('Ministry sidebar collapses into a compact icon rail with section dividers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);

  const toggle = page.locator('[data-act="nav-toggle"]');
  const app = page.locator('#app');
  const side = page.locator('#ministry-sidebar');
  const firstIcon = page.locator('.nav-item .icon').first();
  const main = page.locator('#main');

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const expanded = await page.evaluate(() => {
    const sideRect = document.querySelector('#ministry-sidebar').getBoundingClientRect();
    const iconRect = document.querySelector('.nav-item .icon').getBoundingClientRect();
    return {
      sideWidth: sideRect.width,
      iconCenterX: iconRect.left + iconRect.width / 2,
      iconTop: iconRect.top,
    };
  });

  await toggle.click();
  await expect(app).toHaveClass(/side-collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.nav-item__label').first()).toHaveCSS('opacity', '0');
  await expect(side).toHaveCSS('width', '66px');
  await expect(page.locator('.side__group-label').first()).toHaveCSS('height', '17px');

  const collapsed = await page.evaluate(() => {
    const sideRect = document.querySelector('#ministry-sidebar').getBoundingClientRect();
    const iconRect = document.querySelector('.nav-item .icon').getBoundingClientRect();
    const avatarRect = document.querySelector('.side__foot .avatar').getBoundingClientRect();
    const toggleRect = document.querySelector('[data-act="nav-toggle"]').getBoundingClientRect();
    const mainRect = document.querySelector('#main').getBoundingClientRect();
    return {
      sideWidth: sideRect.width,
      sideRight: sideRect.right,
      mainLeft: mainRect.left,
      iconCenterX: iconRect.left + iconRect.width / 2,
      avatarCenterX: avatarRect.left + avatarRect.width / 2,
      toggleCenterX: toggleRect.left + toggleRect.width / 2,
      iconTop: iconRect.top,
      dividerOpacity: getComputedStyle(document.querySelector('.side__group-label'), '::after').opacity,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });

  expect(expanded.sideWidth).toBeCloseTo(264, 0);
  expect(collapsed.sideWidth).toBeCloseTo(66, 0);
  expect(collapsed.mainLeft).toBeCloseTo(collapsed.sideRight, 0);
  expect(collapsed.iconCenterX).toBeCloseTo(expanded.iconCenterX, 0);
  expect(collapsed.avatarCenterX).toBeCloseTo(collapsed.iconCenterX, 0);
  expect(collapsed.toggleCenterX).toBeCloseTo(collapsed.iconCenterX - 2, 0);
  expect(collapsed.iconTop).toBeLessThan(expanded.iconTop);
  expect(collapsed.dividerOpacity).toBe('1');
  expect(collapsed.documentWidth).toBe(collapsed.viewportWidth);
  await expect(firstIcon).toBeVisible();

  await toggle.click();
  await expect(app).not.toHaveClass(/side-collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(side).toHaveCSS('width', '264px');
  await expect(page.locator('.side__group-label').first()).toHaveCSS('height', '44px');
  const restoredIconTop = await firstIcon.evaluate((icon) => icon.getBoundingClientRect().top);
  expect(restoredIconTop).toBeCloseTo(expanded.iconTop, 0);
});

test('Ministry sidebar control keeps the existing mobile drawer behavior', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await signIn(page);

  const toggle = page.locator('[data-act="nav-toggle"]');
  const app = page.locator('#app');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(app).toHaveClass(/nav-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ministry-sidebar')).toBeInViewport();

  await page.locator('.side__backdrop').click({ position: { x: 700, y: 400 } });
  await expect(app).not.toHaveClass(/nav-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
