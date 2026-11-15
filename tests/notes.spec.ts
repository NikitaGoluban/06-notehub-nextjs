import { expect, test } from '@playwright/test';

const api = 'https://notehub-public.goit.study/api/notes';

test('home navigation, SSR notes and hydration without a duplicate API request', async ({
  page,
  request,
}) => {
  const response = await request.get('/notes');
  const html = await response.text();
  expect(response.ok()).toBeTruthy();
  expect(html).toContain('View details');
  let browserApiRequests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith(api)) browserApiRequests++;
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to NoteHub' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Notes' })
    .click();
  await expect(
    page.getByRole('link', { name: 'View details' }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View details' }).first().click();
  await expect(page).toHaveURL(/\/notes\/[^/]+$/);
  await expect(page.locator('main h2')).toBeVisible();
  expect(browserApiRequests).toBe(0);
  await page.reload();
  await expect(page.locator('main h2')).toBeVisible();
  expect(browserApiRequests).toBe(0);
  await expect(page.locator('footer')).toContainText('Nikita Goluban');
});

test('creates, searches, opens, reloads and deletes a note', async ({
  page,
  request,
}) => {
  const title = `E2E NoteHub ${Date.now()}`;
  let createdId: string | undefined;
  try {
    await page.goto('/notes');
    await page.getByRole('button', { name: 'Create note +' }).click();
    await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
    await page
      .getByRole('button', { name: 'Create note', exact: true })
      .click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page
      .getByLabel('Content', { exact: true })
      .fill('A temporary note verifying Next.js SSR and client mutations.');
    await page.getByLabel('Tag', { exact: true }).selectOption('Work');
    const created = page.waitForResponse(
      (r) => r.url() === api && r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Create note', exact: true })
      .click();
    const createdResponse = await created;
    expect(createdResponse.status()).toBe(201);
    createdId = (await createdResponse.json()).id;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Search notes' }).fill(title);
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: title }) });
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'View details' }).click();
    await expect(page).toHaveURL(`/notes/${createdId}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('main')).toContainText(
      'A temporary note verifying Next.js SSR and client mutations.',
    );
    await expect(page.locator('time')).toHaveAttribute('datetime', /\d{4}-/);
    await page
      .getByRole('navigation', { name: 'Main Navigation' })
      .getByRole('link', { name: 'Notes' })
      .click();
    await page.getByRole('textbox', { name: 'Search notes' }).fill(title);
    await expect(card).toBeVisible();
    await card
      .getByRole('button', { name: `Delete ${title}`, exact: true })
      .click();
    await expect(
      page.getByText('No notes found. Try another search.'),
    ).toBeVisible();
  } finally {
    if (createdId)
      await request.delete(`${api}/${createdId}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_NOTEHUB_TOKEN}`,
        },
      });
  }
});

test('pagination, empty results and client error recovery', async ({
  page,
}) => {
  await page.goto('/notes');
  const pagination = page.getByRole('navigation', { name: 'Notes pagination' });
  await pagination.getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('2');
  await page.route(`${api}**`, (route) =>
    route.fulfill({ status: 500, json: { message: 'Test failure' } }),
  );
  await page
    .getByRole('textbox', { name: 'Search notes' })
    .fill('error-recovery-check');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not load notes',
  );
  await page.unroute(`${api}**`);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByText('No notes found. Try another search.'),
  ).toBeVisible();
});

test('modal keyboard handling and 320px mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/notes');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.getByRole('button', { name: 'Create note +' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Create note', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Create note +' }),
  ).toBeFocused();
});

test('missing note reaches its own error boundary', async ({ page }) => {
  await page.goto('/notes/nonexistent-note-e2e');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not fetch note details.',
  );
  await expect(
    page.getByRole('navigation', { name: 'Main Navigation' }),
  ).toBeVisible();
});
