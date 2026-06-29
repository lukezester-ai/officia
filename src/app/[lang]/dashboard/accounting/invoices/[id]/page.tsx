import { redirect } from 'next/navigation';

export default async function LegacyInvoiceDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  redirect(`/${lang}/dashboard/invoices?open=${id}`);
}
