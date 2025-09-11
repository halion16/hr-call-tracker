import { Employee, OffboardingProcess, OffboardingTask, ExitInterview, ExitFeedback, KnowledgeTransferItem, OffboardingMetrics } from '@/types';
import { LocalStorage } from './storage';
import { generateId } from './utils';
import { smartNotificationService } from './smart-notification-service';

/**
 * Offboarding Process Engine - Sistema gestione uscite dipendenti
 * Automatizza processo offboarding, exit interview, knowledge transfer e compliance
 */
export class OffboardingProcessEngine {
  private static instance: OffboardingProcessEngine;
  private intervalId: NodeJS.Timeout | null = null;
  
  public static getInstance(): OffboardingProcessEngine {
    if (!this.instance) {
      this.instance = new OffboardingProcessEngine();
    }
    return this.instance;
  }

  /**
   * Inizializza processo di offboarding per dipendente
   */
  public async initiateOffboarding(
    employeeId: string, 
    reason: 'resignation' | 'termination' | 'retirement' | 'end_of_contract' | 'redundancy',
    lastWorkingDay: string,
    initiatedBy: string
  ): Promise<string> {
    try {
      const employee = this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      console.log(`👋 Initiating offboarding process for ${employee.nome} ${employee.cognome}`);
      
      // Crea processo di offboarding
      const offboardingProcess = this.createOffboardingProcess(employee, reason, lastWorkingDay, initiatedBy);
      
      // Genera checklist personalizzata
      const checklist = this.generateOffboardingChecklist(employee, reason);
      offboardingProcess.checklist = checklist;
      
      // Genera knowledge transfer items
      const knowledgeTransfer = this.generateKnowledgeTransferItems(employee);
      offboardingProcess.knowledgeTransfer = knowledgeTransfer;
      
      // Salva processo
      this.saveOffboardingProcess(offboardingProcess);
      
      // Aggiorna stato dipendente
      const updatedEmployee: Employee = {
        ...employee,
        lifecycleStage: 'offboarding',
        offboardingReason: reason,
        offboardingDate: lastWorkingDay,
        isActive: false // Marca come inattivo
      };

      this.updateEmployeeInStorage(updatedEmployee);

      // Notifica inizio processo
      await this.sendOffboardingInitiatedNotification(employee, offboardingProcess);

      // Notifica manager e HR
      await this.notifyStakeholdersOffboarding(employee, offboardingProcess);

      // Pianifica exit interview
      await this.scheduleExitInterview(employee, offboardingProcess);

      // Avvia monitoraggio processo
      this.startOffboardingMonitoring(offboardingProcess.id);
      
      console.log('✅ Offboarding process initiated successfully');
      return offboardingProcess.id;
      
    } catch (error) {
      console.error('Error initiating offboarding:', error);
      throw error;
    }
  }

  /**
   * Crea processo di offboarding base
   */
  private createOffboardingProcess(
    employee: Employee, 
    reason: string, 
    lastWorkingDay: string, 
    initiatedBy: string
  ): OffboardingProcess {
    return {
      id: generateId(),
      employeeId: employee.id,
      initiatedBy,
      reason: reason as any,
      lastWorkingDay,
      checklist: [], // Sarà popolata dopo
      knowledgeTransfer: [], // Sarà popolata dopo
      status: 'initiated',
      progress: 0,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Genera checklist offboarding personalizzata
   */
  private generateOffboardingChecklist(employee: Employee, reason: string): OffboardingTask[] {
    const baseTasks = this.getBaseOffboardingTasks(employee, reason);
    const roleTasks = this.getRoleSpecificOffboardingTasks(employee);
    const departmentTasks = this.getDepartmentSpecificOffboardingTasks(employee);
    
    const allTasks = [...baseTasks, ...roleTasks, ...departmentTasks];
    
    return allTasks.map((task, index) => ({
      ...task,
      id: generateId(),
      dueDate: this.calculateTaskDueDate(employee.offboardingDate || employee.dataAssunzione, index, task.priority),
      status: 'pending'
    }));
  }

  /**
   * Task base comuni per tutti i dipendenti
   */
  private getBaseOffboardingTasks(employee: Employee, reason: string): Partial<OffboardingTask>[] {
    const baseTasks: Partial<OffboardingTask>[] = [
      {
        title: 'Comunicazione uscita al team',
        description: 'Informare il team e i collaboratori dell\'uscita del dipendente',
        category: 'hr',
        assignedTo: 'hr@company.com',
        priority: 'high'
      },
      {
        title: 'Disabilitazione accessi IT',
        description: 'Rimozione accessi a sistemi, email, VPN e applicazioni aziendali',
        category: 'it',
        assignedTo: 'it@company.com',
        priority: 'high'
      },
      {
        title: 'Restituzione dispositivi aziendali',
        description: 'Raccolta laptop, telefono, badge e altri asset aziendali',
        category: 'it',
        assignedTo: 'it@company.com',
        priority: 'high'
      },
      {
        title: 'Calcolo e pagamento TFR',
        description: 'Preparazione documentazione per liquidazione TFR e ratei',
        category: 'finance',
        assignedTo: 'payroll@company.com',
        priority: 'high'
      },
      {
        title: 'Aggiornamento documenti HR',
        description: 'Aggiornamento fascicolo personale e archivio dipendenti',
        category: 'hr',
        assignedTo: 'hr@company.com',
        priority: 'medium'
      },
      {
        title: 'Cancellazione da assicurazioni aziendali',
        description: 'Rimozione dalle polizze sanitarie e assicurative aziendali',
        category: 'hr',
        assignedTo: 'hr@company.com',
        priority: 'medium'
      }
    ];

    // Task aggiuntivi per dimissioni volontarie
    if (reason === 'resignation') {
      baseTasks.push({
        title: 'Processo exit interview',
        description: 'Conduzione colloquio di uscita per feedback e miglioramenti',
        category: 'hr',
        assignedTo: 'hr@company.com',
        priority: 'medium'
      });
    }

    return baseTasks;
  }

  /**
   * Task specifici per ruolo
   */
  private getRoleSpecificOffboardingTasks(employee: Employee): Partial<OffboardingTask>[] {
    const roleTasksMap: Record<string, Partial<OffboardingTask>[]> = {
      'Senior Developer': [
        {
          title: 'Documentazione codice e architetture',
          description: 'Completamento documentazione progetti e decisioni tecniche',
          category: 'knowledge_transfer',
          assignedTo: employee.id,
          priority: 'high'
        },
        {
          title: 'Trasferimento repository e accessi',
          description: 'Trasferimento ownership repository e documentazione accessi',
          category: 'it',
          assignedTo: 'tech-lead@company.com',
          priority: 'high'
        }
      ],
      'Marketing Manager': [
        {
          title: 'Trasferimento campagne e contatti',
          description: 'Passaggio di campagne attive e database contatti',
          category: 'knowledge_transfer',
          assignedTo: employee.id,
          priority: 'high'
        },
        {
          title: 'Brief fornitori e partner',
          description: 'Aggiornamento fornitori e partner sui cambiamenti',
          category: 'operations',
          assignedTo: employee.id,
          priority: 'medium'
        }
      ],
      'HR Specialist': [
        {
          title: 'Trasferimento pratiche HR in corso',
          description: 'Passaggio di procedure di selezione e pratiche dipendenti',
          category: 'knowledge_transfer',
          assignedTo: employee.id,
          priority: 'high'
        },
        {
          title: 'Aggiornamento policy e procedure',
          description: 'Documentazione processi HR e aggiornamento procedure',
          category: 'hr',
          assignedTo: employee.id,
          priority: 'medium'
        }
      ]
    };

    return roleTasksMap[employee.posizione] || [];
  }

  /**
   * Task specifici per dipartimento
   */
  private getDepartmentSpecificOffboardingTasks(employee: Employee): Partial<OffboardingTask>[] {
    const deptTasksMap: Record<string, Partial<OffboardingTask>[]> = {
      'IT': [
        {
          title: 'Backup dati personali',
          description: 'Backup e trasferimento dati di lavoro personali',
          category: 'it',
          assignedTo: 'it@company.com',
          priority: 'high'
        }
      ],
      'Sales': [
        {
          title: 'Trasferimento clienti e pipeline',
          description: 'Passaggio clienti e opportunità ad altro account manager',
          category: 'knowledge_transfer',
          assignedTo: employee.id,
          priority: 'high'
        }
      ]
    };

    return deptTasksMap[employee.dipartimento] || [];
  }

  /**
   * Genera knowledge transfer items
   */
  private generateKnowledgeTransferItems(employee: Employee): KnowledgeTransferItem[] {
    const commonItems = [
      {
        title: 'Contatti e relazioni chiave',
        description: 'Elenco contatti importanti e modalità di gestione relazioni',
        category: 'relationship' as const,
        priority: 'critical' as const,
        transferMethod: 'documentation' as const
      },
      {
        title: 'Progetti in corso',
        description: 'Status e documentazione progetti attualmente seguiti',
        category: 'project' as const,
        priority: 'critical' as const,
        transferMethod: 'meeting' as const
      },
      {
        title: 'Processi e workflow',
        description: 'Documentazione processi specifici e modalità operative',
        category: 'process' as const,
        priority: 'important' as const,
        transferMethod: 'documentation' as const
      }
    ];

    const roleItems = this.getRoleSpecificKnowledgeTransfer(employee.posizione);
    const allItems = [...commonItems, ...roleItems];

    return allItems.map(item => ({
      id: generateId(),
      title: item.title,
      description: item.description,
      category: item.category,
      transferTo: this.findKnowledgeTransferRecipient(employee, item.category),
      priority: item.priority,
      status: 'pending' as const,
      deadline: this.calculateKnowledgeTransferDeadline(employee.offboardingDate || new Date().toISOString().split('T')[0]),
      transferMethod: item.transferMethod
    }));
  }

  /**
   * Knowledge transfer specifico per ruolo
   */
  private getRoleSpecificKnowledgeTransfer(posizione: string): Array<{
    title: string,
    description: string,
    category: 'project' | 'process' | 'relationship' | 'system' | 'documentation',
    priority: 'critical' | 'important' | 'nice_to_have',
    transferMethod: 'documentation' | 'meeting' | 'shadowing' | 'training_session'
  }> {
    const roleKnowledgeMap: Record<string, Array<{
      title: string,
      description: string,
      category: 'project' | 'process' | 'relationship' | 'system' | 'documentation',
      priority: 'critical' | 'important' | 'nice_to_have',
      transferMethod: 'documentation' | 'meeting' | 'shadowing' | 'training_session'
    }>> = {
      'Senior Developer': [
        {
          title: 'Architetture sistemi critici',
          description: 'Documentazione architetture e decisioni tecniche',
          category: 'system',
          priority: 'critical',
          transferMethod: 'documentation'
        },
        {
          title: 'Deployment procedures',
          description: 'Processi di deploy e troubleshooting',
          category: 'process',
          priority: 'critical',
          transferMethod: 'training_session'
        }
      ],
      'Marketing Manager': [
        {
          title: 'Strategie campagne',
          description: 'Logiche e strategie delle campagne in corso',
          category: 'documentation',
          priority: 'critical',
          transferMethod: 'meeting'
        },
        {
          title: 'Relazioni media e influencer',
          description: 'Network contatti media e partnership',
          category: 'relationship',
          priority: 'important',
          transferMethod: 'meeting'
        }
      ]
    };

    return roleKnowledgeMap[posizione] || [];
  }

  /**
   * Completa task di offboarding
   */
  public async completeOffboardingTask(processId: string, taskId: string, notes?: string): Promise<void> {
    try {
      const process = this.getOffboardingProcess(processId);
      if (!process) {
        throw new Error('Offboarding process not found');
      }

      const taskIndex = process.checklist.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      // Completa task
      process.checklist[taskIndex].status = 'completed';
      process.checklist[taskIndex].completedDate = new Date().toISOString().split('T')[0];
      if (notes) process.checklist[taskIndex].notes = notes;

      // Aggiorna progress
      this.updateOffboardingProgress(process);

      this.saveOffboardingProcess(process);

      // Controlla se processo completato
      if (process.progress === 100) {
        await this.completeOffboardingProcess(process);
      }

      console.log(`✅ Offboarding task completed: ${process.checklist[taskIndex].title}`);
      
    } catch (error) {
      console.error('Error completing offboarding task:', error);
      throw error;
    }
  }

  /**
   * Conduce exit interview
   */
  public async conductExitInterview(
    employeeId: string,
    conductedBy: string,
    interviewData: {
      format: 'in_person' | 'video' | 'phone' | 'survey',
      overallSatisfaction: number,
      reasonForLeaving: string,
      wouldRecommend: boolean,
      feedback: ExitFeedback[],
      improvementSuggestions: string[],
      rehireEligible: boolean,
      notes?: string
    }
  ): Promise<string> {
    try {
      const employee = this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      const exitInterview: ExitInterview = {
        id: generateId(),
        employeeId,
        conductedBy,
        interviewDate: new Date().toISOString().split('T')[0],
        format: interviewData.format,
        overallSatisfaction: interviewData.overallSatisfaction,
        reasonForLeaving: interviewData.reasonForLeaving,
        wouldRecommend: interviewData.wouldRecommend,
        feedback: interviewData.feedback,
        improvementSuggestions: interviewData.improvementSuggestions,
        rehireEligible: interviewData.rehireEligible,
        notes: interviewData.notes,
        status: 'completed'
      };

      // Aggiorna dipendente
      const updatedEmployee: Employee = {
        ...employee,
        exitInterviewCompleted: true
      };

      this.updateEmployeeInStorage(updatedEmployee);

      // Salva exit interview (in implementazione reale in database separato)
      this.saveExitInterview(exitInterview);

      // Notifica completamento
      await this.sendExitInterviewCompletedNotification(employee);

      console.log(`📋 Exit interview completed for ${employee.nome} ${employee.cognome}`);
      return exitInterview.id;
      
    } catch (error) {
      console.error('Error conducting exit interview:', error);
      throw error;
    }
  }

  /**
   * Ottieni metriche offboarding
   */
  public getOffboardingMetrics(): OffboardingMetrics {
    const employees = LocalStorage.getEmployees();
    const offboardingEmployees = employees.filter(e => 
      e.lifecycleStage === 'offboarding' || 
      (e.lifecycleStage === 'alumni' && e.offboardingDate)
    );

    if (offboardingEmployees.length === 0) {
      return {
        averageProcessDuration: 0,
        exitInterviewParticipation: 0,
        knowledgeTransferCompletion: 0,
        rehireEligibilityRate: 0,
        reasonsForLeaving: []
      };
    }

    // Calcola durata media processo
    const completedProcesses = offboardingEmployees.filter(e => e.lifecycleStage === 'alumni');
    const avgDuration = completedProcesses.length > 0 
      ? completedProcesses.reduce((sum, emp) => {
          const startDate = new Date(emp.dataAssunzione);
          const endDate = new Date(emp.offboardingDate!);
          return sum + Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / completedProcesses.length
      : 0;

    // Exit interview participation
    const exitInterviewsCompleted = offboardingEmployees.filter(e => e.exitInterviewCompleted).length;
    const exitInterviewParticipation = (exitInterviewsCompleted / offboardingEmployees.length) * 100;

    // Reasons for leaving
    const reasonsCount: Record<string, number> = {};
    offboardingEmployees.forEach(emp => {
      if (emp.offboardingReason) {
        reasonsCount[emp.offboardingReason] = (reasonsCount[emp.offboardingReason] || 0) + 1;
      }
    });

    const reasonsForLeaving = Object.entries(reasonsCount).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / offboardingEmployees.length) * 100)
    }));

    return {
      averageProcessDuration: Math.round(avgDuration),
      exitInterviewParticipation: Math.round(exitInterviewParticipation),
      knowledgeTransferCompletion: 85, // Mock data
      rehireEligibilityRate: 70, // Mock data
      reasonsForLeaving
    };
  }

  /**
   * Helper methods
   */
  private calculateTaskDueDate(lastWorkingDay: string, taskIndex: number, priority: 'high' | 'medium' | 'low'): string {
    const lastDay = new Date(lastWorkingDay);
    
    // Task prioritari devono essere completati prima dell'ultimo giorno
    const daysOffset = priority === 'high' ? -5 : priority === 'medium' ? -2 : 2;
    const finalOffset = daysOffset - taskIndex; // Spread tasks
    
    lastDay.setDate(lastDay.getDate() + finalOffset);
    return lastDay.toISOString().split('T')[0];
  }

  private calculateKnowledgeTransferDeadline(lastWorkingDay: string): string {
    const lastDay = new Date(lastWorkingDay);
    lastDay.setDate(lastDay.getDate() - 3); // 3 giorni prima
    return lastDay.toISOString().split('T')[0];
  }

  private findKnowledgeTransferRecipient(employee: Employee, category: string): string {
    // Logica semplificata - in realtà dovrebbe trovare il miglior candidato
    const employees = LocalStorage.getEmployees();
    const sameTeam = employees.find(e => 
      e.isActive && 
      e.dipartimento === employee.dipartimento && 
      e.id !== employee.id
    );
    
    return sameTeam?.id || 'manager@company.com';
  }

  private updateOffboardingProgress(process: OffboardingProcess): void {
    const totalTasks = process.checklist.length + process.knowledgeTransfer.length;
    if (totalTasks === 0) return;

    const completedTasks = process.checklist.filter(t => t.status === 'completed').length +
                          process.knowledgeTransfer.filter(k => k.status === 'completed').length;
    
    process.progress = Math.round((completedTasks / totalTasks) * 100);
  }

  private async completeOffboardingProcess(process: OffboardingProcess): Promise<void> {
    process.status = 'completed';
    process.completedAt = new Date().toISOString();

    // Aggiorna dipendente a status alumni
    const employee = this.getEmployeeById(process.employeeId);
    if (employee) {
      const updatedEmployee: Employee = {
        ...employee,
        lifecycleStage: 'alumni'
      };
      this.updateEmployeeInStorage(updatedEmployee);
    }

    await this.sendOffboardingCompletedNotification(employee!, process);
  }

  private scheduleExitInterview(employee: Employee, process: OffboardingProcess): void {
    // In implementazione reale pianificherebbe exit interview
  }

  private startOffboardingMonitoring(processId: string): void {
    // Avvia monitoraggio per deadlines e reminder
  }

  private getEmployeeById(employeeId: string): Employee | undefined {
    const employees = LocalStorage.getEmployees();
    return employees.find(e => e.id === employeeId);
  }

  private updateEmployeeInStorage(employee: Employee): void {
    const employees = LocalStorage.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    
    if (index !== -1) {
      employees[index] = employee;
      LocalStorage.setEmployees(employees);
    }
  }

  private saveOffboardingProcess(process: OffboardingProcess): void {
    // In implementazione reale salverebbe in database
    // Per ora implementazione mock
  }

  private getOffboardingProcess(processId: string): OffboardingProcess | undefined {
    // In implementazione reale recupererebbe da database
    // Mock implementation
    return undefined;
  }

  private saveExitInterview(interview: ExitInterview): void {
    // Salva exit interview in database
  }

  // Notification methods
  private async sendOffboardingInitiatedNotification(employee: Employee, process: OffboardingProcess): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'offboarding_initiated',
      priority: 'high',
      title: `Processo Offboarding Avviato 👋`,
      message: `${employee.nome}, è stato avviato il tuo processo di offboarding. Troverai tutte le attività da completare nel tuo dashboard.`,
      contextData: { employeeId: employee.id, processId: process.id, reason: process.reason },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async notifyStakeholdersOffboarding(employee: Employee, process: OffboardingProcess): Promise<void> {
    // Notifica HR e manager
    await smartNotificationService.createCustomNotification({
      type: 'offboarding_stakeholder_alert',
      priority: 'high',
      title: `Offboarding Dipendente: ${employee.nome} ${employee.cognome}`,
      message: `È stato avviato il processo di offboarding per ${employee.nome} ${employee.cognome} (${employee.posizione}). Motivo: ${process.reason}`,
      contextData: { employeeId: employee.id, processId: process.id },
      channels: [
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendExitInterviewCompletedNotification(employee: Employee): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'exit_interview_completed',
      priority: 'medium',
      title: `Exit Interview Completato 📋`,
      message: `${employee.nome}, grazie per aver completato l'exit interview. Il tuo feedback è prezioso per migliorare la nostra organizzazione.`,
      contextData: { employeeId: employee.id },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendOffboardingCompletedNotification(employee: Employee, process: OffboardingProcess): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'offboarding_completed',
      priority: 'medium',
      title: `Offboarding Completato ✅`,
      message: `Il processo di offboarding per ${employee.nome} ${employee.cognome} è stato completato con successo. Tutti i task e knowledge transfer sono stati finalizzati.`,
      contextData: { employeeId: employee.id, processId: process.id },
      channels: [
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }
}

// Export singleton instance
export const offboardingProcessEngine = OffboardingProcessEngine.getInstance();