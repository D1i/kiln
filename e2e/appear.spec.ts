import { expect, test, type Page } from '@playwright/test';

async function openPage(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto('/');
  await expect(page.locator('#splash')).toHaveClass(/hidden/, { timeout: 60_000 });
  return problems;
}

const offColumn = (page: Page) => page.locator('.peaks-row:not(.peaks-head) b:nth-of-type(1)');

test('the page loads, shows the panel and reports the loading time', async ({ page }) => {
  const problems = await openPage(page);

  await expect(page.locator('.hud-title')).toHaveText('Warm-up demo');
  await expect(page.locator('.peaks-row:not(.peaks-head)')).toHaveCount(12);
  await expect(page.getByText(/^\d+ ms$/)).toBeVisible();
  expect(problems).toEqual([]);
});

test('Appear next shows the guests one by one and records a peak for each', async ({ page }) => {
  const problems = await openPage(page);

  for (let appeared = 1; appeared <= 12; appeared++) {
    await page.getByRole('button', { name: /^Appear next/ }).click();
    await expect(page.getByText(`${appeared} / 12`)).toBeVisible();
    // The window of the previous guest closes when this one opens, so every peak but the last is already in.
    await page.waitForTimeout(120);
  }
  await expect(page.getByRole('button', { name: 'All appeared' })).toBeDisabled();
  await expect(offColumn(page).filter({ hasText: /^\d+\.\d$/ })).toHaveCount(12, { timeout: 10_000 });
  expect(problems).toEqual([]);
});

test('Auto brings all 12 guests in on its own, Reset puts them back', async ({ page }) => {
  const problems = await openPage(page);

  await page.getByRole('button', { name: 'Auto' }).click();
  await expect(page.getByText('12 / 12')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('0 / 12')).toBeVisible();
  await expect(offColumn(page).filter({ hasText: '—' })).toHaveCount(12);
  await expect(page.getByRole('button', { name: /^Appear next: No texture/ })).toBeEnabled();
  expect(problems).toEqual([]);
});
