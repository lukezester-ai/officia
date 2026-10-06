import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { AuthScreen } from '@/components/auth/auth-screen';

const afterAuth = '/bg/dashboard';

export default function SignUpCallbackPage() {
  return (
    <AuthScreen>
      <p className="text-sm text-zinc-200">Регистрацията с Google завършва. Таблото се отваря след малко.</p>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={afterAuth}
        signUpForceRedirectUrl={afterAuth}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      />
    </AuthScreen>
  );
}
