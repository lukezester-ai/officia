import { redirect } from 'next/navigation';

export default async function VatRedirect(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  redirect(`/${lang}/dashboard/vat-journals`);
}
