import { redirect } from 'next/navigation';

export default async function SettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/dashboard/settings/workspace`);
}
