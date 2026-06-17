import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-4xl font-semibold text-navy">Officia</Link>
          <p className="mt-2 text-sm font-semibold text-slate-500">Create your Officia workspace account.</p>
        </div>
        <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
