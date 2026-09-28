'use server';

import { redirect } from 'next/navigation';
import { adminCredentialsMatch, adminLoginConfigured, clearAdminSession, startAdminSession } from '@/lib/auth/admin-session';

export async function signInAdmin(_prev: { error: string }, formData: FormData) {
  if (!adminLoginConfigured()) {
    return { error: 'Входът за администратор не е настроен на този компютър.' };
  }
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!adminCredentialsMatch(username, password)) {
    return { error: 'Грешно име или парола.' };
  }
  await startAdminSession();
  redirect('/bg/dashboard');
}

export async function signOutAdmin() {
  await clearAdminSession();
  redirect('/admin');
}
