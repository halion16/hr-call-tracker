import { Employee, Call } from '@/types';
import { autoSchedulingEngine } from './auto-scheduling-engine';
import { smartNotificationService } from './smart-notification-service';
import { LocalStorage } from './storage';
import { CallTrackingService } from './call-tracking-service';

/**
 * Workflow Orchestration Coordinator
 * Coordina automaticamente tutte le funzionalità del sistema HR
 */
export class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator;
  private isRunning = false;
  private intervalIds: NodeJS.Timeout[] = [];
  private readonly ORCHESTRATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly DAILY_ANALYSIS_HOUR = 8; // 8 AM

  private constructor() {
    this.initialize();
  }

  static getInstance(): WorkflowOrchestrator {
    if (!WorkflowOrchestrator.instance) {
      WorkflowOrchestrator.instance = new WorkflowOrchestrator();
    }
    return WorkflowOrchestrator.instance;
  }

  /**
   * Inizializza l'orchestratore
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Start orchestration after a short delay to ensure all services are ready
    setTimeout(() => {
      this.startOrchestration();
    }, 2000);

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isRunning) {
        this.startOrchestration();
      }
    });
  }

  /**
   * Avvia l'orchestrazione automatica
   */
  public startOrchestration(): void {
    if (this.isRunning) return;

    console.log('🚀 Starting Workflow Orchestration');
    this.isRunning = true;

    // Immediate analysis
    this.runWorkflowAnalysis();

    // Regular orchestration every 5 minutes
    const regularInterval = setInterval(() => {
      this.runWorkflowAnalysis();
    }, this.ORCHESTRATION_INTERVAL);

    // Daily comprehensive analysis at 8 AM
    const dailyInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === this.DAILY_ANALYSIS_HOUR) {
        this.runDailyAnalysis();
      }
    }, 60 * 60 * 1000); // Check every hour

    this.intervalIds = [regularInterval, dailyInterval];
  }

  /**
   * Ferma l'orchestrazione
   */
  public stopOrchestration(): void {
    if (!this.isRunning) return;

    console.log('⏹️  Stopping Workflow Orchestration');
    this.isRunning = false;

    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
  }

  /**
   * Esegue l'analisi completa del workflow
   */
  private async runWorkflowAnalysis(): Promise<void> {
    try {
      console.log('🔄 Running workflow analysis...');

      // 1. Generate scheduling suggestions
      await this.generateSchedulingSuggestions();

      // 2. Check for overdue calls
      await this.checkOverdueCalls();

      // 3. Monitor performance changes
      await this.monitorPerformanceChanges();

      // 4. Check contract expiries
      await this.checkContractExpiries();

      // 5. Clean up old notifications
      this.cleanupOldData();

      console.log('✅ Workflow analysis completed');
    } catch (error) {
      console.error('❌ Error in workflow analysis:', error);
    }
  }

  /**
   * Esegue l'analisi giornaliera completa
   */
  private async runDailyAnalysis(): Promise<void> {
    try {
      console.log('📊 Running daily comprehensive analysis...');

      // 1. Full employee analysis
      await this.performComprehensiveEmployeeAnalysis();

      // 2. Generate weekly/monthly reports
      await this.generateAutomaticReports();

      // 3. Update performance metrics
      await this.updatePerformanceMetrics();

      // 4. Plan upcoming workflows
      await this.planUpcomingWorkflows();

      console.log('✅ Daily analysis completed');
    } catch (error) {
      console.error('❌ Error in daily analysis:', error);
    }
  }

  /**
   * Genera suggerimenti di scheduling automatici
   */
  private async generateSchedulingSuggestions(): Promise<void> {
    try {
      const suggestions = await autoSchedulingEngine.generateSchedulingSuggestions();
      
      if (suggestions.length > 0) {
        console.log(`💡 Generated ${suggestions.length} new scheduling suggestions`);
        
        // Send notification about new suggestions
        for (const suggestion of suggestions.slice(0, 3)) { // Limit to first 3 to avoid spam
          const employee = LocalStorage.getEmployees().find(e => e.id === suggestion.employeeId);
          if (employee && suggestion.priority === 'urgent') {
            await smartNotificationService.createAutoScheduledNotification(
              { 
                id: suggestion.id,
                employeeId: suggestion.employeeId,
                dataSchedulata: suggestion.suggestedDate,
                status: 'scheduled' 
              } as Call,
              employee,
              suggestion
            );
          }
        }
      }
    } catch (error) {
      console.error('Error generating scheduling suggestions:', error);
    }
  }

  /**
   * Verifica call in ritardo
   */
  private async checkOverdueCalls(): Promise<void> {
    try {
      const calls = LocalStorage.getCalls();
      const employees = LocalStorage.getEmployees();
      const now = new Date();

      const overdueCalls = calls.filter(call => {
        if (call.status !== 'scheduled') return false;
        
        const scheduledDate = new Date(call.dataSchedulata);
        return scheduledDate < now;
      });

      for (const call of overdueCalls) {
        const employee = employees.find(e => e.id === call.employeeId);
        if (!employee) continue;

        const daysPastDue = Math.ceil((now.getTime() - new Date(call.dataSchedulata).getTime()) / (1000 * 60 * 60 * 24));
        
        // Only send notification once per week for overdue calls
        const lastNotification = smartNotificationService.getAllNotifications()
          .find(n => n.type === 'overdue_call' && n.relatedCallId === call.id);
        
        if (!lastNotification || this.daysSince(lastNotification.createdAt) >= 7) {
          await smartNotificationService.createOverdueCallNotification(call, employee, daysPastDue);
        }
      }

      if (overdueCalls.length > 0) {
        console.log(`⏰ Found ${overdueCalls.length} overdue calls`);
      }
    } catch (error) {
      console.error('Error checking overdue calls:', error);
    }
  }

  /**
   * Monitora cambiamenti nelle performance
   */
  private async monitorPerformanceChanges(): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const previousPerformance = this.loadPreviousPerformanceData();

      for (const employee of employees) {
        if (!employee.isActive || !employee.performanceScore) continue;

        const previousScore = previousPerformance[employee.id];
        if (previousScore && employee.performanceScore < previousScore) {
          const decline = previousScore - employee.performanceScore;
          
          // Significant decline (more than 1 point)
          if (decline >= 1) {
            await smartNotificationService.createPerformanceAlertNotification(
              employee,
              employee.performanceScore,
              previousScore
            );
          }
        }

        // Update performance history
        previousPerformance[employee.id] = employee.performanceScore;
      }

      this.savePreviousPerformanceData(previousPerformance);
    } catch (error) {
      console.error('Error monitoring performance changes:', error);
    }
  }

  /**
   * Verifica scadenze contrattuali
   */
  private async checkContractExpiries(): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const now = new Date();

      for (const employee of employees) {
        if (!employee.isActive || !employee.contractExpiryDate) continue;

        const expiryDate = new Date(employee.contractExpiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check for contracts expiring in 90, 60, or 30 days
        const checkpoints = [90, 60, 30, 14, 7];
        
        for (const checkpoint of checkpoints) {
          if (daysUntilExpiry === checkpoint) {
            await smartNotificationService.createContractExpiryNotification(employee, daysUntilExpiry);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error checking contract expiries:', error);
    }
  }

  /**
   * Analisi completa dei dipendenti (giornaliera)
   */
  private async performComprehensiveEmployeeAnalysis(): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const calls = LocalStorage.getCalls();

      // Update employee statistics
      for (const employee of employees) {
        if (!employee.isActive) continue;

        const employeeCalls = calls.filter(c => c.employeeId === employee.id && c.status === 'completed');
        
        // Update call statistics
        employee.totalCalls = employeeCalls.length;
        
        if (employeeCalls.length > 0) {
          const ratings = employeeCalls.map(c => c.rating).filter(r => r !== undefined) as number[];
          if (ratings.length > 0) {
            employee.averageCallRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            employee.lastCallRating = ratings[ratings.length - 1];
          }
        }

        // Determine risk level
        employee.riskLevel = this.calculateRiskLevel(employee, employeeCalls);
      }

      // Save updated employee data
      LocalStorage.saveEmployees(employees);
      
      console.log('📈 Updated employee analytics');
    } catch (error) {
      console.error('Error in comprehensive employee analysis:', error);
    }
  }

  /**
   * Calcola il livello di rischio del dipendente
   */
  private calculateRiskLevel(employee: Employee, calls: Call[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Performance score factor
    if (employee.performanceScore) {
      if (employee.performanceScore < 4) riskScore += 3;
      else if (employee.performanceScore < 6) riskScore += 2;
      else if (employee.performanceScore < 7) riskScore += 1;
    }

    // Call rating factor
    if (employee.averageCallRating) {
      if (employee.averageCallRating < 2) riskScore += 3;
      else if (employee.averageCallRating < 3) riskScore += 2;
      else if (employee.averageCallRating < 4) riskScore += 1;
    }

    // Contract expiry factor
    if (employee.contractExpiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(employee.contractExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) riskScore += 2;
      else if (daysUntilExpiry <= 90) riskScore += 1;
    }

    // Call frequency factor
    const now = new Date();
    const recentCalls = calls.filter(call => {
      const callDate = new Date(call.dataCompletata || call.dataSchedulata);
      const daysDiff = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 90;
    });

    if (recentCalls.length === 0) riskScore += 2;
    else if (recentCalls.length < 2) riskScore += 1;

    // Determine risk level
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Genera report automatici
   */
  private async generateAutomaticReports(): Promise<void> {
    try {
      // This would integrate with the reports system to generate automated insights
      console.log('📊 Generating automatic reports...');
      
      const employees = LocalStorage.getEmployees();
      const calls = LocalStorage.getCalls();
      
      const stats = {
        totalEmployees: employees.filter(e => e.isActive).length,
        highRiskEmployees: employees.filter(e => e.riskLevel === 'high').length,
        completedCallsThisMonth: calls.filter(c => {
          if (!c.dataCompletata) return false;
          const callDate = new Date(c.dataCompletata);
          const now = new Date();
          return callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
        }).length
      };

      console.log('📈 Weekly stats:', stats);
    } catch (error) {
      console.error('Error generating automatic reports:', error);
    }
  }

  /**
   * Aggiorna metriche delle performance
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      // This would calculate and update various performance metrics
      console.log('📊 Updating performance metrics...');
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }

  /**
   * Pianifica workflow futuri
   */
  private async planUpcomingWorkflows(): Promise<void> {
    try {
      // This would plan and schedule future automated actions
      console.log('🗓️  Planning upcoming workflows...');
    } catch (error) {
      console.error('Error planning upcoming workflows:', error);
    }
  }

  /**
   * Pulisce dati vecchi
   */
  private cleanupOldData(): void {
    try {
      smartNotificationService.cleanupOldNotifications();
      console.log('🧹 Cleaned up old data');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Carica dati performance precedenti
   */
  private loadPreviousPerformanceData(): Record<string, number> {
    try {
      const stored = localStorage.getItem('hr-previous-performance');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Salva dati performance precedenti
   */
  private savePreviousPerformanceData(data: Record<string, number>): void {
    try {
      localStorage.setItem('hr-previous-performance', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving performance data:', error);
    }
  }

  /**
   * Calcola giorni da una data
   */
  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Public API Methods

  /**
   * Forza esecuzione immediata dell'analisi
   */
  public async runImmediateAnalysis(): Promise<void> {
    console.log('🔄 Running immediate workflow analysis...');
    await this.runWorkflowAnalysis();
  }

  /**
   * Ottieni stato dell'orchestratore
   */
  public getStatus(): { isRunning: boolean; nextAnalysis?: Date } {
    return {
      isRunning: this.isRunning,
      nextAnalysis: this.isRunning ? new Date(Date.now() + this.ORCHESTRATION_INTERVAL) : undefined
    };
  }

  /**
   * Ottieni statistiche del workflow
   */
  public getWorkflowStats(): any {
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    const suggestions = autoSchedulingEngine.getPendingSuggestions();
    const notifications = smartNotificationService.getAllNotifications();

    return {
      activeEmployees: employees.filter(e => e.isActive).length,
      highRiskEmployees: employees.filter(e => e.riskLevel === 'high').length,
      pendingSuggestions: suggestions.length,
      pendingNotifications: notifications.filter(n => n.status === 'pending').length,
      completedCallsThisWeek: calls.filter(c => {
        if (!c.dataCompletata) return false;
        const callDate = new Date(c.dataCompletata);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return callDate > weekAgo;
      }).length,
      lastAnalysis: new Date()
    };
  }
}

// Export singleton instance
export const workflowOrchestrator = WorkflowOrchestrator.getInstance();