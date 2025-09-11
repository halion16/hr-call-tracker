import {
  Employee,
  OnboardingTask,
  PerformanceReview,
  CareerGoal,
  DevelopmentPlan,
  OffboardingProcess,
  OnboardingWorkflow,
  PerformanceData,
  DevelopmentActivity,
  OffboardingChecklist
} from '@/types';
import { generateId } from './utils';

/**
 * Employee Lifecycle CRUD Service
 * Gestisce tutte le operazioni CRUD per il sistema di gestione del ciclo di vita dei dipendenti
 */
export class EmployeeLifecycleCRUD {
  private static instance: EmployeeLifecycleCRUD;
  
  // Storage keys
  private readonly ONBOARDING_KEY = 'hr-onboarding-workflows';
  private readonly PERFORMANCE_KEY = 'hr-performance-data';
  private readonly CAREER_DEVELOPMENT_KEY = 'hr-career-development';
  private readonly OFFBOARDING_KEY = 'hr-offboarding-processes';

  private constructor() {}

  static getInstance(): EmployeeLifecycleCRUD {
    if (!EmployeeLifecycleCRUD.instance) {
      EmployeeLifecycleCRUD.instance = new EmployeeLifecycleCRUD();
    }
    return EmployeeLifecycleCRUD.instance;
  }

  // ===========================================
  // ONBOARDING WORKFLOW CRUD
  // ===========================================

  /**
   * Ottieni tutti i workflow di onboarding
   */
  getAllOnboardingWorkflows(): OnboardingWorkflow[] {
    try {
      const stored = localStorage.getItem(this.ONBOARDING_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading onboarding workflows:', error);
      return [];
    }
  }

  /**
   * Ottieni workflow di onboarding per dipendente
   */
  getOnboardingWorkflowByEmployee(employeeId: string): OnboardingWorkflow | null {
    const workflows = this.getAllOnboardingWorkflows();
    return workflows.find(w => w.employeeId === employeeId) || null;
  }

  /**
   * Crea nuovo workflow di onboarding
   */
  createOnboardingWorkflow(data: Omit<OnboardingWorkflow, 'id' | 'createdAt' | 'updatedAt'>): OnboardingWorkflow {
    const workflow: OnboardingWorkflow = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const workflows = this.getAllOnboardingWorkflows();
    workflows.push(workflow);
    this.saveOnboardingWorkflows(workflows);
    
    return workflow;
  }

  /**
   * Aggiorna workflow di onboarding
   */
  updateOnboardingWorkflow(id: string, updates: Partial<OnboardingWorkflow>): OnboardingWorkflow | null {
    const workflows = this.getAllOnboardingWorkflows();
    const index = workflows.findIndex(w => w.id === id);
    
    if (index === -1) return null;
    
    workflows[index] = {
      ...workflows[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveOnboardingWorkflows(workflows);
    return workflows[index];
  }

  /**
   * Elimina workflow di onboarding
   */
  deleteOnboardingWorkflow(id: string): boolean {
    const workflows = this.getAllOnboardingWorkflows();
    const filtered = workflows.filter(w => w.id !== id);
    
    if (filtered.length === workflows.length) return false;
    
    this.saveOnboardingWorkflows(filtered);
    return true;
  }

  /**
   * Aggiorna task di onboarding
   */
  updateOnboardingTask(workflowId: string, taskId: string, updates: Partial<OnboardingTask>): OnboardingTask | null {
    const workflow = this.getOnboardingWorkflow(workflowId);
    if (!workflow) return null;

    const taskIndex = workflow.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    workflow.tasks[taskIndex] = {
      ...workflow.tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.updateOnboardingWorkflow(workflowId, { tasks: workflow.tasks });
    return workflow.tasks[taskIndex];
  }

  /**
   * Aggiungi task al workflow di onboarding
   */
  addOnboardingTask(workflowId: string, taskData: Omit<OnboardingTask, 'id' | 'createdAt' | 'updatedAt'>): OnboardingTask | null {
    const workflow = this.getOnboardingWorkflow(workflowId);
    if (!workflow) return null;

    const task: OnboardingTask = {
      id: generateId(),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    workflow.tasks.push(task);
    this.updateOnboardingWorkflow(workflowId, { tasks: workflow.tasks });
    
    return task;
  }

  private getOnboardingWorkflow(id: string): OnboardingWorkflow | null {
    const workflows = this.getAllOnboardingWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  private saveOnboardingWorkflows(workflows: OnboardingWorkflow[]): void {
    localStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(workflows));
  }

  // ===========================================
  // PERFORMANCE TRACKING CRUD
  // ===========================================

  /**
   * Ottieni tutti i dati di performance
   */
  getAllPerformanceData(): PerformanceData[] {
    try {
      const stored = localStorage.getItem(this.PERFORMANCE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading performance data:', error);
      return [];
    }
  }

  /**
   * Ottieni performance data per dipendente
   */
  getPerformanceDataByEmployee(employeeId: string): PerformanceData[] {
    const allData = this.getAllPerformanceData();
    return allData.filter(p => p.employeeId === employeeId);
  }

  /**
   * Crea nuovo record di performance
   */
  createPerformanceData(data: Omit<PerformanceData, 'id' | 'createdAt' | 'updatedAt'>): PerformanceData {
    const performanceData: PerformanceData = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allData = this.getAllPerformanceData();
    allData.push(performanceData);
    this.savePerformanceData(allData);
    
    return performanceData;
  }

  /**
   * Aggiorna dati di performance
   */
  updatePerformanceData(id: string, updates: Partial<PerformanceData>): PerformanceData | null {
    const allData = this.getAllPerformanceData();
    const index = allData.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    allData[index] = {
      ...allData[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.savePerformanceData(allData);
    return allData[index];
  }

  /**
   * Elimina dati di performance
   */
  deletePerformanceData(id: string): boolean {
    const allData = this.getAllPerformanceData();
    const filtered = allData.filter(p => p.id !== id);
    
    if (filtered.length === allData.length) return false;
    
    this.savePerformanceData(filtered);
    return true;
  }

  /**
   * Crea review di performance
   */
  createPerformanceReview(data: Omit<PerformanceReview, 'id' | 'createdAt' | 'updatedAt'>): PerformanceReview {
    const review: PerformanceReview = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Aggiungi la review ai dati di performance del dipendente
    const performanceData = this.getPerformanceDataByEmployee(data.employeeId);
    let employeePerformance = performanceData[0];
    
    if (!employeePerformance) {
      employeePerformance = this.createPerformanceData({
        employeeId: data.employeeId,
        currentScore: 0,
        reviews: [review],
        goals: [],
        skillAssessments: [],
        feedback: []
      });
    } else {
      employeePerformance.reviews.push(review);
      this.updatePerformanceData(employeePerformance.id, { reviews: employeePerformance.reviews });
    }
    
    return review;
  }

  private savePerformanceData(data: PerformanceData[]): void {
    localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(data));
  }

  // ===========================================
  // CAREER DEVELOPMENT CRUD
  // ===========================================

  /**
   * Ottieni tutti i piani di sviluppo
   */
  getAllDevelopmentPlans(): DevelopmentPlan[] {
    try {
      const stored = localStorage.getItem(this.CAREER_DEVELOPMENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading development plans:', error);
      return [];
    }
  }

  /**
   * Ottieni piano di sviluppo per dipendente
   */
  getDevelopmentPlanByEmployee(employeeId: string): DevelopmentPlan | null {
    const plans = this.getAllDevelopmentPlans();
    return plans.find(p => p.employeeId === employeeId) || null;
  }

  /**
   * Crea nuovo piano di sviluppo
   */
  createDevelopmentPlan(data: Omit<DevelopmentPlan, 'id' | 'createdAt' | 'updatedAt'>): DevelopmentPlan {
    const plan: DevelopmentPlan = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const plans = this.getAllDevelopmentPlans();
    plans.push(plan);
    this.saveDevelopmentPlans(plans);
    
    return plan;
  }

  /**
   * Aggiorna piano di sviluppo
   */
  updateDevelopmentPlan(id: string, updates: Partial<DevelopmentPlan>): DevelopmentPlan | null {
    const plans = this.getAllDevelopmentPlans();
    const index = plans.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    plans[index] = {
      ...plans[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveDevelopmentPlans(plans);
    return plans[index];
  }

  /**
   * Elimina piano di sviluppo
   */
  deleteDevelopmentPlan(id: string): boolean {
    const plans = this.getAllDevelopmentPlans();
    const filtered = plans.filter(p => p.id !== id);
    
    if (filtered.length === plans.length) return false;
    
    this.saveDevelopmentPlans(filtered);
    return true;
  }

  /**
   * Crea nuovo obiettivo di carriera
   */
  createCareerGoal(planId: string, goalData: Omit<CareerGoal, 'id' | 'createdAt' | 'updatedAt'>): CareerGoal | null {
    const plan = this.getDevelopmentPlan(planId);
    if (!plan) return null;

    const goal: CareerGoal = {
      id: generateId(),
      ...goalData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    plan.careerGoals.push(goal);
    this.updateDevelopmentPlan(planId, { careerGoals: plan.careerGoals });
    
    return goal;
  }

  /**
   * Aggiungi attività di sviluppo
   */
  addDevelopmentActivity(planId: string, activityData: Omit<DevelopmentActivity, 'id' | 'createdAt' | 'updatedAt'>): DevelopmentActivity | null {
    const plan = this.getDevelopmentPlan(planId);
    if (!plan) return null;

    const activity: DevelopmentActivity = {
      id: generateId(),
      ...activityData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    plan.activities.push(activity);
    this.updateDevelopmentPlan(planId, { activities: plan.activities });
    
    return activity;
  }

  private getDevelopmentPlan(id: string): DevelopmentPlan | null {
    const plans = this.getAllDevelopmentPlans();
    return plans.find(p => p.id === id) || null;
  }

  private saveDevelopmentPlans(plans: DevelopmentPlan[]): void {
    localStorage.setItem(this.CAREER_DEVELOPMENT_KEY, JSON.stringify(plans));
  }

  // ===========================================
  // OFFBOARDING PROCESS CRUD
  // ===========================================

  /**
   * Ottieni tutti i processi di offboarding
   */
  getAllOffboardingProcesses(): OffboardingProcess[] {
    try {
      const stored = localStorage.getItem(this.OFFBOARDING_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading offboarding processes:', error);
      return [];
    }
  }

  /**
   * Ottieni processo di offboarding per dipendente
   */
  getOffboardingProcessByEmployee(employeeId: string): OffboardingProcess | null {
    const processes = this.getAllOffboardingProcesses();
    return processes.find(p => p.employeeId === employeeId) || null;
  }

  /**
   * Crea nuovo processo di offboarding
   */
  createOffboardingProcess(data: Omit<OffboardingProcess, 'id' | 'createdAt' | 'updatedAt'>): OffboardingProcess {
    const process: OffboardingProcess = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const processes = this.getAllOffboardingProcesses();
    processes.push(process);
    this.saveOffboardingProcesses(processes);
    
    return process;
  }

  /**
   * Aggiorna processo di offboarding
   */
  updateOffboardingProcess(id: string, updates: Partial<OffboardingProcess>): OffboardingProcess | null {
    const processes = this.getAllOffboardingProcesses();
    const index = processes.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    processes[index] = {
      ...processes[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveOffboardingProcesses(processes);
    return processes[index];
  }

  /**
   * Elimina processo di offboarding
   */
  deleteOffboardingProcess(id: string): boolean {
    const processes = this.getAllOffboardingProcesses();
    const filtered = processes.filter(p => p.id !== id);
    
    if (filtered.length === processes.length) return false;
    
    this.saveOffboardingProcesses(filtered);
    return true;
  }

  /**
   * Aggiorna item della checklist di offboarding
   */
  updateOffboardingChecklistItem(processId: string, itemId: string, updates: Partial<OffboardingChecklist>): OffboardingChecklist | null {
    const process = this.getOffboardingProcess(processId);
    if (!process) return null;

    const itemIndex = process.checklist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return null;

    process.checklist[itemIndex] = {
      ...process.checklist[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.updateOffboardingProcess(processId, { checklist: process.checklist });
    return process.checklist[itemIndex];
  }

  private getOffboardingProcess(id: string): OffboardingProcess | null {
    const processes = this.getAllOffboardingProcesses();
    return processes.find(p => p.id === id) || null;
  }

  private saveOffboardingProcesses(processes: OffboardingProcess[]): void {
    localStorage.setItem(this.OFFBOARDING_KEY, JSON.stringify(processes));
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Ottieni statistiche generali del lifecycle
   */
  getLifecycleStats() {
    const onboarding = this.getAllOnboardingWorkflows();
    const performance = this.getAllPerformanceData();
    const development = this.getAllDevelopmentPlans();
    const offboarding = this.getAllOffboardingProcesses();

    return {
      onboarding: {
        total: onboarding.length,
        active: onboarding.filter(w => w.status === 'in_progress').length,
        completed: onboarding.filter(w => w.status === 'completed').length
      },
      performance: {
        total: performance.length,
        averageScore: performance.reduce((sum, p) => sum + p.currentScore, 0) / performance.length || 0
      },
      development: {
        total: development.length,
        active: development.filter(p => p.status === 'active').length
      },
      offboarding: {
        total: offboarding.length,
        active: offboarding.filter(p => p.status === 'in_progress').length,
        completed: offboarding.filter(p => p.status === 'completed').length
      }
    };
  }

  /**
   * Pulisci dati vecchi (oltre 90 giorni per offboarding completato)
   */
  cleanupOldData(): void {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Cleanup offboarding completato
    const offboarding = this.getAllOffboardingProcesses();
    const filteredOffboarding = offboarding.filter(p => 
      p.status !== 'completed' || new Date(p.updatedAt) > ninetyDaysAgo
    );
    
    if (filteredOffboarding.length !== offboarding.length) {
      this.saveOffboardingProcesses(filteredOffboarding);
    }
  }

  /**
   * Esporta tutti i dati del lifecycle
   */
  exportAllData() {
    return {
      onboarding: this.getAllOnboardingWorkflows(),
      performance: this.getAllPerformanceData(),
      development: this.getAllDevelopmentPlans(),
      offboarding: this.getAllOffboardingProcesses(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Importa dati del lifecycle
   */
  importData(data: {
    onboarding?: OnboardingWorkflow[];
    performance?: PerformanceData[];
    development?: DevelopmentPlan[];
    offboarding?: OffboardingProcess[];
  }): void {
    if (data.onboarding) {
      this.saveOnboardingWorkflows(data.onboarding);
    }
    if (data.performance) {
      this.savePerformanceData(data.performance);
    }
    if (data.development) {
      this.saveDevelopmentPlans(data.development);
    }
    if (data.offboarding) {
      this.saveOffboardingProcesses(data.offboarding);
    }
  }
}

// Export singleton instance
export const employeeLifecycleCRUD = EmployeeLifecycleCRUD.getInstance();