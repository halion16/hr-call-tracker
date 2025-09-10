'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Star, Clock, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDate } from '@/lib/utils';
import { CallsChart, StatusPieChart } from '@/components/charts/CallsChart';
import { DepartmentChart, DepartmentPerformanceChart } from '@/components/charts/DepartmentChart';

interface CallWithEmployee extends Call {
  employee: Employee;
}

interface MonthlyStats {
  month: string;
  completed: number;
  scheduled: number;
  cancelled?: number;
  suspended?: number;
}

interface DepartmentStats {
  department: string;
  totalCalls: number;
  avgRating: number;
  employeeCount: number;
}

export default function ReportsPage() {
  const [calls, setCalls] = useState<CallWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    avgRating: 0,
    totalDuration: 0,
    avgDuration: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedEmployees = LocalStorage.getEmployees();
    const loadedCalls = LocalStorage.getCalls();
    
    const callsWithEmployees = loadedCalls
      .map(call => {
        const employee = loadedEmployees.find(emp => emp.id === call.employeeId);
        return employee ? { ...call, employee } : null;
      })
      .filter(Boolean) as CallWithEmployee[];
    
    setEmployees(loadedEmployees);
    setCalls(callsWithEmployees);
    
    calculateStats(callsWithEmployees, loadedEmployees);
  };

  const calculateStats = (callsData: CallWithEmployee[], employeesData: Employee[]) => {
    // Statistiche generali
    const completedCalls = callsData.filter(call => call.status === 'completed');
    const totalRating = completedCalls.reduce((sum, call) => sum + (call.rating || 0), 0);
    const totalDuration = completedCalls.reduce((sum, call) => sum + (call.durata || 0), 0);
    
    setOverallStats({
      totalCalls: callsData.length,
      completedCalls: completedCalls.length,
      avgRating: completedCalls.length > 0 ? totalRating / completedCalls.length : 0,
      totalDuration,
      avgDuration: completedCalls.length > 0 ? totalDuration / completedCalls.length : 0
    });

    // Statistiche mensili
    const monthlyData: { [key: string]: MonthlyStats } = {};
    callsData.forEach(call => {
      const date = new Date(call.dataSchedulata);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          completed: 0,
          scheduled: 0,
          cancelled: 0,
          suspended: 0
        };
      }
      
      if (call.status === 'completed') {
        monthlyData[monthKey].completed++;
      } else if (call.status === 'scheduled') {
        monthlyData[monthKey].scheduled++;
      } else if (call.status === 'cancelled') {
        monthlyData[monthKey].cancelled!++;
      } else if (call.status === 'suspended') {
        monthlyData[monthKey].suspended!++;
      }
    });
    
    setMonthlyStats(Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)));

    // Statistiche per dipartimento
    const departmentData: { [key: string]: DepartmentStats } = {};
    employeesData.forEach(employee => {
      if (!departmentData[employee.dipartimento]) {
        departmentData[employee.dipartimento] = {
          department: employee.dipartimento,
          totalCalls: 0,
          avgRating: 0,
          employeeCount: 0
        };
      }
      departmentData[employee.dipartimento].employeeCount++;
    });
    
    callsData.forEach(call => {
      const dept = call.employee.dipartimento;
      if (departmentData[dept]) {
        departmentData[dept].totalCalls++;
      }
    });
    
    // Calcola rating medio per dipartimento
    Object.keys(departmentData).forEach(dept => {
      const deptCalls = callsData.filter(call => 
        call.employee.dipartimento === dept && 
        call.status === 'completed' && 
        call.rating
      );
      
      if (deptCalls.length > 0) {
        const totalRating = deptCalls.reduce((sum, call) => sum + (call.rating || 0), 0);
        departmentData[dept].avgRating = totalRating / deptCalls.length;
      }
    });
    
    setDepartmentStats(Object.values(departmentData));
  };

  const exportData = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      overallStats,
      monthlyStats,
      departmentStats,
      totalEmployees: employees.length,
      totalCalls: calls.length
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `hr-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report e Analytics</h1>
          <p className="text-gray-600">Analisi delle performance e statistiche delle call HR</p>
        </div>
        
        <Button onClick={exportData}>
          <Download className="mr-2 h-4 w-4" />
          Esporta Report
        </Button>
      </div>

      {/* Statistiche generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call Totali</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.completedCalls} completate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Medio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Su 5 stelle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durata Media</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallStats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">Minuti per call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dipendenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Totali attivi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallStats.totalDuration / 60)}</div>
            <p className="text-xs text-muted-foreground">Ore di call</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Andamento mensile */}
        <Card>
          <CardHeader>
            <CardTitle>Andamento Mensile</CardTitle>
            <CardDescription>Call completate e programmate per mese</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
            ) : (
              <div className="space-y-4">
                {monthlyStats.map(stat => (
                  <div key={stat.month} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stat.month}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600">{stat.completed} completate</span>
                      <span className="text-blue-600">{stat.scheduled} programmate</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiche per dipartimento */}
        <Card>
          <CardHeader>
            <CardTitle>Performance per Dipartimento</CardTitle>
            <CardDescription>Call e rating medio per dipartimento</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
            ) : (
              <div className="space-y-4">
                {departmentStats.map(stat => (
                  <div key={stat.department} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{stat.department}</h4>
                      <div className="text-right text-sm">
                        <div className="flex items-center">
                          <Star className="w-3 h-3 mr-1 text-yellow-500" />
                          {stat.avgRating > 0 ? stat.avgRating.toFixed(1) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>{stat.employeeCount} dipendenti</span>
                      <span className="mx-2">•</span>
                      <span>{stat.totalCalls} call</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sezione Grafici Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico andamento mensile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Andamento Mensile Call
            </CardTitle>
            <CardDescription>Trend delle call negli ultimi mesi</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyStats.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Dati insufficienti per il grafico</p>
                  <p className="text-sm">Aggiungi più call per vedere l'andamento</p>
                </div>
              </div>
            ) : (
              <CallsChart data={monthlyStats} />
            )}
          </CardContent>
        </Card>

        {/* Grafico distribuzione stati */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuzione Stati Call
            </CardTitle>
            <CardDescription>Composizione percentuale per stato</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusPieChart 
              data={[
                {
                  name: 'Completate',
                  value: overallStats.completedCalls,
                  color: '#10b981'
                },
                {
                  name: 'Programmate', 
                  value: overallStats.totalCalls - overallStats.completedCalls,
                  color: '#3b82f6'
                },
                {
                  name: 'Annullate',
                  value: calls.filter(c => c.status === 'cancelled').length,
                  color: '#ef4444'
                },
                {
                  name: 'Sospese',
                  value: calls.filter(c => c.status === 'suspended').length,
                  color: '#f59e0b'
                }
              ].filter(item => item.value > 0)}
            />
          </CardContent>
        </Card>

        {/* Grafico performance dipartimenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Call per Dipartimento
            </CardTitle>
            <CardDescription>Volume di call per dipartimento</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentStats.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun dato per i dipartimenti</p>
                </div>
              </div>
            ) : (
              <DepartmentChart data={departmentStats} />
            )}
          </CardContent>
        </Card>

        {/* Grafico rating per dipartimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Rating Medio per Dipartimento
            </CardTitle>
            <CardDescription>Performance qualitativa per dipartimento</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentStats.filter(d => d.avgRating > 0).length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun rating disponibile</p>
                  <p className="text-sm">Completa alcune call per vedere i rating</p>
                </div>
              </div>
            ) : (
              <DepartmentPerformanceChart 
                data={departmentStats.filter(d => d.avgRating > 0)} 
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call recenti */}
      <Card>
        <CardHeader>
          <CardTitle>Call Recenti</CardTitle>
          <CardDescription>Ultime call completate</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.filter(call => call.status === 'completed').length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna call completata</p>
          ) : (
            <div className="space-y-3">
              {calls
                .filter(call => call.status === 'completed')
                .sort((a, b) => new Date(b.dataCompletata!).getTime() - new Date(a.dataCompletata!).getTime())
                .slice(0, 10)
                .map(call => (
                  <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {call.employee.nome} {call.employee.cognome}
                      </p>
                      <p className="text-sm text-gray-600">
                        {call.employee.dipartimento} • {formatDate(call.dataCompletata!)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm">
                        <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                        {call.rating}/5
                      </div>
                      <p className="text-xs text-gray-600">{call.durata} min</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}