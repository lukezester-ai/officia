import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { SetHtmlLang } from "@/components/set-html-lang";
import { defaultLocale, isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Officia MENA — مكتبك. أذكى.",
  description: "نظام SaaS حديث للمحاسبة وإدارة المكاتب في الشرق الأوسط وشمال أفريقيا",
};

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;

  return (
    <>
      <SetHtmlLang lang={locale} />
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster />
    </>
  );
}
