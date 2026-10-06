import { AuthScreen } from '@/components/auth/auth-screen';
import { FinishAuthRedirect } from '@/components/auth/finish-auth-redirect';

export default function SignUpCallbackPage() {
  return (
    <AuthScreen>
      <FinishAuthRedirect message="Регистрацията с Google завършва. Таблото се отваря след малко." />
    </AuthScreen>
  );
}
