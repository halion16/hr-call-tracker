'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Phone, Users, Clock, TrendingUp, AlertTriangle, Target, BarChart3, Award, Activity, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';
import { DashboardAnalyticsService, DashboardMetrics } from '@/lib/dashboard-analytics';
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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

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
    
    // Calculate dashboard metrics
    const dashboardMetrics = DashboardAnalyticsService.calculateMetrics();
    setMetrics(dashboardMetrics);
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
      
      // Update metrics after sync
      const updatedMetrics = DashboardAnalyticsService.calculateMetrics();
      setMetrics(updatedMetrics);
      
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

      {/* Alerts Section */}
      {metrics?.alerts && metrics.alerts.length > 0 && (
        <div className="mb-6">
          <div className="space-y-2">
            {metrics.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                    : 'bg-blue-50 border-blue-500 text-blue-700'
                }`}
              >
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <h4 className="font-semibold">{alert.title}</h4>
                  {alert.count && (
                    <span className="ml-2 text-sm bg-white/50 px-2 py-1 rounded">
                      {alert.count}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {metrics?.todayCallsProgress && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Completate: {metrics.todayCallsProgress.completed}/{metrics.todayCallsProgress.scheduled}</span>
                  <span>{metrics.todayCallsProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${metrics.todayCallsProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
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

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Quick Stats Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Statistiche Veloci
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.quickStats && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tasso Completamento</span>
                  <span className="font-semibold">{metrics.quickStats.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Durata Media Call</span>
                  <span className="font-semibold">{metrics.quickStats.avgCallDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Call Questo Mese</span>
                  <span className="font-semibold">{metrics.quickStats.totalCallsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tempo Risposta</span>
                  <span className="font-semibold">{metrics.quickStats.avgResponseTime} gg</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Employees Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Top Dipendenti
            </CardTitle>
            <CardDescription>Per numero di call</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.topEmployees.slice(0, 3).map((emp, idx) => (
                <div key={emp.employee.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                      idx === 1 ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {emp.employee.nome} {emp.employee.cognome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.totalCalls} call • {emp.completionRate}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )) || <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>}
            </div>
          </CardContent>
        </Card>

        {/* Outcomes Trend Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Esiti Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics?.outcomesTrend.slice(0, 4).map((outcome) => (
                <div key={outcome.outcome} className="flex items-center justify-between">
                  <span className="text-sm truncate">{outcome.outcome}</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{outcome.count}</span>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${outcome.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) || <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>}
            </div>
          </CardContent>
        </Card>

        {/* Digest Status Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Digest Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.digestStatus && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stato</span>
                  <span className={`text-sm font-semibold ${
                    metrics.digestStatus.enabled ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {metrics.digestStatus.enabled ? 'Attivi' : 'Disabilitati'}
                  </span>
                </div>
                
                {metrics.digestStatus.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Frequenza</span>
                      <span className="text-sm font-semibold capitalize">
                        {metrics.digestStatus.frequency === 'daily' ? 'Giornaliero' : 'Settimanale'}
                      </span>
                    </div>
                    
                    {metrics.digestStatus.nextDigest && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prossimo</span>
                        <span className="text-sm font-semibold">
                          {new Date(metrics.digestStatus.nextDigest).toLocaleString('it-IT', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {metrics.digestStatus.lastSent && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ultimo invio</span>
                        <span className="text-sm font-semibold text-green-600">
                          {new Date(metrics.digestStatus.lastSent).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => router.push('/settings')}
                >
                  Configura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Calls Alert */}
      {metrics?.overdueCalls && metrics.overdueCalls.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Call in Ritardo ({metrics.overdueCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.overdueCalls.slice(0, 3).map((item) => (
                <div key={item.call.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div>
                    <p className="font-medium text-sm">
                      {item.employee.nome} {item.employee.cognome}
                    </p>
                    <p className="text-xs text-red-600">
                      {item.daysOverdue} giorni di ritardo
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => viewCallDetails(item.call.id)}
                    className="text-red-600 border-red-200"
                  >
                    Completa
                  </Button>
                </div>
              ))}
              {metrics.overdueCalls.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{metrics.overdueCalls.length - 3} altre call in ritardo
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
