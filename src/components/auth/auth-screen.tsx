export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#0F1F3D] px-4">
      {children}
    </div>
  );
}
