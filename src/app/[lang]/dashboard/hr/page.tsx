'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmployeeDialog } from '@/components/dashboard/employee-dialog';
import { Check, X, Wallet, Users, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, createEmployee, getLeaveRequests, updateLeaveStatus } from './actions';

export default function HRPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [paidSalaries, setPaidSalaries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [empRes, leaveRes] = await Promise.all([getEmployees(), getLeaveRequests()]);
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.map((e: any) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          email: e.email,
          position: e.position || '—',
          department: e.department || '—',
          salary: e.salary || '0.00',
          status: e.isActive ? 'active' : 'inactive',
        })));
      }
      if (leaveRes.success && leaveRes.data) {
        setLeaves(leaveRes.data.map((l: any) => ({
          id: l.id,
          employeeName: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Служител',
          type: l.type === 'annual' ? 'Годишен отпуск' : l.type === 'sick' ? 'Болничен' : l.type === 'unpaid' ? 'Неплатен' : 'Друг',
          startDate: l.startDate,
          endDate: l.endDate,
          status: l.status,
        })));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleAddEmployee = async (newEmployee: any) => {
    const tempId = `temp-${Date.now()}`;
    setEmployees(prev => [{ id: tempId, ...newEmployee, status: 'active' }, ...prev]);
    const res = await createEmployee(newEmployee);
    if (res.success && res.data) {
      const e = res.data;
      setEmployees(prev => prev.map(emp => emp.id === tempId ? {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        email: e.email,
        position: e.position || '—',
        department: e.department || '—',
        salary: e.salary || '0.00',
        status: 'active',
      } : emp));
      toast.success('Служителят е добавен успешно!');
    } else {
      setEmployees(prev => prev.filter(e => e.id !== tempId));
      toast.error('Грешка: ' + res.error);
    }
  };

  const handleApproveLeave = async (id: string) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    const res = await updateLeaveStatus(id, 'approved');
    if (!res.success) { setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'pending' } : l)); toast.error('Грешка'); }
    else toast.success('Заявката е одобрена.');
  };

  const handleRejectLeave = async (id: string) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'rejected' } : l));
    const res = await updateLeaveStatus(id, 'rejected');
    if (!res.success) { setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'pending' } : l)); toast.error('Грешка'); }
    else toast.info('Заявката е отхвърлена.');
  };

  const handlePaySalary = (id: string, name: string) => {
    setPaidSalaries(prev => [...prev, id]);
    toast.success(`Заплатата на ${name} е обработена.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Активен</Badge>;
      case 'on_leave': return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200">В отпуск</Badge>;
      case 'approved': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Одобрена</Badge>;
      case 'pending': return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200">Чакаща</Badge>;
      case 'rejected': return <Badge className="bg-red-500/15 text-red-600 border-red-200">Отхвърлена</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeCount = employees.filter(e => e.status === 'active').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalPayroll = employees.reduce((sum, e) => sum + parseFloat(e.salary || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Човешки Ресурси</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Служители, отпуски и ведомост за заплати.</p>
        </div>
        <EmployeeDialog onAddEmployee={handleAddEmployee} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Активни служители</CardTitle>
            <Users size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Чакащи заявки</CardTitle>
            <Clock size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{pendingLeaves}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Обща ведомост</CardTitle>
            <UserCheck size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPayroll.toFixed(2)} лв.</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Служители</TabsTrigger>
          <TabsTrigger value="leaves">Заявки за отпуск</TabsTrigger>
          <TabsTrigger value="payroll">Ведомост</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Списък служители</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Няма добавени служители.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Служител</TableHead>
                      <TableHead>Имейл</TableHead>
                      <TableHead>Длъжност</TableHead>
                      <TableHead>Отдел</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                        <TableCell>{emp.position}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{getStatusBadge(emp.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Заявки за отпуск</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
              ) : leaves.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Няма подадени заявки.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Служител</TableHead>
                      <TableHead>Вид</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.employeeName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell className="text-muted-foreground">{leave.startDate} → {leave.endDate}</TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {leave.status === 'pending' && (
                            <>
                              <Button size="icon" variant="outline" className="text-emerald-600 hover:bg-emerald-50 h-8 w-8" onClick={() => handleApproveLeave(leave.id)}>
                                <Check size={14} />
                              </Button>
                              <Button size="icon" variant="outline" className="text-red-600 hover:bg-red-50 h-8 w-8" onClick={() => handleRejectLeave(leave.id)}>
                                <X size={14} />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Месечна ведомост</CardTitle></CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Няма служители.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Служител</TableHead>
                      <TableHead>Длъжност</TableHead>
                      <TableHead>Основна заплата (BGN)</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.position}</TableCell>
                        <TableCell className="font-bold">{emp.salary} лв.</TableCell>
                        <TableCell className="text-right">
                          {paidSalaries.includes(emp.id) ? (
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" disabled>
                              <Check size={14} className="mr-2" /> Платено
                            </Button>
                          ) : (
                            <Button size="sm" className="gap-2" onClick={() => handlePaySalary(emp.id, emp.name)}>
                              <Wallet size={14} /> Плати
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={2} className="font-bold text-right">Общо:</TableCell>
                      <TableCell className="font-bold">{totalPayroll.toFixed(2)} лв.</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}