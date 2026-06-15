import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Officia - Your office. Smarter.",
  description: "Modern SaaS for accountants and office managers",
};

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  return (
    <>
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster />
    </>
  );
}
