import { expect } from '@playwright/test';

/* ЦОН: «Начать приём» относится к вызванному талону, поэтому приём с главной
   начинается двумя шагами окна — вызвать талон, который сервер предложил
   следующим, и начать по нему приём. */
export async function callNextTicket(page) {
  const call = page.locator('.s-window [data-action="call"]');
  await expect(call).toBeVisible();
  await expect(call).not.toHaveAttribute('aria-disabled', 'true');
  await call.click();
  await expect(page.locator('.s-window [data-action="start"]')).toBeVisible();
}

export async function startReception(page) {
  await callNextTicket(page);
  await page.locator('.s-window [data-action="start"]').click();
  await expect(page).toHaveURL(/#\/identify/);
}
