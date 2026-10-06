import { SignIn } from '@clerk/nextjs';
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
        <p className="text-sm text-zinc-200">Входът не е настроен на този сървър.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl={afterAuth}
        forceRedirectUrl={afterAuth}
        signUpUrl="/sign-up"
      />
    </AuthScreen>
  );
}
