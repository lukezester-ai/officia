import { SignUp } from "@clerk/nextjs";

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F1F3D]">
      <SignUp />
    </div>
  );
}
