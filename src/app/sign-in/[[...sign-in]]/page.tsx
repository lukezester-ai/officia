import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F1F3D]">
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
