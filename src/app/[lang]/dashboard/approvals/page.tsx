import { redirect } from 'next/navigation';

export default async function ApprovalsRedirect(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  redirect(`/${lang}/dashboard/tasks`);
}
