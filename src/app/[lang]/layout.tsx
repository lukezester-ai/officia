import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { SetHtmlLang } from "@/components/set-html-lang";
import { OrganizationSchema, SoftwareAppSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Officia — AI ERP за български фирми",
  description: "Счетоводство, фактури, ТРЗ, HR и банкиране на едно място с AI. Безплатно за старт.",
  keywords: ["счетоводен софтуер", "ERP българия", "AI счетоводство", "фактури онлайн", "ТРЗ програма", "такса сметка"],
  openGraph: {
    title: "Officia — AI ERP за български фирми",
    description: "Счетоводство, фактури, ТРЗ, HR и банкиране на едно място с AI.",
    url: "https://officiabg.com",
    siteName: "Officia",
    locale: "bg_BG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Officia — AI ERP за български фирми",
    description: "Счетоводство, фактури, ТРЗ, HR и банкиране на едно място с AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  return (
    <>
      <SetHtmlLang lang={lang} />
      <OrganizationSchema />
      <SoftwareAppSchema />
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster />
    </>
  );
}
