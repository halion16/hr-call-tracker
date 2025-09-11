import { 
  Employee, 
  Call, 
  SchedulingSuggestion, 
  SchedulingTrigger, 
  SchedulingRule,
  SchedulingCondition,
  SchedulingAction,
  CompanyEvent 
} from '@/types';
import { generateId } from './utils';
import { LocalStorage } from './storage';
import { SmartNotificationService } from './smart-notification-service';

/**
 * Auto-Scheduling Intelligence Engine
 * Algoritmo che suggerisce automaticamente quando schedulare le call basandosi su:
 * - Performance del dipendente
 * - Ultimo feedback ricevuto  
 * - Scadenze contrattuali
 * - Eventi aziendali
 */
export class AutoSchedulingEngine {
  private static instance: AutoSchedulingEngine;
  private rules: SchedulingRule[] = [];
  private suggestions: SchedulingSuggestion[] = [];
  private companyEvents: CompanyEvent[] = [];
  private readonly STORAGE_KEYS = {
    rules: 'hr-scheduling-rules',
    suggestions: 'hr-scheduling-suggestions',
    events: 'hr-company-events'
  };

  private constructor() {
    this.initializeDefaultRules();
    this.loadData();
  }

  static getInstance(): AutoSchedulingEngine {
    if (!AutoSchedulingEngine.instance) {
      AutoSchedulingEngine.instance = new AutoSchedulingEngine();
    }
    return AutoSchedulingEngine.instance;
  }

  /**
   * Analizza tutti i dipendenti e genera suggerimenti automatici
   */
  async generateSchedulingSuggestions(): Promise<SchedulingSuggestion[]> {
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    const newSuggestions: SchedulingSuggestion[] = [];

    for (const employee of employees) {
      if (!employee.isActive) continue;

      const employeeCalls = calls.filter(call => call.employeeId === employee.id);
      const triggers = this.analyzeTriggers(employee, employeeCalls);
      
      if (triggers.length > 0) {
        const suggestion = this.createSuggestion(employee, triggers);
        newSuggestions.push(suggestion);
      }
    }

    // Merge with existing suggestions (avoid duplicates)
    this.mergeSuggestions(newSuggestions);
    this.saveSuggestions();

    return this.suggestions.filter(s => s.status === 'pending');
  }

  /**
   * Analizza i trigger per un dipendente specifico
   */
  private analyzeTriggers(employee: Employee, calls: Call[]): SchedulingTrigger[] {
    const triggers: SchedulingTrigger[] = [];
    const now = new Date();

    // 1. Performance Analysis
    if (employee.performanceScore && employee.performanceScore < 6) {
      triggers.push({
        type: 'performance_decline',
        description: `Performance score basso: ${employee.performanceScore}/10`,
        severity: employee.performanceScore < 4 ? 'high' : 'medium'
      });
    }

    // 2. Contract Expiry Analysis
    if (employee.contractExpiryDate) {
      const contractDate = new Date(employee.contractExpiryDate);
      const daysUntilExpiry = Math.ceil((contractDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
        triggers.push({
          type: 'contract_expiry',
          description: `Contratto in scadenza tra ${daysUntilExpiry} giorni`,
          severity: daysUntilExpiry <= 30 ? 'high' : 'medium',
          daysUntilAction: daysUntilExpiry
        });
      }
    }

    // 3. Last Call Analysis
    const completedCalls = calls
      .filter(call => call.status === 'completed')
      .sort((a, b) => new Date(b.dataCompletata || '').getTime() - new Date(a.dataCompletata || '').getTime());

    if (completedCalls.length > 0) {
      const lastCall = completedCalls[0];
      const daysSinceLastCall = Math.ceil((now.getTime() - new Date(lastCall.dataCompletata || '').getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if overdue based on preferred frequency
      const maxDays = this.getMaxDaysForFrequency(employee.preferredCallFrequency || 'monthly');
      if (daysSinceLastCall > maxDays) {
        triggers.push({
          type: 'overdue_review',
          description: `Ultima call ${daysSinceLastCall} giorni fa (frequenza: ${employee.preferredCallFrequency || 'monthly'})`,
          severity: daysSinceLastCall > maxDays * 1.5 ? 'high' : 'medium'
        });
      }

      // Check last rating
      if (lastCall.rating && lastCall.rating < 3) {
        triggers.push({
          type: 'low_rating',
          description: `Ultimo rating basso: ${lastCall.rating}/5`,
          severity: lastCall.rating <= 2 ? 'high' : 'medium'
        });
      }
    } else {
      // No calls ever - high priority
      triggers.push({
        type: 'overdue_review',
        description: 'Nessuna call mai effettuata',
        severity: 'high'
      });
    }

    // 4. Company Events Analysis
    const relevantEvents = this.companyEvents.filter(event => {
      if (!event.impactsEmployees) return false;
      
      const eventDate = new Date(event.date);
      const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Event within next 30 days
      if (daysUntilEvent > 0 && daysUntilEvent <= 30) {
        // Check if employee is affected
        if (event.affectedEmployees?.includes(employee.id) || 
            event.affectedDepartments?.includes(employee.dipartimento)) {
          return true;
        }
      }
      
      return false;
    });

    for (const event of relevantEvents) {
      triggers.push({
        type: 'company_event',
        description: `Evento aziendale in arrivo: ${event.title}`,
        severity: event.type === 'restructuring' ? 'high' : 'medium'
      });
    }

    return triggers;
  }

  /**
   * Crea un suggerimento basato sui trigger identificati
   */
  private createSuggestion(employee: Employee, triggers: SchedulingTrigger[]): SchedulingSuggestion {
    const priority = this.calculatePriority(triggers);
    const confidence = this.calculateConfidence(triggers, employee);
    const suggestedDate = this.calculateOptimalDate(triggers, employee);
    const reasoning = this.generateReasoning(triggers, employee);

    return {
      id: generateId(),
      employeeId: employee.id,
      suggestedDate: suggestedDate.toISOString(),
      priority,
      confidence,
      reasoning,
      triggers,
      autoGenerated: true,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
  }

  /**
   * Calcola la priorità basata sui trigger
   */
  private calculatePriority(triggers: SchedulingTrigger[]): 'urgent' | 'high' | 'medium' | 'low' {
    const highSeverityCount = triggers.filter(t => t.severity === 'high').length;
    const mediumSeverityCount = triggers.filter(t => t.severity === 'medium').length;

    if (highSeverityCount >= 2) return 'urgent';
    if (highSeverityCount >= 1) return 'high';
    if (mediumSeverityCount >= 2) return 'high';
    if (mediumSeverityCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * Calcola la confidenza del suggerimento (0-1)
   */
  private calculateConfidence(triggers: SchedulingTrigger[], employee: Employee): number {
    let confidence = 0.5; // Base confidence

    // More triggers = higher confidence
    confidence += triggers.length * 0.1;

    // High severity triggers boost confidence
    const highSeverityCount = triggers.filter(t => t.severity === 'high').length;
    confidence += highSeverityCount * 0.15;

    // Performance data availability boosts confidence
    if (employee.performanceScore) confidence += 0.1;
    if (employee.averageCallRating) confidence += 0.1;
    if (employee.totalCalls && employee.totalCalls > 0) confidence += 0.05;

    return Math.min(confidence, 1);
  }

  /**
   * Calcola la data ottimale per la call
   */
  private calculateOptimalDate(triggers: SchedulingTrigger[], employee: Employee): Date {
    const now = new Date();
    let suggestedDate = new Date(now);
    
    // Base scheduling: add business days
    const priority = this.calculatePriority(triggers);
    const daysToAdd = {
      'urgent': 1,
      'high': 3,
      'medium': 7,
      'low': 14
    }[priority];

    suggestedDate.setDate(suggestedDate.getDate() + daysToAdd);

    // Adjust for contract expiry urgency
    const contractTrigger = triggers.find(t => t.type === 'contract_expiry');
    if (contractTrigger && contractTrigger.daysUntilAction) {
      const contractUrgentDate = new Date(now);
      contractUrgentDate.setDate(now.getDate() + Math.max(contractTrigger.daysUntilAction - 30, 1));
      
      if (contractUrgentDate < suggestedDate) {
        suggestedDate = contractUrgentDate;
      }
    }

    // Ensure it's a business day (Monday-Friday)
    this.adjustToBusinessDay(suggestedDate);

    return suggestedDate;
  }

  /**
   * Aggiusta la data per essere un giorno lavorativo
   */
  private adjustToBusinessDay(date: Date): void {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) { // Sunday
      date.setDate(date.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday
      date.setDate(date.getDate() + 2);
    }
  }

  /**
   * Genera il reasoning testuale per il suggerimento
   */
  private generateReasoning(triggers: SchedulingTrigger[], employee: Employee): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Analisi automatica per ${employee.nome} ${employee.cognome}:`);

    for (const trigger of triggers) {
      switch (trigger.type) {
        case 'performance_decline':
          reasoning.push(`🔻 ${trigger.description} - richiede attenzione immediata`);
          break;
        case 'contract_expiry':
          reasoning.push(`⏰ ${trigger.description} - importante discutere il rinnovo`);
          break;
        case 'overdue_review':
          reasoning.push(`📅 ${trigger.description} - necessario catch-up`);
          break;
        case 'low_rating':
          reasoning.push(`⭐ ${trigger.description} - follow-up importante`);
          break;
        case 'company_event':
          reasoning.push(`🏢 ${trigger.description} - preparazione necessaria`);
          break;
      }
    }

    const priority = this.calculatePriority(triggers);
    const priorityMessages = {
      'urgent': '🚨 Azione immediata richiesta',
      'high': '⚠️  Alta priorità',
      'medium': '📊 Priorità media',
      'low': '📝 Bassa priorità'
    };

    reasoning.push(priorityMessages[priority]);

    return reasoning;
  }

  /**
   * Ottieni giorni massimi per frequenza
   */
  private getMaxDaysForFrequency(frequency: string): number {
    const frequencies = {
      'weekly': 7,
      'biweekly': 14,
      'monthly': 30,
      'quarterly': 90
    };
    return frequencies[frequency as keyof typeof frequencies] || 30;
  }

  /**
   * Merge nuovi suggerimenti evitando duplicati
   */
  private mergeSuggestions(newSuggestions: SchedulingSuggestion[]): void {
    for (const newSuggestion of newSuggestions) {
      const existing = this.suggestions.find(s => 
        s.employeeId === newSuggestion.employeeId && 
        s.status === 'pending'
      );

      if (existing) {
        // Update existing with new data
        existing.triggers = newSuggestion.triggers;
        existing.reasoning = newSuggestion.reasoning;
        existing.priority = newSuggestion.priority;
        existing.confidence = newSuggestion.confidence;
        existing.suggestedDate = newSuggestion.suggestedDate;
      } else {
        this.suggestions.push(newSuggestion);
      }
    }
  }

  /**
   * Inizializza le regole di scheduling predefinite
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: generateId(),
        name: 'Performance Critica',
        description: 'Suggerisce call urgente per performance sotto 4/10',
        condition: {
          type: 'performance_score',
          operator: 'less_than',
          value: 4
        },
        action: {
          type: 'suggest_call',
          priority: 'urgent',
          scheduleDaysFromNow: 1
        },
        priority: 100,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        name: 'Contratto in Scadenza',
        description: 'Suggerisce call per contratti in scadenza entro 30 giorni',
        condition: {
          type: 'contract_days_remaining',
          operator: 'less_than',
          value: 30
        },
        action: {
          type: 'suggest_call',
          priority: 'high',
          scheduleDaysFromNow: 3
        },
        priority: 90,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Public API Methods
  
  /**
   * Ottieni tutti i suggerimenti pendenti
   */
  getPendingSuggestions(): SchedulingSuggestion[] {
    return this.suggestions.filter(s => s.status === 'pending');
  }

  /**
   * Accetta un suggerimento e crea la call
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) throw new Error('Suggestion not found');

    suggestion.status = 'accepted';
    this.saveSuggestions();

    // Create the call
    const employee = LocalStorage.getEmployees().find(e => e.id === suggestion.employeeId);
    if (employee) {
      const call: Call = {
        id: generateId(),
        employeeId: suggestion.employeeId,
        dataSchedulata: suggestion.suggestedDate,
        status: 'scheduled',
        note: `Call programmata automaticamente: ${suggestion.reasoning.join(', ')}`
      };

      LocalStorage.addCall(call);

      // Send smart notification
      await SmartNotificationService.getInstance().createAutoScheduledNotification(call, employee, suggestion);
    }
  }

  /**
   * Dismisses a suggestion
   */
  dismissSuggestion(suggestionId: string, reason?: string): void {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.status = 'dismissed';
      this.saveSuggestions();
    }
  }

  /**
   * Aggiunge un evento aziendale
   */
  addCompanyEvent(event: Omit<CompanyEvent, 'id'>): CompanyEvent {
    const newEvent: CompanyEvent = {
      ...event,
      id: generateId()
    };
    
    this.companyEvents.push(newEvent);
    this.saveEvents();
    return newEvent;
  }

  /**
   * Ottieni tutti gli eventi aziendali
   */
  getCompanyEvents(): CompanyEvent[] {
    return this.companyEvents;
  }

  // Storage methods
  private loadData(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedSuggestions = localStorage.getItem(this.STORAGE_KEYS.suggestions);
      if (storedSuggestions) {
        this.suggestions = JSON.parse(storedSuggestions);
      }

      const storedEvents = localStorage.getItem(this.STORAGE_KEYS.events);
      if (storedEvents) {
        this.companyEvents = JSON.parse(storedEvents);
      }

      const storedRules = localStorage.getItem(this.STORAGE_KEYS.rules);
      if (storedRules) {
        this.rules = JSON.parse(storedRules);
      }
    } catch (error) {
      console.warn('Failed to load auto-scheduling data:', error);
    }
  }

  private saveSuggestions(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.suggestions, JSON.stringify(this.suggestions));
  }

  private saveEvents(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.events, JSON.stringify(this.companyEvents));
  }

  private saveRules(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEYS.rules, JSON.stringify(this.rules));
  }
}

// Export singleton instance
export const autoSchedulingEngine = AutoSchedulingEngine.getInstance();