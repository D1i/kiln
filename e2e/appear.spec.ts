import { expect, test, type Page } from '@playwright/test';

async function openPage(page: Page, search = ''): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto(`/${search}`);
  await expect(page.locator('#splash')).toHaveClass(/hidden/, { timeout: 120_000 });
  return problems;
}

const column = (page: Page, index: 1 | 2) =>
  page.locator(`.peaks-row:not(.peaks-head) b:nth-of-type(${index})`);
const compiledAfterLoading = async (page: Page) =>
  Number(await page.locator('.hud-rows div', { hasText: 'Compiled' }).locator('b').innerText());

async function appearAllWithAuto(page: Page) {
  await page.getByRole('button', { name: 'Auto' }).click();
  await expect(page.getByText('12 / 12')).toBeVisible({ timeout: 60_000 });
  await expect(
    column(page, 1)
      .filter({ hasText: /^\d+\.\d$/ })
      .or(column(page, 2).filter({ hasText: /^\d+\.\d$/ }))
  ).toHaveCount(12, {
    timeout: 15_000
  });
}

test('the page loads, shows the panel and reports the loading time', async ({ page }) => {
  const problems = await openPage(page);

  await expect(page.locator('.hud-title')).toHaveText('Kiln');
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
  await expect(column(page, 1).filter({ hasText: /^\d+\.\d$/ })).toHaveCount(12, { timeout: 10_000 });
  expect(problems).toEqual([]);
});

test('Auto brings all 12 guests in on its own, Reset starts over cold', async ({ page }) => {
  const problems = await openPage(page);

  await page.getByRole('button', { name: 'Auto' }).click();
  await expect(page.getByText('12 / 12')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#splash')).toHaveClass(/hidden/, { timeout: 60_000 });
  await expect(page.getByText('0 / 12')).toBeVisible();
  await expect(column(page, 1).filter({ hasText: '—' })).toHaveCount(12);
  await expect(page.getByRole('button', { name: /^Appear next: No texture/ })).toBeEnabled();
  expect(problems).toEqual([]);
});

test('without warm-up the objects compile shaders as they appear', async ({ page }) => {
  const problems = await openPage(page, '?mode=off');

  expect(await compiledAfterLoading(page)).toBe(0);
  await appearAllWithAuto(page);

  expect(await compiledAfterLoading(page)).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('with warm-up nothing is compiled after the loading screen', async ({ page }) => {
  const problems = await openPage(page, '?mode=on');

  await appearAllWithAuto(page);

  expect(await compiledAfterLoading(page)).toBe(0);
  expect(problems).toEqual([]);
});

test('the switch reloads into the other mode and keeps the numbers of the first', async ({ page }) => {
  const problems = await openPage(page, '?mode=off');
  await appearAllWithAuto(page);

  await page.getByText('Warm-up off', { exact: true }).click();
  await expect(page).toHaveURL(/mode=on/);
  await expect(page.locator('#splash')).toHaveClass(/hidden/, { timeout: 120_000 });

  await expect(page.locator('.switch-text b')).toHaveText('Warm-up on');
  await expect(column(page, 1).filter({ hasText: /^\d+\.\d$/ })).toHaveCount(12);
  await expect(column(page, 2).filter({ hasText: '—' })).toHaveCount(12);
  expect(problems).toEqual([]);
});

test('Run A/B goes through both modes by itself, fills both columns and copies the result', async ({
  page,
  context
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const problems = await openPage(page);

  await page.getByLabel('Runs per mode').selectOption('1');
  await page.getByRole('button', { name: 'Run A/B' }).click();

  await expect(page.locator('.report')).toBeVisible({ timeout: 240_000 });
  const report = (await page.locator('.report').textContent()) ?? '';
  expect(report).toContain('Warm-up off');
  expect(report).toContain('Warm-up on');
  expect(report).toContain('sum of peaks');
  expect(report.split('\n').filter((line) => /^\s*\d+\. .* → /.test(line))).toHaveLength(12);

  await expect(column(page, 1).filter({ hasText: /^\d+\.\d$/ })).toHaveCount(12);
  await expect(column(page, 2).filter({ hasText: /^\d+\.\d$/ })).toHaveCount(12);

  await page.getByRole('button', { name: 'Copy result' }).click();
  // Windows stores line breaks on the clipboard as CRLF.
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll('\r\n', '\n')).toBe(report);
  expect(problems).toEqual([]);
});

for (const format of ['ktx2', 'png'] as const) {
  test(`object 11 loads its ${format} texture, and everything comes from this server`, async ({
    page,
    baseURL
  }) => {
    const requested: string[] = [];
    const foreign: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/textures/basis-2048.')) requested.push(url.pathname);
      const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
      if (!isFont && url.origin !== new URL(baseURL ?? '').origin) foreign.push(request.url());
    });
    const problems = await openPage(page, `?mode=on&texture=${format}`);

    await expect(page.locator('.hud > .hud-status')).toBeEmpty();
    expect(requested.filter((path) => path.endsWith(`.${format}`))).not.toHaveLength(0);
    expect(requested.filter((path) => !path.endsWith(`.${format}`))).toEqual([]);
    expect(foreign).toEqual([]);
    expect(problems).toEqual([]);
  });
}
