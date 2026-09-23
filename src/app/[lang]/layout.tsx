import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { SetHtmlLang } from "@/components/set-html-lang";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Officia — Вашият офис. По-умно.",
  description: "Модерен SaaS за счетоводители и офис мениджъри",
};

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (lang !== "bg") notFound();

  return (
    <>
      <SetHtmlLang lang={lang} />
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster />
    </>
  );
}
