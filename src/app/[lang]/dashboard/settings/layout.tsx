import Link from 'next/link';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const tabs = [
    { href: `/${lang}/dashboard/settings/workspace`, label: 'Фирма и план' },
    { href: `/${lang}/dashboard/settings/team`, label: 'Екип и покани' },
    { href: `/${lang}/dashboard/settings/integrations`, label: 'Интеграции' },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
