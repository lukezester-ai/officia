'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmployeeDialog } from '@/components/dashboard/employee-dialog';
import { Check, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const initialEmployees = [
  { id: '1', name: 'Ivan Ivanov', email: 'ivan@officia.bg', position: 'Software Engineer', department: 'Engineering', status: 'active', salary: '4500.00' },
  { id: '2', name: 'Maria Georgieva', email: 'maria@officia.bg', position: 'HR Manager', department: 'HR', status: 'on_leave', salary: '3200.00' },
  { id: '3', name: 'Georgi Dimitrov', email: 'georgi@officia.bg', position: 'Accountant', department: 'Finance', status: 'active', salary: '2800.00' },
];

const initialLeaves = [
  { id: 'l1', employeeName: 'Maria Georgieva', type: 'Annual Leave', startDate: '2026-06-20', endDate: '2026-06-25', status: 'pending' },
  { id: 'l2', employeeName: 'Ivan Ivanov', type: 'Sick Leave', startDate: '2026-06-05', endDate: '2026-06-07', status: 'approved' },
];

export default function HRPage() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [paidSalaries, setPaidSalaries] = useState<string[]>([]);

  const handleAddEmployee = (newEmployee: any) => {
    setEmployees([...employees, newEmployee]);
    toast.success('Employee added successfully!');
  };

  const handleApproveLeave = (id: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    toast.success('Leave request approved.');
  };

  const handleRejectLeave = (id: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'rejected' } : l));
    toast.error('Leave request rejected.');
  };

  const handlePaySalary = (id: string, name: string) => {
    setPaidSalaries([...paidSalaries, id]);
    toast.success(`Salary successfully processed for ${name}.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-200">Active</Badge>;
      case 'on_leave': return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-200">On Leave</Badge>;
      case 'approved': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Approved</Badge>;
      case 'pending': return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-500/15 text-red-600 border-red-200">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D]">Human Resources</h1>
        <EmployeeDialog onAddEmployee={handleAddEmployee} />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll (Заплати)</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Company Roster</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.employeeName}</TableCell>
                      <TableCell>{leave.type}</TableCell>
                      <TableCell className="text-gray-500">{leave.startDate} to {leave.endDate}</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="shadow-sm border-gray-100">
            <CardHeader><CardTitle>Monthly Payroll</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Base Salary (BGN)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                            <Check size={14} className="mr-2" /> Paid
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => handlePaySalary(emp.id, emp.name)}>
                            <Wallet size={14} /> Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
