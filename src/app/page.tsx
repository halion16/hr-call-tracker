'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Phone, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';
import { Call, Employee } from '@/types';
import { formatDate, formatDateTime, isToday } from '@/lib/utils';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    upcomingCalls: 0,
    completedThisMonth: 0,
    todayCalls: 0
  });
  const [upcomingCalls, setUpcomingCalls] = useState<(Call & { employee: Employee })[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    const upcoming = LocalStorage.getUpcomingCalls();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = calls.filter(call => 
      call.status === 'completed' && 
      call.dataCompletata && 
      new Date(call.dataCompletata) >= startOfMonth
    ).length;

    const todayCalls = calls.filter(call => 
      call.dataSchedulata && isToday(call.dataSchedulata)
    ).length;

    setStats({
      totalEmployees: employees.length,
      upcomingCalls: upcoming.length,
      completedThisMonth,
      todayCalls
    });

    const upcomingWithEmployees = upcoming.slice(0, 5).map(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      return { ...call, employee: employee! };
    }).filter(call => call.employee);

    setUpcomingCalls(upcomingWithEmployees);
  }, []);

  const handleSyncEmployees = async () => {
    setSyncing(true);
    try {
      const companyEmployees = await RealCompanyApiService.syncEmployees();
      const existingEmployees = LocalStorage.getEmployees();
      const updatedEmployees = [...existingEmployees];
      
      let newCount = 0;
      companyEmployees.forEach(apiEmployee => {
        const existingIndex = updatedEmployees.findIndex(emp => emp.id === apiEmployee.id);
        if (existingIndex >= 0) {
          updatedEmployees[existingIndex] = { ...updatedEmployees[existingIndex], ...apiEmployee };
        } else {
          updatedEmployees.push(apiEmployee);
          newCount++;
        }
      });
      
      LocalStorage.setEmployees(updatedEmployees);
      
      // Aggiorna le statistiche
      const calls = LocalStorage.getCalls();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const completedThisMonth = calls.filter(call => 
        call.status === 'completed' && 
        call.dataCompletata && 
        new Date(call.dataCompletata) >= startOfMonth
      ).length;
      const todayCalls = calls.filter(call => 
        call.dataSchedulata && isToday(call.dataSchedulata)
      ).length;
      const upcoming = LocalStorage.getUpcomingCalls();

      setStats({
        totalEmployees: updatedEmployees.length,
        upcomingCalls: upcoming.length,
        completedThisMonth,
        todayCalls
      });
      
      alert(`Sincronizzazione completata! ${newCount} nuovi dipendenti aggiunti.`);
    } catch (error) {
      alert('Errore durante la sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const viewCallDetails = (callId: string) => {
    router.push(`/calls?highlight=${callId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard HR</h1>
        <p className="text-gray-600">Panoramica delle call di recap con i dipendenti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dipendenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Dipendenti attivi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call di Oggi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCalls}</div>
            <p className="text-xs text-muted-foreground">Programmate per oggi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call in Programma</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingCalls}</div>
            <p className="text-xs text-muted-foreground">Prossime call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completate (Mese)</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Call completate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Prossime Call</CardTitle>
            <CardDescription>
              Le call programmate in arrivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna call programmata</p>
            ) : (
              <div className="space-y-4">
                {upcomingCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {call.employee.nome} {call.employee.cognome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {call.employee.posizione} - {call.employee.dipartimento}
                      </p>
                      <p className="text-sm text-blue-600">
                        {formatDateTime(call.dataSchedulata)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => viewCallDetails(call.id)}
                    >
                      Dettagli
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Operazioni frequenti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/calls')}
            >
              <Phone className="mr-2 h-4 w-4" />
              Pianifica Nuova Call
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={handleSyncEmployees}
              disabled={syncing}
            >
              <Users className="mr-2 h-4 w-4" />
              {syncing ? 'Sincronizzando...' : 'Sincronizza Dipendenti'}
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/calendar')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Visualizza Calendario
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
