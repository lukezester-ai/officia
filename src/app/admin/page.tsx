import Link from 'next/link';
import { hasAdminSession } from '@/lib/auth/admin-session';
import { signOutAdmin } from './actions';
import { AdminLoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const signedIn = await hasAdminSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1F3D] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0F1C] p-8">
        <h1 className="text-2xl font-bold text-white">Вход за администратор</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          След входа Кадри, ТРЗ и AI асистентът се отварят в този браузър. Обикновеният вход в Officia си остава отделен.
        </p>
        {signedIn ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-emerald-300">Влязъл си като администратор.</p>
            <Link href="/bg/dashboard" className="block rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
              Към таблото
            </Link>
            <form action={signOutAdmin}>
              <button type="submit" className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-200">
                Изход
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <AdminLoginForm />
          </div>
        )}
      </div>
    </div>
  );
}
