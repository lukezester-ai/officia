export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F1F3D] px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4">{children}</div>
    </div>
  );
}
