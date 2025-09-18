'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Calendar, 
  Bell, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Target,
  Zap,
  BarChart3,
  Activity,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { autoSchedulingEngine } from '@/lib/auto-scheduling-engine';
import { smartNotificationService } from '@/lib/smart-notification-service';
import { workflowOrchestrator } from '@/lib/workflow-orchestrator';
import { LocalStorage } from '@/lib/storage';
import { SchedulingSuggestion, SmartNotification, Employee } from '@/types';
import { toast } from 'sonner';

interface WorkflowStats {
  activeEmployees: number;
  highRiskEmployees: number;
  pendingSuggestions: number;
  pendingNotifications: number;
  completedCallsThisWeek: number;
  lastAnalysis: Date;
}

export function WorkflowDashboard() {
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [orchestratorStatus, setOrchestratorStatus] = useState({ isRunning: false });
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [
        pendingSuggestions,
        allNotifications,
        status,
        workflowStats,
        allEmployees
      ] = await Promise.all([
        autoSchedulingEngine.getPendingSuggestions(),
        smartNotificationService.getAllNotifications(),
        workflowOrchestrator.getStatus(),
        workflowOrchestrator.getWorkflowStats(),
        LocalStorage.getEmployees()
      ]);

      setSuggestions(pendingSuggestions);
      setNotifications(allNotifications.slice(0, 10)); // Latest 10
      setOrchestratorStatus(status);
      setStats(workflowStats);
      setEmployees(allEmployees);
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      await autoSchedulingEngine.acceptSuggestion(suggestionId);
      toast.success('Suggerimento accettato e call programmata');
      loadData();
    } catch (error) {
      toast.error('Errore nell\'accettare il suggerimento');
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    autoSchedulingEngine.dismissSuggestion(suggestionId);
    toast.success('Suggerimento respinto');
    loadData();
  };

  const handleRunAnalysis = async () => {
    try {
      setLoading(true);
      await workflowOrchestrator.runImmediateAnalysis();
      toast.success('Analisi completata');
      loadData();
    } catch (error) {
      toast.error('Errore nell\'analisi');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'destructive',
      high: 'orange',
      medium: 'blue',
      low: 'gray'
    };
    return colors[priority as keyof typeof colors] || 'gray';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return '📝';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600">Sistema intelligente di gestione automatica HR</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {orchestratorStatus.isRunning ? (
              <><PlayCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Attivo</span>
              </>
            ) : (
              <><PauseCircle className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">In pausa</span>
              </>
            )}
          </div>
          
          <Button onClick={handleRunAnalysis} variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            Analizza Ora
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dipendenti Attivi</p>
                  <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alto Rischio</p>
                  <p className="text-2xl font-bold">{stats.highRiskEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suggerimenti AI</p>
                  <p className="text-2xl font-bold">{stats.pendingSuggestions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Call Settimana</p>
                  <p className="text-2xl font-bold">{stats.completedCallsThisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suggestions">
            Suggerimenti AI
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifiche Smart
            {notifications.filter(n => n.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter(n => n.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="risks">Rischi Rilevati</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Suggerimenti Automatici di Scheduling
                  </CardTitle>
                  <CardDescription>
                    L'AI ha analizzato performance, scadenze e feedback per suggerire le call più importanti
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 px-6">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nessun suggerimento al momento</p>
                  <p className="text-sm">L'AI monitorerà continuamente e suggerirà call quando necessario</p>
                </div>
              ) : (
                <div className="h-[500px] overflow-y-auto px-6 pb-4">
                  <div className="space-y-3">
                    {suggestions.map((suggestion) => {
                      const employee = employees.find(e => e.id === suggestion.employeeId);
                      if (!employee) return null;

                      return (
                        <Card key={suggestion.id} className="border-l-4 border-l-purple-500 shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-sm">
                                    {employee.nome} {employee.cognome}
                                  </h3>
                                  <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                                    {getPriorityIcon(suggestion.priority)} {suggestion.priority.toUpperCase()}
                                  </Badge>
                                  <div className="text-xs text-gray-500">
                                    Confidenza: {Math.round(suggestion.confidence * 100)}%
                                  </div>
                                </div>

                                <div className="text-xs text-gray-600 mb-2 space-y-1">
                                  <p><strong>Suggerita per:</strong> {new Date(suggestion.suggestedDate).toLocaleDateString('it-IT')}</p>
                                  <p><strong>Dipartimento:</strong> {employee.dipartimento} - {employee.posizione}</p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs font-medium">Motivazioni:</p>
                                  <ul className="text-xs space-y-0.5">
                                    {suggestion.reasoning.slice(1).map((reason, index) => (
                                      <li key={index} className="flex items-start gap-1">
                                        <span className="text-purple-500 mt-0.5">•</span>
                                        <span className="leading-tight">{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {suggestion.triggers.map((trigger, index) => (
                                    <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                                      {trigger.type.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5 ml-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptSuggestion(suggestion.id)}
                                  className="bg-green-600 hover:bg-green-700 h-7 px-3 text-xs"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Accetta
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDismissSuggestion(suggestion.id)}
                                  className="h-7 px-3 text-xs"
                                >
                                  Rifiuta
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifiche Intelligenti
              </CardTitle>
              <CardDescription>
                Sistema di notifiche adattive basate sul contesto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4" />
                  <p>Nessuna notifica recente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="text-2xl">{getPriorityIcon(notification.priority)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge variant={getPriorityColor(notification.priority)} size="sm">
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(notification.createdAt).toLocaleDateString('it-IT')}</span>
                          <span>{notification.type}</span>
                          {notification.autoGenerated && (
                            <Badge variant="outline" size="sm">AUTO</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Analisi Rischi
              </CardTitle>
              <CardDescription>
                Dipendenti che necessitano attenzione immediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.filter(e => e.riskLevel === 'high' && e.isActive).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nessun dipendente ad alto rischio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees
                    .filter(e => e.riskLevel === 'high' && e.isActive)
                    .map((employee) => (
                      <Card key={employee.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{employee.nome} {employee.cognome}</h3>
                              <p className="text-sm text-gray-600">{employee.dipartimento} - {employee.posizione}</p>
                              <div className="flex gap-2 mt-2">
                                {employee.performanceScore && employee.performanceScore < 6 && (
                                  <Badge variant="destructive" size="sm">
                                    Performance: {employee.performanceScore}/10
                                  </Badge>
                                )}
                                {employee.contractExpiryDate && (
                                  <Badge variant="orange" size="sm">
                                    Contratto scade: {new Date(employee.contractExpiryDate).toLocaleDateString('it-IT')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant="destructive">ALTO RISCHIO</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Attività Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Orchestratore</span>
                    <Badge variant={orchestratorStatus.isRunning ? "default" : "secondary"}>
                      {orchestratorStatus.isRunning ? "Attivo" : "In pausa"}
                    </Badge>
                  </div>
                  
                  {stats && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ultima analisi</span>
                        <span className="text-xs text-gray-500">
                          {new Date(stats.lastAnalysis).toLocaleString('it-IT')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Suggerimenti generati</span>
                        <span className="font-medium">{stats.pendingSuggestions}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Notifiche inviate</span>
                        <span className="font-medium">{stats.pendingNotifications}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trend Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dipendenti Performance {'>'}  7</span>
                    <span className="font-medium text-green-600">
                      {employees.filter(e => e.performanceScore && e.performanceScore > 7).length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dipendenti Performance 5-7</span>
                    <span className="font-medium text-yellow-600">
                      {employees.filter(e => e.performanceScore && e.performanceScore >= 5 && e.performanceScore <= 7).length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dipendenti Performance {'<'} 5</span>
                    <span className="font-medium text-red-600">
                      {employees.filter(e => e.performanceScore && e.performanceScore < 5).length}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rating medio call</span>
                      <span className="font-medium">
                        {employees.length > 0 ? (
                          employees
                            .filter(e => e.averageCallRating)
                            .reduce((sum, e) => sum + (e.averageCallRating || 0), 0) / 
                          employees.filter(e => e.averageCallRating).length || 0
                        ).toFixed(1) : 'N/A'}/5
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}