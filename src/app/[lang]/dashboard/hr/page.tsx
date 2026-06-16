'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmployeeDialog } from '@/components/dashboard/employee-dialog';
import { Check, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, createEmployee, paySalary } from './actions';

export default function HRPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]); // Ще ги добавим по-късно, ако искат реални отпуски
  const [paidSalaries, setPaidSalaries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await getEmployees();
      if (res.success && res.data) {
        setEmployees(res.data.map((emp: any) => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          position: emp.position,
          department: emp.department,
          status: emp.isActive ? 'active' : 'inactive',
          salary: emp.salary,
        })));
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleAddEmployee = async (newEmployeeData: any) => {
    const res = await createEmployee(newEmployeeData);
    if (res.success && res.data) {
      toast.success('Служителят е добавен успешно!');
      const emp = res.data;
      setEmployees([{
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        position: emp.position,
        department: emp.department,
        status: 'active',
        salary: emp.salary,
      }, ...employees]);
    } else {
      toast.error('Грешка при добавяне: ' + res.error);
    }
  };

  const handleApproveLeave = (id: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    toast.success('Отпуската е одобрена.');
  };

  const handleRejectLeave = (id: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'rejected' } : l));
    toast.error('Отпуската е отхвърлена.');
  };

  const handlePaySalary = async (id: string, name: string, salary: string) => {
    setPaidSalaries([...paidSalaries, id]);
    const res = await paySalary(id, salary, name);
    if (res.success) {
      toast.success(`Заплатата на ${name} е изплатена и е записана в Счетоводството.`);
    } else {
      toast.error('Грешка при изплащане: ' + res.error);
      setPaidSalaries(paidSalaries.filter(pId => pId !== id)); // rollback
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-200">Активен</Badge>;
      case 'on_leave': return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-200">В отпуск</Badge>;
      case 'approved': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Одобрена</Badge>;
      case 'pending': return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200">Чакаща</Badge>;
      case 'rejected': return <Badge className="bg-red-500/15 text-red-600 border-red-200">Отхвърлена</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D]">Човешки Ресурси (HR)</h1>
        <EmployeeDialog onAddEmployee={handleAddEmployee} />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="employees">Служители</TabsTrigger>
          <TabsTrigger value="leaves">Отпуски</TabsTrigger>
          <TabsTrigger value="payroll">Заплати (Payroll)</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Списък на служителите</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-gray-500 text-center py-6">Зареждане на служители...</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Нямате добавени служители все още.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Име</TableHead>
                      <TableHead>Имейл</TableHead>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Отдел</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-gray-500">{emp.email}</TableCell>
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
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Заявки за Отпуск</CardTitle></CardHeader>
            <CardContent>
              {leaves.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Няма нови заявки за отпуск.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Служител</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дати</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.employeeName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell className="text-gray-500">{leave.startDate} до {leave.endDate}</TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {leave.status === 'pending' && (
                            <>
                              <Button size="icon" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleApproveLeave(leave.id)}>
                                <Check size={16} />
                              </Button>
                              <Button size="icon" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRejectLeave(leave.id)}>
                                <X size={16} />
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
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Месечни Заплати</CardTitle></CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Няма служители за изплащане на заплати.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Служител</TableHead>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Основна Заплата (BGN)</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-gray-500">{emp.position}</TableCell>
                        <TableCell className="font-bold">{emp.salary} лв.</TableCell>
                        <TableCell className="text-right">
                          {paidSalaries.includes(emp.id) ? (
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" disabled>
                              <Check size={14} className="mr-2" /> Изплатена
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => handlePaySalary(emp.id, emp.name, emp.salary)}>
                              <Wallet size={14} /> Изплати
                            </Button>
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

      </Tabs>
    </div>
  );
}
