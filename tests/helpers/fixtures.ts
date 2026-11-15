import { test as base, expect } from '@playwright/test';

export const mockAPI = 'http://127.0.0.1:4010';
export const test = base.extend({
  context: async ({ context, request }, runFixture) => {
    await request.post(`${mockAPI}/__test/reset`);
    await context.route(
      'https://notehub-public.goit.study/api/**',
      async (route) => {
        const original = new URL(route.request().url());
        const response = await route.fetch({
          url: `${mockAPI}${original.pathname}${original.search}`,
          headers: {
            ...route.request().headers(),
            authorization: 'Bearer test-only',
          },
        });
        await route.fulfill({ response });
      },
    );
    try {
      await runFixture(context);
    } finally {
      await context.unrouteAll({ behavior: 'wait' });
    }
  },
});
export { expect };
