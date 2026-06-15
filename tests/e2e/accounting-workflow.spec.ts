import { test, expect } from '@playwright/test';

test('Full accounting workflow: invoice → journal → report', async ({ page }) => {
  // 1. Вход в системата
  await page.goto('/sign-in');
  await page.fill('[name="email"]', 'accountant@test.bg');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
  
  // 2. Създаване на фактура
  await page.click('text=Фактури');
  await page.click('text=Нова фактура');
  await page.fill('input[name="clientName"]', 'Тест Клиент ЕООД');
  await page.fill('input[name="amount"]', '1000');
  await page.click('text=Запази');
  await expect(page.locator('.toast-success')).toBeVisible();
  
  // 3. Постване на фактурата (създава journal entry)
  await page.click('text=Осчетоводяване');
  await expect(page.locator('text=Journal Entry #2026-00123')).toBeVisible();
  
  // 4. Генериране на баланс
  await page.click('text=Отчети');
  await page.click('text=Баланс');
  await page.selectOption('select#as-of-date', '2026-06-30');
  await page.click('text=Генерирай');
  await expect(page.locator('text=Вземания')).toBeVisible();
  await expect(page.locator('text=1,000.00')).toBeVisible();
  
  // 5. Експорт в PDF
  const downloadPromise = page.waitForEvent('download');
  await page.click('text=Експорт PDF');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('balance-sheet');
});
