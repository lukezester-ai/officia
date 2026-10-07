import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ArrowLeft } from '@/components/icons';
import { NewContractForm } from '../_form';

export default async function NewContractPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <Link href={`/${lang}/dashboard/contracts`} className={buttonVariants({ variant: 'ghost', className: 'gap-2 px-0' })}>
        <ArrowLeft className="h-4 w-4" /> Договори
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Нов договор</h1>
        <p className="text-muted-foreground mt-2">Договорът се записва като чернова. След това добавете страна и документ, за да го активирате.</p>
      </div>
      <NewContractForm lang={lang} />
    </div>
  );
}
