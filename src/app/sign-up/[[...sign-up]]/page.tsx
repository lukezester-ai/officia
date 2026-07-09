'use client';

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/bg/dashboard";

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F1F3D]">
      <SignUp
        signInUrl="/sign-in"
        fallbackRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "mx-auto w-full max-w-md",
            card: "bg-zinc-900 shadow-xl border border-white/10",
            headerTitle: "text-white",
            headerSubtitle: "text-zinc-400",
            formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
            formFieldInput: "bg-zinc-800 border-zinc-700 text-white",
            formFieldLabel: "text-zinc-300",
            footerActionLink: "text-indigo-400",
            socialButtonsBlockButton: "border-zinc-700 text-white hover:bg-zinc-800",
            dividerLine: "bg-zinc-700",
            dividerText: "text-zinc-500",
          },
        }}
      />
    </div>
  );
}
