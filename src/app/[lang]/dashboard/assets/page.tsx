import { redirect } from 'next/navigation';

export default async function AssetsRedirect(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  redirect(`/${lang}/dashboard/fixed-assets`);
}
