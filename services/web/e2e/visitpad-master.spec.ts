import { test, expect } from '@playwright/test';

/**
 * Smoke: Visitpad shell route loads (auth may redirect — still validates bundle + route).
 * Run with dev server: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm exec playwright test`
 */
test.describe('Visitpad Master', () => {
  test('visitpad /units responds', async ({ page }) => {
    const res = await page.goto('/visitpad/units');
    expect(res?.ok() ?? false).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });

  test('visitpad /conversions responds', async ({ page }) => {
    const res = await page.goto('/visitpad/conversions');
    expect(res?.ok() ?? false).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });
});
