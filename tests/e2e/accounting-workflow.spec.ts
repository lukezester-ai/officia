import { test, expect } from '@playwright/test';

const locale = process.env.E2E_LOCALE ?? 'bg';

test.describe('Accounting workflow', () => {
  test('invoice → accounting queue → balance report', async ({ page }) => {
    const invoiceNumber = `E2E-${Date.now()}`;

    // 1. Създаване на фактура
    await page.goto(`/${locale}/dashboard/invoices`);
    await page.getByRole('button', { name: 'Нова фактура' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Нова фактура' })).toBeVisible();

    await dialog.getByPlaceholder('0000000001').fill(invoiceNumber);
    await dialog.getByPlaceholder('Клиент ЕООД').fill('E2E Тест Клиент ЕООД');
    await dialog.getByPlaceholder('Услуга / стока').fill('Кonsulting услуга E2E');
    await dialog.getByPlaceholder('0.00').fill('1000');

    await dialog.getByRole('button', { name: 'Създай фактура' }).click();
    await expect(page.getByText('Фактурата е създадена!')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText(invoiceNumber)).toBeVisible();

    // 2. Счетоводен модул — опашка за преглед
    await page.goto(`/${locale}/dashboard/accounting`);
    await expect(page.getByRole('heading', { name: 'Счетоводство' })).toBeVisible();
    await expect(page.getByText(`Фактура ${invoiceNumber}`)).toBeVisible({ timeout: 15_000 });

    // 3. Баланс — генерира се автоматично от ReportEngine
    await page.goto(`/${locale}/dashboard/accounting/reports/balance`);
    await expect(page.getByRole('heading', { name: 'Баланс' })).toBeVisible();
    await expect(page.getByText('Aktivi')).toBeVisible();
    await expect(page.getByText('Aktivi = Pasivi + Kapital')).toBeVisible();

    // 4. PDF експорт (client-side download)
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
