'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  TrendingUp, 
  Target, 
  UserX,
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Award,
  ArrowRight,
  Calendar,
  MessageSquare,
  Download,
  Eye
} from 'lucide-react';
import { onboardingWorkflowEngine } from '@/lib/onboarding-workflow-engine';
import { performanceTrackingEngine } from '@/lib/performance-tracking-engine';
import { careerDevelopmentEngine } from '@/lib/career-development-engine';
import { offboardingProcessEngine } from '@/lib/offboarding-process-engine';
import { LocalStorage } from '@/lib/storage';
import { Employee, OnboardingTask, CareerGoal, DevelopmentPlan, LifecycleMetrics, OnboardingWorkflow, PerformanceData, OffboardingProcess } from '@/types';
import { toast } from 'sonner';
import { employeeLifecycleCRUD } from '@/lib/employee-lifecycle-crud';
import { OnboardingModal } from './modals/onboarding-modal';
import { PerformanceModal } from './modals/performance-modal';
import { DevelopmentModal } from './modals/development-modal';
import { OffboardingModal } from './modals/offboarding-modal';

interface LifecycleStats {
  onboarding: number;
  active: number;
  development: number;
  retention: number;
  offboarding: number;
  alumni: number;
  totalEmployees: number;
}

interface OnboardingStats {
  activeOnboardings: number;
  averageProgress: number;
  overdueTasksCount: number;
  completedThisMonth: number;
}

export function EmployeeLifecycleDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [lifecycleStats, setLifecycleStats] = useState<LifecycleStats | null>(null);
  const [onboardingStats, setOnboardingStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal states
  const [onboardingModal, setOnboardingModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    workflow?: OnboardingWorkflow | null;
    employee?: Employee;
  }>({ isOpen: false, mode: 'create' });

  const [performanceModal, setPerformanceModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: PerformanceData | null;
    employee?: Employee;
  }>({ isOpen: false, mode: 'create' });

  const [developmentModal, setDevelopmentModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    plan?: DevelopmentPlan | null;
    employee?: Employee;
  }>({ isOpen: false, mode: 'create' });

  const [offboardingModal, setOffboardingModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    process?: OffboardingProcess | null;
    employee?: Employee;
  }>({ isOpen: false, mode: 'create' });

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const allEmployees = LocalStorage.getEmployees();
      setEmployees(allEmployees);
      
      // Calculate lifecycle stats
      const stats = calculateLifecycleStats(allEmployees);
      setLifecycleStats(stats);

      // Get onboarding stats
      const onboardingData = onboardingWorkflowEngine.getOnboardingDashboardStats();
      setOnboardingStats(onboardingData);
      
    } catch (error) {
      console.error('Error loading lifecycle data:', error);
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const calculateLifecycleStats = (employees: Employee[]): LifecycleStats => {
    const stats: LifecycleStats = {
      onboarding: 0,
      active: 0,
      development: 0,
      retention: 0,
      offboarding: 0,
      alumni: 0,
      totalEmployees: employees.length
    };

    employees.forEach(emp => {
      switch (emp.lifecycleStage) {
        case 'onboarding':
          stats.onboarding++;
          break;
        case 'active':
          stats.active++;
          break;
        case 'development':
          stats.development++;
          break;
        case 'retention':
          stats.retention++;
          break;
        case 'offboarding':
          stats.offboarding++;
          break;
        case 'alumni':
          stats.alumni++;
          break;
        default:
          if (emp.isActive) {
            stats.active++;
          } else {
            stats.alumni++;
          }
      }
    });

    return stats;
  };

  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      onboarding: 'bg-blue-500',
      active: 'bg-green-500',
      development: 'bg-purple-500',
      retention: 'bg-orange-500',
      offboarding: 'bg-red-500',
      alumni: 'bg-gray-500'
    };
    return colors[stage] || 'bg-gray-300';
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'onboarding':
        return <UserPlus className="h-5 w-5" />;
      case 'active':
        return <Users className="h-5 w-5" />;
      case 'development':
        return <TrendingUp className="h-5 w-5" />;
      case 'retention':
        return <Target className="h-5 w-5" />;
      case 'offboarding':
        return <UserX className="h-5 w-5" />;
      case 'alumni':
        return <Award className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  // Modal helper functions
  const openOnboardingModal = (mode: 'create' | 'edit' | 'view', workflow?: OnboardingWorkflow, employee?: Employee) => {
    setOnboardingModal({
      isOpen: true,
      mode,
      workflow: workflow || null,
      employee
    });
  };

  const openPerformanceModal = (mode: 'create' | 'edit' | 'view', data?: PerformanceData, employee?: Employee) => {
    setPerformanceModal({
      isOpen: true,
      mode,
      data: data || null,
      employee
    });
  };

  const openDevelopmentModal = (mode: 'create' | 'edit' | 'view', plan?: DevelopmentPlan, employee?: Employee) => {
    setDevelopmentModal({
      isOpen: true,
      mode,
      plan: plan || null,
      employee
    });
  };

  const openOffboardingModal = (mode: 'create' | 'edit' | 'view', process?: OffboardingProcess, employee?: Employee) => {
    setOffboardingModal({
      isOpen: true,
      mode,
      process: process || null,
      employee
    });
  };

  const closeModals = () => {
    setOnboardingModal({ isOpen: false, mode: 'create' });
    setPerformanceModal({ isOpen: false, mode: 'create' });
    setDevelopmentModal({ isOpen: false, mode: 'create' });
    setOffboardingModal({ isOpen: false, mode: 'create' });
    // Refresh data after modal close
    loadData();
  };

  const handleStartOnboarding = async (employeeId: string) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      await onboardingWorkflowEngine.initializeOnboardingWorkflow(employee);
      toast.success('Workflow di onboarding avviato');
      loadData();
    } catch (error) {
      toast.error('Errore nell\'avvio dell\'onboarding');
    }
  };

  const handleCreateDevelopmentPlan = async (employeeId: string) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      await careerDevelopmentEngine.initializeDevelopmentPlan(employee, 2000);
      toast.success('Piano di sviluppo creato');
      loadData();
    } catch (error) {
      toast.error('Errore nella creazione del piano di sviluppo');
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
          <h1 className="text-3xl font-bold text-gray-900">Employee Lifecycle Management</h1>
          <p className="text-gray-600">Gestione completa del ciclo di vita del dipendente</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Aggiorna Dati
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {lifecycleStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('onboarding')} text-white mr-3`}>
                  {getStageIcon('onboarding')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Onboarding</p>
                  <p className="text-2xl font-bold">{lifecycleStats.onboarding}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('active')} text-white mr-3`}>
                  {getStageIcon('active')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Attivi</p>
                  <p className="text-2xl font-bold">{lifecycleStats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('development')} text-white mr-3`}>
                  {getStageIcon('development')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Sviluppo</p>
                  <p className="text-2xl font-bold">{lifecycleStats.development}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('retention')} text-white mr-3`}>
                  {getStageIcon('retention')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Retention</p>
                  <p className="text-2xl font-bold">{lifecycleStats.retention}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('offboarding')} text-white mr-3`}>
                  {getStageIcon('offboarding')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Offboarding</p>
                  <p className="text-2xl font-bold">{lifecycleStats.offboarding}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${getStageColor('alumni')} text-white mr-3`}>
                  {getStageIcon('alumni')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Alumni</p>
                  <p className="text-2xl font-bold">{lifecycleStats.alumni}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="onboarding">
            Onboarding
            {onboardingStats && onboardingStats.activeOnboardings > 0 && (
              <Badge variant="secondary" className="ml-2">
                {onboardingStats.activeOnboardings}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="development">Sviluppo</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
        </TabsList>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      Onboarding in Corso
                    </CardTitle>
                    <CardDescription>
                      Dipendenti attualmente in fase di onboarding
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openOnboardingModal('create')}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Nuovo Onboarding
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {onboardingStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{onboardingStats.activeOnboardings}</p>
                        <p className="text-sm text-gray-600">Attivi</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{onboardingStats.averageProgress}%</p>
                        <p className="text-sm text-gray-600">Progresso Medio</p>
                      </div>
                    </div>
                    
                    {onboardingStats.overdueTasksCount > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            {onboardingStats.overdueTasksCount} task in ritardo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {employees
                    .filter(e => e.lifecycleStage === 'onboarding')
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{employee.nome} {employee.cognome}</p>
                            <p className="text-sm text-gray-600">{employee.posizione} - {employee.dipartimento}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${employee.onboardingProgress || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">{employee.onboardingProgress || 0}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEmployee(employee)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Dettagli
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openOnboardingModal('edit', null, employee)}
                          >
                            Modifica
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                  {employees.filter(e => e.lifecycleStage === 'onboarding').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nessun dipendente in onboarding</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Azioni Richieste
                </CardTitle>
                <CardDescription>
                  Dipendenti che necessitano di interventi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(e => e.isActive && (!e.lifecycleStage || e.lifecycleStage === 'active'))
                    .slice(0, 5)
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{employee.nome} {employee.cognome}</p>
                          <p className="text-sm text-gray-600">{employee.posizione}</p>
                          <p className="text-xs text-orange-600">Pronto per onboarding avanzato</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartOnboarding(employee.id)}
                        >
                          Avvia
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">7.8</p>
                    <p className="text-sm text-gray-600">Rating Medio</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Performance {'>'} 8</span>
                      <span className="font-medium text-green-600">
                        {employees.filter(e => (e.performanceScore || 0) > 8).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Performance 6-8</span>
                      <span className="font-medium text-yellow-600">
                        {employees.filter(e => (e.performanceScore || 0) >= 6 && (e.performanceScore || 0) <= 8).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Performance {'<'} 6</span>
                      <span className="font-medium text-red-600">
                        {employees.filter(e => (e.performanceScore || 0) < 6 && (e.performanceScore || 0) > 0).length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Review in Scadenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(e => e.isActive)
                    .slice(0, 3)
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{employee.nome} {employee.cognome}</p>
                          <p className="text-xs text-gray-600">Review annuale</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          30 giorni
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Performance Critiche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(e => e.isActive && e.riskLevel === 'high')
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-2 border border-red-200 rounded bg-red-50">
                        <div>
                          <p className="text-sm font-medium">{employee.nome} {employee.cognome}</p>
                          <p className="text-xs text-gray-600">Score: {employee.performanceScore}/10</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          ALTO RISCHIO
                        </Badge>
                      </div>
                    ))}
                    
                  {employees.filter(e => e.isActive && e.riskLevel === 'high').length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">Nessuna performance critica</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Development Tab */}
        <TabsContent value="development" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Piani di Sviluppo
                    </CardTitle>
                    <CardDescription>
                      Dipendenti con piani di sviluppo attivi
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openDevelopmentModal('create')}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Nuovo Piano
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {employees.filter(e => e.developmentPlan?.status === 'active').length}
                      </p>
                      <p className="text-sm text-gray-600">Piani Attivi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">73%</p>
                      <p className="text-sm text-gray-600">Completamento Medio</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {employees
                      .filter(e => e.developmentPlan)
                      .slice(0, 5)
                      .map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{employee.nome} {employee.cognome}</p>
                            <p className="text-sm text-gray-600">{employee.posizione}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${employee.developmentPlan?.progress || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">{employee.developmentPlan?.progress || 0}%</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDevelopmentModal('view', employee.developmentPlan, employee)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Visualizza
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openDevelopmentModal('edit', employee.developmentPlan, employee)}
                            >
                              Modifica
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  Opportunità Sviluppo
                </CardTitle>
                <CardDescription>
                  Dipendenti pronti per crescita professionale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(e => e.isActive && !e.developmentPlan && (e.performanceScore || 0) >= 7)
                    .slice(0, 5)
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{employee.nome} {employee.cognome}</p>
                          <p className="text-sm text-gray-600">{employee.posizione}</p>
                          <p className="text-xs text-orange-600">Performance: {employee.performanceScore}/10</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateDevelopmentPlan(employee.id)}
                        >
                          Crea Piano
                        </Button>
                      </div>
                    ))}
                    
                  {employees.filter(e => e.isActive && !e.developmentPlan && (e.performanceScore || 0) >= 7).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nessuna opportunità immediata</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Offboarding Tab */}
        <TabsContent value="offboarding" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="h-5 w-5 text-red-600" />
                      Offboarding Attivi
                    </CardTitle>
                    <CardDescription>
                      Dipendenti in fase di uscita
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openOffboardingModal('create')}
                    className="gap-2"
                  >
                    <UserX className="h-4 w-4" />
                    Nuovo Offboarding
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees
                    .filter(e => e.lifecycleStage === 'offboarding')
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <p className="font-medium">{employee.nome} {employee.cognome}</p>
                          <p className="text-sm text-gray-600">{employee.posizione}</p>
                          <p className="text-xs text-red-600">
                            Ultimo giorno: {employee.offboardingDate ? new Date(employee.offboardingDate).toLocaleDateString('it-IT') : 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant="destructive">
                            {employee.offboardingReason || 'N/A'}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOffboardingModal('view', null, employee)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Visualizza
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openOffboardingModal('edit', null, employee)}
                            >
                              Modifica
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                  {employees.filter(e => e.lifecycleStage === 'offboarding').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>Nessun offboarding in corso</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Exit Interview Status
                </CardTitle>
                <CardDescription>
                  Stato dei colloqui di uscita
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">85%</p>
                    <p className="text-sm text-gray-600">Tasso Partecipazione</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Completati</span>
                      <span className="font-medium text-green-600">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Programmati</span>
                      <span className="font-medium text-blue-600">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Mancanti</span>
                      <span className="font-medium text-red-600">2</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {selectedEmployee.nome} {selectedEmployee.cognome}
              </h2>
              <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Posizione</p>
                  <p>{selectedEmployee.posizione}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dipartimento</p>
                  <p>{selectedEmployee.dipartimento}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Stato Lifecycle</p>
                <Badge className={`${getStageColor(selectedEmployee.lifecycleStage || 'active')} text-white`}>
                  {selectedEmployee.lifecycleStage || 'active'}
                </Badge>
              </div>
              
              {selectedEmployee.onboardingProgress !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Progresso Onboarding</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${selectedEmployee.onboardingProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{selectedEmployee.onboardingProgress}%</span>
                  </div>
                </div>
              )}
              
              {selectedEmployee.performanceScore && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Performance Score</p>
                  <p className="text-lg font-bold text-green-600">{selectedEmployee.performanceScore}/10</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modals */}
      <OnboardingModal
        isOpen={onboardingModal.isOpen}
        onClose={closeModals}
        workflow={onboardingModal.workflow}
        employee={onboardingModal.employee}
        mode={onboardingModal.mode}
      />

      <PerformanceModal
        isOpen={performanceModal.isOpen}
        onClose={closeModals}
        performanceData={performanceModal.data}
        employee={performanceModal.employee}
        mode={performanceModal.mode}
      />

      <DevelopmentModal
        isOpen={developmentModal.isOpen}
        onClose={closeModals}
        developmentPlan={developmentModal.plan}
        employee={developmentModal.employee}
        mode={developmentModal.mode}
      />

      <OffboardingModal
        isOpen={offboardingModal.isOpen}
        onClose={closeModals}
        offboardingProcess={offboardingModal.process}
        employee={offboardingModal.employee}
        mode={offboardingModal.mode}
      />
    </div>
  );
}