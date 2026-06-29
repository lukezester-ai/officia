import { redirect } from 'next/navigation';

export default async function LegacyInvoicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/dashboard/invoices`);
}
