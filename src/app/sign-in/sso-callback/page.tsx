import { AuthScreen } from '@/components/auth/auth-screen';
import { FinishAuthRedirect } from '@/components/auth/finish-auth-redirect';

export default function SignInCallbackPage() {
  return (
    <AuthScreen>
      <FinishAuthRedirect message="Влизането с Google завършва. Таблото се отваря след малко." />
    </AuthScreen>
  );
}
