// @ts-nocheck
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Fira_Sans, Fira_Code } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from 'sonner';
import AiAssistant from '@/components/ai/AiAssistant';

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
  title: 'Officia',
  description: 'AI ERP система',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="bg" className="dark" suppressHydrationWarning>
        <body className={`${firaSans.variable} ${firaCode.variable} font-sans antialiased bg-background text-foreground transition-colors duration-200 relative min-h-screen`}>
          {/* Premium Background Grid */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <AiAssistant />
            <Toaster theme="system" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
