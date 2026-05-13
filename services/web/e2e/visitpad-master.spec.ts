import { test, expect } from '@playwright/test';

/**
 * Smoke: every Visitpad catalog shell route loads (auth may redirect — still validates bundle + route).
 * Run with dev server: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm exec playwright test`
 */
const VISITPAD_ROUTES: Array<{ path: string; label: string }> = [
  { path: '/visitpad/units', label: 'units' },
  { path: '/visitpad/conversions', label: 'conversions' },
  { path: '/visitpad/vitals', label: 'vitals' },
  { path: '/visitpad/chief-complaints', label: 'chief-complaints' },
  { path: '/visitpad/diagnoses', label: 'diagnoses' },
  { path: '/visitpad/allergens', label: 'allergens' },
  { path: '/visitpad/reactions', label: 'reactions' },
  { path: '/visitpad/rx-columns', label: 'rx-columns' },
  { path: '/visitpad/medicines', label: 'medicines' },
  { path: '/visitpad/chronic-illness', label: 'chronic-illness' },
  { path: '/visitpad/procedures', label: 'procedures' },
];

test.describe('Visitpad Master', () => {
  for (const { path, label } of VISITPAD_ROUTES) {
    test(`visitpad ${label} route responds`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.ok() ?? false).toBeTruthy();
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
