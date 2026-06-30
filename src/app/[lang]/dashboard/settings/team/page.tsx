'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTeamInvite, getTeamMembers } from './actions';
import { INVITABLE_ROLES, type AppRole } from '@/lib/auth/rbac';
import { toast } from 'sonner';
import { Copy, UserPlus, Users } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Собственик',
  senior_accountant: 'Старши счетоводител',
  junior_accountant: 'Младши счетоводител',
  auditor: 'Одитор',
  tax_consultant: 'Данъчен консултант',
};

export default function TeamSettingsPage() {
  const params = useParams();
  const lang = String(params?.lang ?? 'bg');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('junior_accountant');
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const load = async () => {
    const res = await getTeamMembers();
    if (res.success) {
      setMembers(res.data.members);
      setPending(res.data.pending);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTeamInvite({ email, role, lang });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLastInviteUrl(res.inviteUrl);
    toast.success('Поканата е създадена');
    setEmail('');
    await load();
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Зареждане...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Екип и покани</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Поканете колеги с роли и права (RBAC).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus size={18} /> Нова покана
          </CardTitle>
          <CardDescription>
            Поканеният трябва да се регистрира/влезе със същия email, после да отвори линка.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="space-y-4">
            <Input
              type="email"
              placeholder="colleague@company.bg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </option>
              ))}
            </select>
            <Button type="submit" className="gap-2">
              <UserPlus size={16} /> Изпрати покана
            </Button>
          </form>
          {lastInviteUrl && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <code className="bg-muted px-2 py-1 rounded flex-1 truncate">{lastInviteUrl}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${lastInviteUrl}`);
                  toast.success('Линкът е копиран');
                }}
              >
                <Copy size={14} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users size={18} /> Членове ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex justify-between text-sm border-b py-2">
              <span>{m.name || m.email}</span>
              <span className="text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</span>
            </div>
          ))}
          {pending.length > 0 && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Чакащи покани</p>
              {pending.map((p) => (
                <div key={p.id} className="text-sm text-muted-foreground">
                  {p.email} · {ROLE_LABELS[p.role] || p.role}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
