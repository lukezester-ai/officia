import { SignIn } from '@clerk/nextjs';
import { AuthScreen } from '@/components/auth/auth-screen';

const afterAuth = '/bg/dashboard';

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return (
      <AuthScreen>
        <p className="text-sm text-zinc-200">Входът не е настроен на този сървър.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <h1 className="text-xl font-semibold text-white">Вход в Officia</h1>
      <SignIn fallbackRedirectUrl={afterAuth} forceRedirectUrl={afterAuth} signUpUrl="/sign-up" />
    </AuthScreen>
  );
}
