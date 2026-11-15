import { test, expect, mockAPI } from './helpers/fixtures';

test('an old search response cannot replace newer search results', async ({
  page,
}) => {
  await page.goto('/notes');
  let finishOld: () => void;
  const old = new Promise<void>((resolve) => {
    finishOld = resolve;
  });
  await page.route(
    'https://notehub-public.goit.study/api/notes?**',
    async (route) => {
      if (
        new URL(route.request().url()).searchParams.get('search') ===
        'Old query'
      ) {
        await old;
        await route.fulfill({
          json: {
            notes: [
              {
                id: 'old',
                title: 'Outdated search result',
                content: 'Old',
                tag: 'Todo',
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
              },
            ],
            totalPages: 1,
          },
        });
      } else await route.fallback();
    },
  );
  const oldStarted = page.waitForRequest(
    (r) => new URL(r.url()).searchParams.get('search') === 'Old query',
  );
  await page.getByRole('textbox', { name: 'Search notes' }).fill('Old query');
  await oldStarted;
  await page.getByRole('textbox', { name: 'Search notes' }).fill('Note 2');
  await expect(page.locator('main h2')).toHaveCount(7);
  finishOld!();
  await page.waitForTimeout(300);
  await expect(page.getByText('Outdated search result')).toHaveCount(0);
  await expect(page.locator('main h2')).toHaveCount(7);
});

test('a late creation cannot dismiss a newly opened draft', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { createDelay: 1500 },
  });
  await page.goto('/notes');
  const open = page.getByRole('button', { name: 'Create note +' });
  await open.click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('First pending creation');
  const completed = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes('/api/notes'),
  );
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Creating...' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open.click();
  await page.getByLabel('Title', { exact: true }).fill('Second unsaved draft');
  await completed;
  await expect(
    page.getByRole('heading', { name: 'First pending creation', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Second unsaved draft',
  );
});

test('empty optional content stays a string rather than null', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Title without content');
  const submission = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes('/api/notes'),
  );
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  expect((await submission).postDataJSON()).toEqual({
    title: 'Title without content',
    content: '',
    tag: 'Todo',
  });
  await expect(
    page.getByRole('heading', { name: 'Title without content' }),
  ).toBeVisible();
});

test('all five tags can be selected and saved', async ({ page }) => {
  await page.goto('/notes');
  for (const tag of ['Todo', 'Work', 'Personal', 'Meeting', 'Shopping']) {
    await page.getByRole('button', { name: 'Create note +' }).click();
    await page.getByLabel('Title', { exact: true }).fill(`Tagged ${tag}`);
    await page.getByLabel('Tag', { exact: true }).selectOption(tag);
    await page
      .getByRole('button', { name: 'Create note', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.locator('main li').filter({
        has: page.getByRole('heading', {
          name: `Tagged ${tag}`,
          exact: true,
        }),
      }),
    ).toContainText(tag);
  }
});

test('Unicode, punctuation and newlines survive creation and details', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Zażółć & gęślą? 📝');
  await page
    .getByLabel('Content', { exact: true })
    .fill('Pierwsza linia\nДруга лінія\n第三行');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  const card = page.locator('main li').filter({
    has: page.getByRole('heading', {
      name: 'Zażółć & gęślą? 📝',
      exact: true,
    }),
  });
  await card.getByRole('link', { name: 'View details' }).click();
  await expect(page.locator('main')).toContainText(
    'Pierwsza linia\nДруга лінія\n第三行',
    { useInnerText: false },
  );
});

test('deleting a previously visited note cannot revive it with browser Forward', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('link', { name: 'View details' }).first().click();
  await expect(page).toHaveURL(/seed-1$/);
  await page.goBack();
  await page
    .getByRole('button', { name: 'Delete Note 1', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toHaveCount(0);
});

test('the last remaining note can be deleted and the empty list can create again', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: {
      notes: [
        {
          id: 'only',
          title: 'Only note',
          content: 'Last one',
          tag: 'Todo',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    },
  });
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Delete Only note' }).click();
  await expect(
    page.getByText('No notes yet. Create your first note!'),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Notes pagination' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Start again');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Start again' }),
  ).toBeVisible();
});

test('clearing an empty search restores the list and pagination', async ({
  page,
}) => {
  await page.goto('/notes');
  const input = page.getByRole('textbox', { name: 'Search notes' });
  await input.fill('Does not exist');
  await expect(
    page.getByText('No notes found. Try another search.'),
  ).toBeVisible();
  await input.fill('');
  await expect(page.locator('main h2')).toHaveCount(12);
  await expect(
    page.getByRole('navigation', { name: 'Notes pagination' }),
  ).toBeVisible();
});

test('successful navigation produces no browser exceptions or hydration warnings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (/hydration|did not match|hydrating/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Notes' })
    .click();
  await page.getByRole('link', { name: 'View details' }).first().click();
  await expect(page).toHaveURL(/\/notes\/seed-1$/);
  await expect(page.locator('main h2')).toBeVisible();
  await page.reload();
  await expect(page.locator('main h2')).toBeVisible();
  expect(errors).toEqual([]);
});

test('date rendering is stable across browser time zones', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ timezoneId: 'Pacific/Honolulu' });
  await context.route(
    'https://notehub-public.goit.study/api/**',
    async (route) => {
      const original = new URL(route.request().url());
      const response = await route.fetch({
        url: `${mockAPI}${original.pathname}${original.search}`,
      });
      await route.fulfill({ response });
    },
  );
  try {
    await request.post(`${mockAPI}/__test/reset`);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3000/notes/seed-1');
    await expect(page.locator('main time')).toHaveText('01/01/2026');
  } finally {
    await context.close();
  }
});

test('wide desktop and short mobile view keep the modal scrollable', async ({
  page,
}) => {
  for (const [width, height] of [
    [1920, 1080],
    [320, 400],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/notes');
    await page.getByRole('button', { name: 'Create note +' }).click();
    await page
      .getByRole('button', { name: 'Create note', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Create note', exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.keyboard.press('Escape');
  }
});

test('Escape and Cancel restore focus even after validation failure', async ({
  page,
}) => {
  await page.goto('/notes');
  const open = page.getByRole('button', { name: 'Create note +' });
  await open.click();
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(page.getByText('Title is required')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await open.click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(open).toBeFocused();
});

test('keyboard focus stays in the dialog while the submit button is disabled', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { createDelay: 1800 },
  });
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Pending focus check');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Creating...' }),
  ).toBeDisabled();
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    ),
  ).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    ),
  ).toBe(true);
});
