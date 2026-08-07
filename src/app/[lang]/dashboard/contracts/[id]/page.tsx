import { getContractById } from '@/lib/contracts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileText, UserPlus, Upload, XCircle, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { activateContractAction, terminateContractAction } from '../actions';
import { getDictionary } from '@/lib/get-dictionary';

export default async function ContractDetailsPage(props: { params: Promise<{ lang: string, id: string }> }) {
  const params = await props.params;
  const dict = await getDictionary(params.lang as any);
  
  if (params.id === 'new') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${params.lang}/dashboard/contracts`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Нов договор</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground p-12">
             В процес на разработка: Тук ще бъде формата за създаване на нов договор.
          </CardContent>
        </Card>
      </div>
    );
  }

  const contract = await getContractById(params.id);
  
  if (!contract) {
    notFound();
  }

  const isDraft = contract.status === 'draft';
  const isActive = contract.status === 'active';
  const canActivate = isDraft && contract.parties.length > 0 && contract.currentVersion;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${params.lang}/dashboard/contracts`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{contract.title}</h1>
              {contract.status === 'active' && <Badge className="bg-emerald-500">Активен</Badge>}
              {contract.status === 'draft' && <Badge variant="secondary">Чернова</Badge>}
              {contract.status === 'terminated' && <Badge variant="destructive">Прекратен</Badge>}
              {contract.status === 'expired' && <Badge variant="outline">Изтекъл</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{contract.description || 'Няма описание'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isDraft && (
            <form action={activateContractAction.bind(null, contract.id)}>
              <Button type="submit" disabled={!canActivate} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4" /> Активирай
              </Button>
            </form>
          )}
          {isActive && (
            <form action={terminateContractAction.bind(null, contract.id)}>
              <Button type="submit" variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" /> Прекрати
              </Button>
            </form>
          )}
        </div>
      </div>
      
      {!canActivate && isDraft && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Договорът не може да бъде активиран все още.</p>
            <ul className="list-disc list-inside text-sm mt-1">
              {contract.parties.length === 0 && <li>Трябва да добавите поне една страна (Party).</li>}
              {!contract.currentVersion && <li>Трябва да качите поне един документ/версия.</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Страни по договора</CardTitle>
                <CardDescription>Участващи фирми или лица</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" /> Добави
              </Button>
            </CardHeader>
            <CardContent>
              {contract.parties.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Няма добавени страни.</p>
              ) : (
                <div className="space-y-4">
                  {contract.parties.map(party => (
                    <div key={party.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                      <div>
                        <p className="font-medium">{party.partyName}</p>
                        <p className="text-sm text-muted-foreground">{party.partyRole || 'Без роля'} • {party.contactEmail || 'Няма имейл'}</p>
                      </div>
                      <Badge variant="secondary">Страна</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Документи и версии</CardTitle>
                <CardDescription>Качени файлове към договора</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Качи версия
              </Button>
            </CardHeader>
            <CardContent>
              {contract.versions.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Няма качени файлове.</p>
              ) : (
                <div className="space-y-4">
                  {contract.versions.map(version => (
                    <div key={version.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">Версия {version.versionNumber}</p>
                          <p className="text-sm text-muted-foreground">Качена на {new Date(version.createdAt).toLocaleDateString('bg-BG')}</p>
                        </div>
                      </div>
                      {version.isCurrent && <Badge>Текуща</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Метаданни</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Начална дата</p>
                <p className="font-medium">{contract.startDate ? new Date(contract.startDate).toLocaleDateString('bg-BG') : 'Не е посочена'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Крайна дата</p>
                <p className="font-medium">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('bg-BG') : 'Не е посочена'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Създаден на</p>
                <p className="font-medium">{new Date(contract.createdAt).toLocaleDateString('bg-BG')}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Последна промяна</p>
                <p className="font-medium">{new Date(contract.updatedAt).toLocaleDateString('bg-BG')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
