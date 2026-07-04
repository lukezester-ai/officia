import { ClerkProvider } from '@clerk/nextjs';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
