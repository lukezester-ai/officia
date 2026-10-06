import { SignUp } from '@clerk/nextjs';
import { AuthScreen } from '@/components/auth/auth-screen';

const afterAuth = '/bg/dashboard';

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return (
      <AuthScreen>
        <p className="text-sm text-zinc-200">Регистрацията не е настроена на този сървър.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <div className="mb-2 text-center">
        <h1 className="text-xl font-semibold text-white">Създай безплатен акаунт</h1>
        <p className="mt-1 text-sm text-zinc-300">14 дни без карта. След това достъпът спира, докато не се избере план.</p>
      </div>
      <SignUp fallbackRedirectUrl={afterAuth} forceRedirectUrl={afterAuth} signInUrl="/sign-in" />
    </AuthScreen>
  );
}
