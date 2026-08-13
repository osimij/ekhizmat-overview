import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test('Admin rail collapses on the shared 33px icon axis and persists across pages without a flash', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/services.html?lang=ru&theme=light');

  const rail = page.locator('.ekh-side');
  const toggle = page.locator('[data-ekh-side-toggle]');
  await expect(rail).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const expanded = await page.evaluate(() => {
    const railRect = document.querySelector('.ekh-side').getBoundingClientRect();
    const iconRect = document.querySelector('.ekh-side__item svg').getBoundingClientRect();
    return { railWidth: railRect.width, iconCenterX: iconRect.left + iconRect.width / 2 };
  });
  expect(expanded.railWidth).toBeCloseTo(264, 0);

  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/side-collapsed/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(rail).toHaveCSS('width', '66px');
  await expect(page.locator('.ekh-side__text').first()).toHaveCSS('opacity', '0');
  await expect(page.locator('.ekh-side__label').first()).toHaveCSS('height', '17px');

  const collapsed = await page.evaluate(() => {
    const iconRect = document.querySelector('.ekh-side__item svg').getBoundingClientRect();
    const avatarRect = document.querySelector('.ekh-side__avatar').getBoundingClientRect();
    return {
      iconCenterX: iconRect.left + iconRect.width / 2,
      avatarCenterX: avatarRect.left + avatarRect.width / 2,
      dividerOpacity: getComputedStyle(document.querySelector('.ekh-side__label'), '::after').opacity,
    };
  });
  expect(collapsed.iconCenterX).toBeCloseTo(expanded.iconCenterX, 0);
  expect(collapsed.avatarCenterX).toBeCloseTo(collapsed.iconCenterX, 0);
  expect(collapsed.dividerOpacity).toBe('1');

  /* Navigating the MPA: the inline head script restores the state before
     paint and the tween stays unarmed — the rail lands at 66px instantly. */
  await page.goto('/admin/index.html?lang=ru&theme=light');
  await expect(page.locator('html')).toHaveClass(/side-collapsed/);
  const onLoad = await page.evaluate(() => ({
    width: document.querySelector('.ekh-side').getBoundingClientRect().width,
    armed: document.documentElement.classList.contains('ekh-side-anim'),
  }));
  expect(onLoad.width).toBeCloseTo(66, 0);
  expect(onLoad.armed).toBe(false);

  await page.locator('[data-ekh-side-toggle]').click();
  await expect(page.locator('html')).not.toHaveClass(/side-collapsed/);
  await expect(rail).toHaveCSS('width', '264px');
  await expect(page.locator('.ekh-side__text').first()).toHaveCSS('opacity', '1');
});
