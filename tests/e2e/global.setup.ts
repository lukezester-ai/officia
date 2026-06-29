import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.clerk/user.json');
const locale = process.env.E2E_LOCALE ?? 'bg';

setup.describe.configure({ mode: 'serial' });

setup('configure Clerk testing token', async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error(
      'E2E: задай CLERK_SECRET_KEY в .env.local (Clerk Dashboard → API Keys).',
    );
  }
  if (!process.env.E2E_CLERK_USER_EMAIL) {
    throw new Error(
      'E2E: задай E2E_CLERK_USER_EMAIL в .env.local — тестов потребител, свързан с tenant в DB.',
    );
  }
  await clerkSetup();
});

setup('authenticate and persist session', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/');
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });

  await page.goto(`/${locale}/dashboard`);
  await expect(page.getByRole('heading', { name: 'Оперативен център' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
