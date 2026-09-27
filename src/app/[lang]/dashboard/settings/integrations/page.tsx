'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function IntegrationsSettingsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = use(props.params);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">Управлявайте външните връзки на вашия бизнес акаунт.</p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">НАП</CardTitle>
          <CardDescription className="mt-2">
            Officia не се свързва с НАП и не получава входящ номер.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Файлът за дневниците се сваля от{' '}
            <Link href={`/${lang}/dashboard/vat`} className="text-indigo-600 hover:underline">
              ДДС Дневници
            </Link>
            {' '}и се качва в портала на НАП.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
