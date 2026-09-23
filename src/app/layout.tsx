import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { Providers } from '@/app/Providers';
import bgMessages from '../messages/bg.json';

const firaSans = Fira_Sans({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  subsets: ["latin", "cyrillic"],
});

const firaCode = Fira_Code({
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  applicationName: "Officia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Officia",
    statusBarStyle: "black-translucent",
  },
  title: "Officia",
  description: "AI ERP система",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4F46E5",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = "bg";
  const messages = bgMessages;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const tree = (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans antialiased bg-background text-foreground transition-colors duration-200 relative min-h-screen`}>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );

  if (!clerkPublishableKey) {
    return tree;
  }

  return <ClerkProvider publishableKey={clerkPublishableKey}>{tree}</ClerkProvider>;
}
