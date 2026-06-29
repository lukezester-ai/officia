import { redirect } from 'next/navigation';

export default async function LegacyNewInvoicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/dashboard/invoices?new=1`);
}
