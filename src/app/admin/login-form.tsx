'use client';

import { useActionState } from 'react';
import { signInAdmin } from './actions';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, { error: '' });

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm text-zinc-300">
        Име
        <input
          name="username"
          autoComplete="username"
          defaultValue="admin"
          required
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-violet-400"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Парола
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-violet-400"
        />
      </label>
      {state.error ? <p className="text-sm text-amber-200">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Влизане...' : 'Влез'}
      </button>
    </form>
  );
}
