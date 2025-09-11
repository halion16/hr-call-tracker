import { Employee, OnboardingTask, TaskResource, LifecycleMetrics, OnboardingMetrics } from '@/types';
import { LocalStorage } from './storage';
import { generateId } from './utils';
import { smartNotificationService } from './smart-notification-service';

/**
 * Onboarding Workflow Engine - Sistema automatizzato per gestione onboarding nuovi dipendenti
 * Orchestrazione completa del processo di inserimento con task personalizzati
 */
export class OnboardingWorkflowEngine {
  private static instance: OnboardingWorkflowEngine;
  private intervalId: NodeJS.Timeout | null = null;
  
  public static getInstance(): OnboardingWorkflowEngine {
    if (!this.instance) {
      this.instance = new OnboardingWorkflowEngine();
    }
    return this.instance;
  }

  /**
   * Inizializza workflow di onboarding per nuovo dipendente
   */
  public async initializeOnboardingWorkflow(employee: Employee): Promise<void> {
    try {
      console.log(`🚀 Initializing onboarding workflow for ${employee.nome} ${employee.cognome}`);
      
      // Aggiorna stato dipendente
      const updatedEmployee: Employee = {
        ...employee,
        lifecycleStage: 'onboarding',
        onboardingProgress: 0,
        onboardingTasks: this.generateOnboardingTasks(employee)
      };

      // Salva dipendente aggiornato
      this.updateEmployeeInStorage(updatedEmployee);

      // Genera notifica di benvenuto
      await this.sendWelcomeNotification(employee);

      // Pianifica check automatici
      this.scheduleOnboardingChecks(employee.id);

      console.log('✅ Onboarding workflow initialized successfully');
      
    } catch (error) {
      console.error('Error initializing onboarding workflow:', error);
      throw error;
    }
  }

  /**
   * Genera task di onboarding personalizzati basati su ruolo e dipartimento
   */
  private generateOnboardingTasks(employee: Employee): OnboardingTask[] {
    const baseTasks = this.getBaseTasks();
    const roleTasks = this.getRoleSpecificTasks(employee.posizione);
    const departmentTasks = this.getDepartmentSpecificTasks(employee.dipartimento);
    
    return [...baseTasks, ...roleTasks, ...departmentTasks].map((task, index) => ({
      ...task,
      id: generateId(),
      dueDate: this.calculateDueDate(index, task.priority),
      autoAssigned: true
    }));
  }

  /**
   * Task base comuni a tutti i dipendenti
   */
  private getBaseTasks(): Partial<OnboardingTask>[] {
    return [
      {
        title: 'Compilazione documenti HR',
        description: 'Completare tutta la documentazione HR necessaria per l\'assunzione',
        category: 'documentation',
        priority: 'high',
        resources: [
          {
            type: 'document',
            title: 'Contratto di lavoro',
            description: 'Firmare e restituire il contratto'
          },
          {
            type: 'document',
            title: 'Informativa Privacy GDPR',
            description: 'Leggere e accettare l\'informativa privacy'
          }
        ],
        status: 'pending'
      },
      {
        title: 'Setup account aziendali',
        description: 'Configurazione accessi email, Slack, e sistemi aziendali',
        category: 'system_access',
        priority: 'high',
        dependencies: ['documentation'],
        resources: [
          {
            type: 'link',
            title: 'Guida setup email',
            url: '/guides/email-setup'
          }
        ],
        status: 'pending'
      },
      {
        title: 'Formazione sicurezza sul lavoro',
        description: 'Corso obbligatorio su normative sicurezza e procedure di emergenza',
        category: 'training',
        priority: 'high',
        resources: [
          {
            type: 'video',
            title: 'Video formazione sicurezza',
            url: '/training/safety-course'
          }
        ],
        status: 'pending'
      },
      {
        title: 'Incontro con HR - Welcome Session',
        description: 'Sessione introduttiva con HR per orientamento aziendale',
        category: 'meeting',
        priority: 'high',
        resources: [
          {
            type: 'contact',
            title: 'Contatto HR',
            description: 'hr@company.com - Tel: +39 02 1234567'
          }
        ],
        status: 'pending'
      },
      {
        title: 'Tour degli uffici',
        description: 'Visita guidata delle sedi aziendali e presentazione colleghi',
        category: 'meeting',
        priority: 'medium',
        status: 'pending'
      },
      {
        title: 'Formazione cultura aziendale',
        description: 'Introduzione ai valori, mission e processi aziendali',
        category: 'training',
        priority: 'medium',
        resources: [
          {
            type: 'document',
            title: 'Company Handbook',
            description: 'Manuale dipendente con tutte le policy aziendali'
          }
        ],
        status: 'pending'
      }
    ];
  }

  /**
   * Task specifici per ruolo
   */
  private getRoleSpecificTasks(posizione: string): Partial<OnboardingTask>[] {
    const roleTasksMap: Record<string, Partial<OnboardingTask>[]> = {
      'Senior Developer': [
        {
          title: 'Setup ambiente di sviluppo',
          description: 'Configurazione IDE, repository Git, e strumenti di sviluppo',
          category: 'setup',
          priority: 'high',
          resources: [
            {
              type: 'document',
              title: 'Development Setup Guide',
              description: 'Guida completa setup ambiente dev'
            }
          ],
          status: 'pending'
        },
        {
          title: 'Code review delle best practices',
          description: 'Revisione standard di codifica e processi di review',
          category: 'training',
          priority: 'medium',
          status: 'pending'
        }
      ],
      'Marketing Manager': [
        {
          title: 'Accesso piattaforme marketing',
          description: 'Setup account Google Analytics, Facebook Ads, Marketing Tools',
          category: 'system_access',
          priority: 'high',
          status: 'pending'
        },
        {
          title: 'Briefing strategie marketing',
          description: 'Incontro con team per overview strategie e campagne in corso',
          category: 'meeting',
          priority: 'high',
          status: 'pending'
        }
      ],
      'HR Specialist': [
        {
          title: 'Formazione normative HR',
          description: 'Training su normative del lavoro e procedure HR aziendali',
          category: 'training',
          priority: 'high',
          status: 'pending'
        },
        {
          title: 'Accesso sistema HRIS',
          description: 'Configurazione accessi al sistema di gestione risorse umane',
          category: 'system_access',
          priority: 'high',
          status: 'pending'
        }
      ]
    };

    return roleTasksMap[posizione] || [];
  }

  /**
   * Task specifici per dipartimento
   */
  private getDepartmentSpecificTasks(dipartimento: string): Partial<OnboardingTask>[] {
    const deptTasksMap: Record<string, Partial<OnboardingTask>[]> = {
      'IT': [
        {
          title: 'Formazione protocolli IT',
          description: 'Training su sicurezza informatica e procedure IT aziendali',
          category: 'training',
          priority: 'high',
          status: 'pending'
        }
      ],
      'Marketing': [
        {
          title: 'Presentazione brand guidelines',
          description: 'Introduzione alle linee guida del brand e materiali marketing',
          category: 'training',
          priority: 'medium',
          status: 'pending'
        }
      ],
      'Sales': [
        {
          title: 'Training prodotti e servizi',
          description: 'Formazione approfondita su portfolio prodotti e servizi',
          category: 'training',
          priority: 'high',
          status: 'pending'
        }
      ]
    };

    return deptTasksMap[dipartimento] || [];
  }

  /**
   * Calcola data scadenza task basata su priorità
   */
  private calculateDueDate(taskIndex: number, priority: 'high' | 'medium' | 'low'): string {
    const now = new Date();
    const daysToAdd = priority === 'high' ? 3 : priority === 'medium' ? 7 : 14;
    const additionalDays = taskIndex * (priority === 'high' ? 1 : 2); // Spread tasks over time
    
    const dueDate = new Date(now.getTime() + (daysToAdd + additionalDays) * 24 * 60 * 60 * 1000);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Completa task di onboarding
   */
  public async completeOnboardingTask(employeeId: string, taskId: string, notes?: string): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const employee = employees.find(e => e.id === employeeId);
      
      if (!employee || !employee.onboardingTasks) {
        throw new Error('Employee or onboarding tasks not found');
      }

      const taskIndex = employee.onboardingTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      // Aggiorna task
      employee.onboardingTasks[taskIndex] = {
        ...employee.onboardingTasks[taskIndex],
        status: 'completed',
        completedDate: new Date().toISOString().split('T')[0],
        notes
      };

      // Calcola progresso
      const completedTasks = employee.onboardingTasks.filter(t => t.status === 'completed').length;
      const progress = Math.round((completedTasks / employee.onboardingTasks.length) * 100);
      
      employee.onboardingProgress = progress;

      // Controlla se onboarding completato
      if (progress === 100) {
        employee.lifecycleStage = 'active';
        await this.sendOnboardingCompletedNotification(employee);
      } else if (progress >= 50 && progress < 75) {
        await this.sendMidOnboardingCheckNotification(employee);
      }

      this.updateEmployeeInStorage(employee);
      
      console.log(`✅ Task "${employee.onboardingTasks[taskIndex].title}" completed for ${employee.nome}`);
      
    } catch (error) {
      console.error('Error completing onboarding task:', error);
      throw error;
    }
  }

  /**
   * Verifica task in scadenza e invia promemoria
   */
  public async checkOverdueTasks(): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const onboardingEmployees = employees.filter(e => 
        e.lifecycleStage === 'onboarding' && e.onboardingTasks
      );

      const now = new Date();
      
      for (const employee of onboardingEmployees) {
        if (!employee.onboardingTasks) continue;
        
        const overdueTasks = employee.onboardingTasks.filter(task => 
          task.status === 'pending' && 
          task.dueDate && 
          new Date(task.dueDate) < now
        );

        const dueSoonTasks = employee.onboardingTasks.filter(task => 
          task.status === 'pending' && 
          task.dueDate && 
          this.isDueSoon(task.dueDate, 2) // 2 giorni di anticipo
        );

        if (overdueTasks.length > 0) {
          await this.sendOverdueTasksNotification(employee, overdueTasks);
        }

        if (dueSoonTasks.length > 0) {
          await this.sendDueSoonTasksNotification(employee, dueSoonTasks);
        }
      }
      
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  }

  /**
   * Controlla se task è in scadenza
   */
  private isDueSoon(dueDate: string, daysAhead: number): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    const daysDifference = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDifference > 0 && daysDifference <= daysAhead;
  }

  /**
   * Ottieni metriche onboarding
   */
  public getOnboardingMetrics(): OnboardingMetrics {
    const employees = LocalStorage.getEmployees();
    const onboardingEmployees = employees.filter(e => 
      e.lifecycleStage === 'onboarding' || 
      (e.lifecycleStage === 'active' && e.onboardingTasks)
    );

    if (onboardingEmployees.length === 0) {
      return {
        averageTimeToProductivity: 0,
        completionRate: 0,
        satisfactionScore: 0,
        dropoutRate: 0,
        taskCompletionRates: []
      };
    }

    // Calcola metriche
    const completionRates = onboardingEmployees.map(e => e.onboardingProgress || 0);
    const averageCompletion = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;

    // Task completion rates per categoria
    const tasksByCategory: Record<string, { total: number, completed: number }> = {};
    
    onboardingEmployees.forEach(employee => {
      if (!employee.onboardingTasks) return;
      
      employee.onboardingTasks.forEach(task => {
        if (!tasksByCategory[task.category]) {
          tasksByCategory[task.category] = { total: 0, completed: 0 };
        }
        tasksByCategory[task.category].total++;
        if (task.status === 'completed') {
          tasksByCategory[task.category].completed++;
        }
      });
    });

    const taskCompletionRates = Object.entries(tasksByCategory).map(([category, stats]) => ({
      category,
      completionRate: Math.round((stats.completed / stats.total) * 100)
    }));

    return {
      averageTimeToProductivity: this.calculateAverageTimeToProductivity(onboardingEmployees),
      completionRate: Math.round(averageCompletion),
      satisfactionScore: 4.2, // Mock data - in real implementation would come from surveys
      dropoutRate: this.calculateDropoutRate(employees),
      taskCompletionRates
    };
  }

  /**
   * Calcola tempo medio per raggiungere produttività
   */
  private calculateAverageTimeToProductivity(employees: Employee[]): number {
    const completedOnboardings = employees.filter(e => 
      e.lifecycleStage === 'active' && e.onboardingProgress === 100
    );

    if (completedOnboardings.length === 0) return 0;

    const totalDays = completedOnboardings.reduce((sum, employee) => {
      const hireDate = new Date(employee.dataAssunzione);
      const now = new Date();
      const daysDiff = Math.ceil((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);

    return Math.round(totalDays / completedOnboardings.length);
  }

  /**
   * Calcola tasso di abbandono
   */
  private calculateDropoutRate(allEmployees: Employee[]): number {
    const recentHires = allEmployees.filter(e => {
      const hireDate = new Date(e.dataAssunzione);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return hireDate >= threeMonthsAgo;
    });

    if (recentHires.length === 0) return 0;

    const dropouts = recentHires.filter(e => !e.isActive).length;
    return Math.round((dropouts / recentHires.length) * 100);
  }

  /**
   * Invia notifica di benvenuto
   */
  private async sendWelcomeNotification(employee: Employee): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'onboarding_welcome',
      priority: 'high',
      title: `Benvenuto/a ${employee.nome}! 🎉`,
      message: `Il tuo percorso di onboarding è iniziato. Troverai tutte le attività da completare nel tuo dashboard personale.`,
      contextData: { employeeId: employee.id },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  /**
   * Invia notifica completamento onboarding
   */
  private async sendOnboardingCompletedNotification(employee: Employee): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'onboarding_completed',
      priority: 'medium',
      title: `Onboarding completato! 🚀`,
      message: `Congratulazioni ${employee.nome}! Hai completato con successo il percorso di onboarding. Benvenuto/a nel team!`,
      contextData: { employeeId: employee.id },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  /**
   * Invia notifica check intermedio
   */
  private async sendMidOnboardingCheckNotification(employee: Employee): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'onboarding_progress',
      priority: 'medium',
      title: `Ottimo progresso nell'onboarding! 💪`,
      message: `${employee.nome}, hai completato più della metà delle attività di onboarding. Continua così!`,
      contextData: { employeeId: employee.id, progress: employee.onboardingProgress },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true }
      ],
      autoGenerated: true
    });
  }

  /**
   * Invia notifica task scaduti
   */
  private async sendOverdueTasksNotification(employee: Employee, overdueTasks: OnboardingTask[]): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'onboarding_overdue',
      priority: 'urgent',
      title: `Attività onboarding scadute ⚠️`,
      message: `${employee.nome}, hai ${overdueTasks.length} attività di onboarding scadute. Ti consigliamo di completarle al più presto.`,
      contextData: { 
        employeeId: employee.id, 
        overdueCount: overdueTasks.length,
        tasks: overdueTasks.map(t => t.title)
      },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  /**
   * Invia notifica task in scadenza
   */
  private async sendDueSoonTasksNotification(employee: Employee, dueSoonTasks: OnboardingTask[]): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'onboarding_reminder',
      priority: 'medium',
      title: `Promemoria attività onboarding 📅`,
      message: `${employee.nome}, hai ${dueSoonTasks.length} attività di onboarding in scadenza nei prossimi giorni.`,
      contextData: { 
        employeeId: employee.id, 
        dueSoonCount: dueSoonTasks.length,
        tasks: dueSoonTasks.map(t => ({ title: t.title, dueDate: t.dueDate }))
      },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true }
      ],
      autoGenerated: true
    });
  }

  /**
   * Pianifica controlli automatici onboarding
   */
  private scheduleOnboardingChecks(employeeId: string): void {
    // Check ogni 24 ore per task scaduti
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(async () => {
      await this.checkOverdueTasks();
    }, 24 * 60 * 60 * 1000); // 24 ore
  }

  /**
   * Aggiorna dipendente nello storage
   */
  private updateEmployeeInStorage(employee: Employee): void {
    const employees = LocalStorage.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    
    if (index !== -1) {
      employees[index] = employee;
      LocalStorage.setEmployees(employees);
    }
  }

  /**
   * Ottieni task onboarding per dipendente
   */
  public getOnboardingTasksForEmployee(employeeId: string): OnboardingTask[] {
    const employees = LocalStorage.getEmployees();
    const employee = employees.find(e => e.id === employeeId);
    
    return employee?.onboardingTasks || [];
  }

  /**
   * Ottieni statistiche onboarding per dashboard
   */
  public getOnboardingDashboardStats() {
    const employees = LocalStorage.getEmployees();
    const onboardingEmployees = employees.filter(e => e.lifecycleStage === 'onboarding');
    
    const stats = {
      activeOnboardings: onboardingEmployees.length,
      averageProgress: 0,
      overdueTasksCount: 0,
      completedThisMonth: 0
    };

    if (onboardingEmployees.length > 0) {
      const totalProgress = onboardingEmployees.reduce((sum, e) => sum + (e.onboardingProgress || 0), 0);
      stats.averageProgress = Math.round(totalProgress / onboardingEmployees.length);

      // Conta task scaduti
      const now = new Date();
      stats.overdueTasksCount = onboardingEmployees.reduce((count, employee) => {
        if (!employee.onboardingTasks) return count;
        return count + employee.onboardingTasks.filter(task => 
          task.status === 'pending' && 
          task.dueDate && 
          new Date(task.dueDate) < now
        ).length;
      }, 0);
    }

    // Conta onboarding completati questo mese
    const thisMonth = new Date();
    thisMonth.setDate(1); // Primo del mese
    stats.completedThisMonth = employees.filter(e => 
      e.lifecycleStage === 'active' && 
      e.onboardingProgress === 100 &&
      new Date(e.dataAssunzione) >= thisMonth
    ).length;

    return stats;
  }

  /**
   * Ferma il motore e pulisce intervalli
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Export singleton instance
export const onboardingWorkflowEngine = OnboardingWorkflowEngine.getInstance();