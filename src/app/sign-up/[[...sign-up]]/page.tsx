import { SignUp } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';

const afterAuth = '/bg/dashboard';

export default async function Page() {
  const { userId } = await auth();
  if (userId) redirect(afterAuth);

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <AuthScreen>
        <p className="text-sm text-zinc-200">Регистрацията не е настроена на този сървър.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <SignUp
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl={afterAuth}
        forceRedirectUrl={afterAuth}
        signInUrl="/sign-in"
      />
    </AuthScreen>
  );
}
