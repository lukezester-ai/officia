// @ts-nocheck
import type { Metadata, Viewport } from "next";
import { getLocale, getMessages } from 'next-intl/server';
import { ClerkProvider } from '@clerk/nextjs';
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { Providers } from '@/app/Providers';

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
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale} className="dark" suppressHydrationWarning>
        <body className={`${firaSans.variable} ${firaCode.variable} font-sans antialiased bg-background text-foreground transition-colors duration-200 relative min-h-screen`}>
          <Providers locale={locale} messages={messages}>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
