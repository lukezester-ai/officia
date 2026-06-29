import { test, expect } from '@playwright/test';

const locale = process.env.E2E_LOCALE ?? 'bg';

test.describe('Smoke', () => {
  test('dashboard loads for authenticated user', async ({ page }) => {
    await page.goto(`/${locale}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Оперативен център' })).toBeVisible();
  });

  test('invoices page loads', async ({ page }) => {
    await page.goto(`/${locale}/dashboard/invoices`);
    await expect(page.getByRole('heading', { name: 'Фактури' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Нова фактура' })).toBeVisible();
  });

  test('accounting page loads', async ({ page }) => {
    await page.goto(`/${locale}/dashboard/accounting`);
    await expect(page.getByRole('heading', { name: 'Счетоводство' })).toBeVisible();
  });
});
