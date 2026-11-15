import { test, expect, mockAPI } from './helpers/fixtures';

test('list is rendered on the server and hydrates without a duplicate browser request', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/notes')).text();
  expect(html).toContain('Note 1');
  expect(html).toContain('/notes/seed-1');
  const browserRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://notehub-public.goit.study'))
      browserRequests.push(r.url());
  });
  await page.goto('/notes');
  await expect(page.locator('main h2')).toHaveCount(12);
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toBeVisible();
  expect(browserRequests).toEqual([]);
});

test('details render full data on the server and survive direct navigation and reload', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/notes/seed-1')).text();
  expect(html).toContain('Content for note 1');
  expect(html).toContain('2026-01-01T10:00:00.000Z');
  await page.goto('/notes/seed-1');
  await expect(page.locator('main h2')).toHaveText('Note 1');
  await expect(page.locator('main')).toContainText('Todo');
  await expect(page.locator('main time')).toHaveText('01/01/2026');
  await page.reload();
  await expect(page.locator('main h2')).toHaveText('Note 1');
  await expect(page.locator('footer')).toContainText('Nikita Goluban');
});

test('home and shared navigation reach notes, details and home', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to NoteHub' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Notes' })
    .click();
  const card = page
    .locator('main li')
    .filter({ has: page.getByRole('heading') })
    .first();
  expect(
    await card
      .locator('a')
      .evaluate((el) => Boolean(el.nextElementSibling?.matches('button'))),
  ).toBe(true);
  await card.getByRole('link', { name: 'View details' }).click();
  await expect(page).toHaveURL(/\/notes\/seed-1$/);
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Home' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Welcome to NoteHub' }),
  ).toBeVisible();
});

test('creation trims title, submits the selected tag and resets an empty search', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('textbox', { name: 'Search notes' }).fill('absent');
  await expect(
    page.getByText('No notes found. Try another search.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('  My new note  ');
  await page.getByLabel('Content', { exact: true }).fill('Full new content');
  await page.getByLabel('Tag', { exact: true }).selectOption('Work');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Search notes' })).toHaveValue(
    '',
  );
  const card = page.locator('main li').filter({
    has: page.getByRole('heading', { name: 'My new note', exact: true }),
  });
  await expect(card).toContainText('Work');
  await card.getByRole('link', { name: 'View details' }).click();
  await expect(page.locator('main')).toContainText('Full new content');
});

test('search is debounced, trims whitespace and resets the page', async ({
  page,
  request,
}) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Note 25', exact: true }),
  ).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Search notes' });
  await input.fill('N');
  await input.fill('No');
  await input.fill('  Note 2  ');
  await expect(page.locator('main h2')).toHaveCount(7);
  await expect(
    page.getByRole('heading', { name: 'Note 2', exact: true }),
  ).toBeVisible();
  const requests = await (
    await request.get(`${mockAPI}/__test/requests`)
  ).json();
  expect(
    requests.filter(
      (r: { search: string }) => r.search === 'N' || r.search === 'No',
    ),
  ).toHaveLength(0);
  expect(
    requests
      .filter((r: { search: string; page: string }) => r.search === 'Note 2')
      .every((r: { page: string }) => r.page === '1'),
  ).toBe(true);
});

test('deleting the only item on the last page returns to the preceding page', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete Note 25', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Note 13', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Notes pagination' })
      .locator('[aria-current="page"]'),
  ).toHaveText('2');
  await expect(
    page.getByRole('button', { name: 'Page 3', exact: true }),
  ).toHaveCount(0);
});

test('deletion invalidates an already cached page', async ({ page }) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Note 13', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Page 1', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete Note 1', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Note 14', exact: true }),
  ).toBeVisible();
});

test('pending deletion disables duplicate mutations', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { deleteDelay: 700 },
  });
  await page.goto('/notes');
  await page
    .getByRole('button', { name: 'Delete Note 1', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Delete Note 1', exact: true }),
  ).toHaveText('Deleting...');
  await expect(
    page.getByRole('button', { name: 'Delete Note 2', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toHaveCount(0);
  const requests = await (
    await request.get(`${mockAPI}/__test/requests`)
  ).json();
  expect(
    requests.filter((r: { method: string }) => r.method === 'DELETE'),
  ).toHaveLength(1);
});

test('pending creation disables duplicate submissions', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { createDelay: 700 },
  });
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Submit once');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Creating...' }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const requests = await (
    await request.get(`${mockAPI}/__test/requests`)
  ).json();
  expect(
    requests.filter((r: { method: string }) => r.method === 'POST'),
  ).toHaveLength(1);
});

test('failed creation preserves the form and can be submitted again', async ({
  page,
  request,
}) => {
  await page.goto('/notes');
  await request.post(`${mockAPI}/__test/control`, {
    data: { mutationError: true },
  });
  await page.getByRole('button', { name: 'Create note +' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Preserved title');
  await page.getByLabel('Content', { exact: true }).fill('Preserved content');
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Could not create',
  );
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Preserved title',
  );
  await expect(page.getByLabel('Content', { exact: true })).toHaveValue(
    'Preserved content',
  );
  await request.post(`${mockAPI}/__test/control`, {
    data: { mutationError: false },
  });
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Preserved title' }),
  ).toBeVisible();
});

test('failed deletion retains the note and allows retry', async ({
  page,
  request,
}) => {
  await page.goto('/notes');
  await request.post(`${mockAPI}/__test/control`, {
    data: { mutationError: true },
  });
  await page
    .getByRole('button', { name: 'Delete Note 1', exact: true })
    .click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not delete',
  );
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toBeVisible();
  await request.post(`${mockAPI}/__test/control`, {
    data: { mutationError: false },
  });
  await page
    .getByRole('button', { name: 'Delete Note 1', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toHaveCount(0);
});

for (const status of [500, 429]) {
  test(`client search handles HTTP ${status} and recovers with Try again`, async ({
    page,
    request,
  }) => {
    await page.goto('/notes');
    await request.post(`${mockAPI}/__test/control`, {
      data: { listError: status },
    });
    await page.getByRole('textbox', { name: 'Search notes' }).fill('Note 2');
    await expect(page.locator('main').getByRole('alert')).toContainText(
      'Could not load notes',
    );
    await request.post(`${mockAPI}/__test/control`, {
      data: { listError: false },
    });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('main h2')).toHaveCount(7);
  });
}

test('server list failure recovers with Try again without a page reload', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { listError: true },
  });
  await page.goto('/notes');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not fetch the list of notes.',
  );
  await expect(page.locator('footer')).toContainText('Contact us:');
  await request.post(`${mockAPI}/__test/control`, {
    data: { listError: false },
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Note 1', exact: true }),
  ).toBeVisible();
});

test('server details failure recovers with Try again without a page reload', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { detailsError: true },
  });
  await page.goto('/notes/seed-1');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not fetch note details.',
  );
  await request.post(`${mockAPI}/__test/control`, {
    data: { detailsError: false },
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('main h2')).toHaveText('Note 1');
});

test('root loading UI appears while server notes are pending', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, {
    data: { listDelay: 1000 },
  });
  await page.goto('/notes', { waitUntil: 'commit' });
  await expect(page.getByRole('status')).toHaveText('Loading, please wait...');
  await expect(
    page.getByRole('link', { name: 'View details' }).first(),
  ).toBeVisible();
});

test('missing details use their own error boundary and navigation still works', async ({
  page,
}) => {
  await page.goto('/notes/missing');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Could not fetch note details.',
  );
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Home' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Welcome to NoteHub' }),
  ).toBeVisible();
});

test('empty notes and empty search have distinct messages', async ({
  page,
  request,
}) => {
  await request.post(`${mockAPI}/__test/control`, { data: { notes: [] } });
  await page.goto('/notes');
  await expect(
    page.getByText('No notes yet. Create your first note!'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Search notes' }).fill('absent');
  await expect(
    page.getByText('No notes found. Try another search.'),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Notes pagination' }),
  ).toHaveCount(0);
});

test('form validation checks whitespace, minimum and maximum lengths', async ({
  page,
}) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Create note +' }).click();
  const title = page.getByLabel('Title', { exact: true });
  const submit = page.getByRole('button', { name: 'Create note', exact: true });
  await title.fill('   ');
  await submit.click();
  await expect(page.getByText('Title is required')).toBeVisible();
  await title.fill('ab');
  await submit.click();
  await expect(
    page.getByText('Title must be at least 3 characters'),
  ).toBeVisible();
  await title.fill('x'.repeat(51));
  await page.getByLabel('Content', { exact: true }).fill('x'.repeat(501));
  await submit.click();
  await expect(
    page.getByText('Title must be at most 50 characters'),
  ).toBeVisible();
  await expect(
    page.getByText('Content must be at most 500 characters'),
  ).toBeVisible();
  await title.fill('x'.repeat(50));
  await page.getByLabel('Content', { exact: true }).fill('x'.repeat(500));
  await submit.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('modal traps focus, restores it, locks scrolling, and closes by Escape, Cancel and backdrop', async ({
  page,
}) => {
  await page.goto('/notes');
  const open = page.getByRole('button', { name: 'Create note +' });
  await open.click();
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Create note', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await open.click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open.click();
  await page.getByRole('dialog').click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

for (const width of [320, 375, 768]) {
  test(`notes, modal and details fit a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/notes');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole('button', { name: 'Create note +' }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(
      page.getByRole('button', { name: 'Create note', exact: true }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');
    await page.goto('/notes/seed-1');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}

test('note HTML is rendered as text rather than executed', async ({
  page,
  request,
}) => {
  const title = '<img src=x onerror=alert(1)>';
  const content = '<script>window.__injected=true</script>';
  const response = await request.post(`${mockAPI}/api/notes`, {
    data: { title, content, tag: 'Todo' },
  });
  const note = await response.json();
  await page.goto(`/notes/${note.id}`);
  await expect(page.locator('main h2')).toHaveText(title);
  await expect(page.locator('main')).toContainText(content);
  await expect(page.locator('main img, main script')).toHaveCount(0);
  expect(await page.evaluate(() => '__injected' in window)).toBe(false);
});
