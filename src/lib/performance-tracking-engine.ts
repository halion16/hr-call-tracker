import { Employee, PerformanceReview, PerformanceCategory, PerformanceGoal, SkillAssessment, PerformanceMetrics, Call } from '@/types';
import { LocalStorage } from './storage';
import { generateId } from './utils';
import { smartNotificationService } from './smart-notification-service';

/**
 * Performance Tracking Engine - Sistema di monitoraggio continuo delle performance
 * Tracciamento automatico, review programmati, goal setting e analytics
 */
export class PerformanceTrackingEngine {
  private static instance: PerformanceTrackingEngine;
  private intervalId: NodeJS.Timeout | null = null;
  
  public static getInstance(): PerformanceTrackingEngine {
    if (!this.instance) {
      this.instance = new PerformanceTrackingEngine();
    }
    return this.instance;
  }

  /**
   * Inizializza tracking performance per dipendente
   */
  public async initializePerformanceTracking(employee: Employee): Promise<void> {
    try {
      console.log(`📊 Initializing performance tracking for ${employee.nome} ${employee.cognome}`);
      
      // Crea prima valutazione skills di base
      const baseSkillAssessments = this.generateBaseSkillAssessments(employee);
      
      // Crea primi goal di performance
      const initialGoals = this.generateInitialPerformanceGoals(employee);
      
      // Aggiorna dipendente con dati performance
      const updatedEmployee: Employee = {
        ...employee,
        skillAssessments: baseSkillAssessments,
        performanceHistory: []
      };

      this.updateEmployeeInStorage(updatedEmployee);

      // Pianifica review automatici
      this.schedulePerformanceReviews(employee.id);
      
      console.log('✅ Performance tracking initialized successfully');
      
    } catch (error) {
      console.error('Error initializing performance tracking:', error);
      throw error;
    }
  }

  /**
   * Genera skill assessments di base per ruolo
   */
  private generateBaseSkillAssessments(employee: Employee): SkillAssessment[] {
    const commonSkills = [
      { skill: 'Communication', category: 'soft' as const },
      { skill: 'Teamwork', category: 'soft' as const },
      { skill: 'Problem Solving', category: 'soft' as const },
      { skill: 'Time Management', category: 'soft' as const }
    ];

    const roleSkills = this.getRoleSpecificSkills(employee.posizione);
    const allSkills = [...commonSkills, ...roleSkills];

    return allSkills.map(skillInfo => ({
      id: generateId(),
      employeeId: employee.id,
      skill: skillInfo.skill,
      category: skillInfo.category,
      currentLevel: 3, // Starting baseline
      targetLevel: 4, // Room for growth
      assessmentDate: new Date().toISOString().split('T')[0],
      assessedBy: 'system', // Initial system assessment
      nextAssessmentDate: this.getNextAssessmentDate()
    }));
  }

  /**
   * Ottieni skills specifiche per ruolo
   */
  private getRoleSpecificSkills(posizione: string): Array<{ skill: string, category: 'technical' | 'soft' | 'leadership' | 'domain' }> {
    const roleSkillsMap: Record<string, Array<{ skill: string, category: 'technical' | 'soft' | 'leadership' | 'domain' }>> = {
      'Senior Developer': [
        { skill: 'JavaScript/TypeScript', category: 'technical' },
        { skill: 'React/Next.js', category: 'technical' },
        { skill: 'System Architecture', category: 'technical' },
        { skill: 'Code Review', category: 'technical' },
        { skill: 'Technical Mentoring', category: 'leadership' }
      ],
      'Marketing Manager': [
        { skill: 'Digital Marketing', category: 'domain' },
        { skill: 'Analytics & Reporting', category: 'technical' },
        { skill: 'Campaign Management', category: 'domain' },
        { skill: 'Team Leadership', category: 'leadership' },
        { skill: 'Budget Management', category: 'domain' }
      ],
      'HR Specialist': [
        { skill: 'Recruitment', category: 'domain' },
        { skill: 'Employee Relations', category: 'domain' },
        { skill: 'HR Law & Compliance', category: 'domain' },
        { skill: 'Conflict Resolution', category: 'soft' },
        { skill: 'Data Analysis', category: 'technical' }
      ],
      'Sales Representative': [
        { skill: 'Sales Techniques', category: 'domain' },
        { skill: 'CRM Management', category: 'technical' },
        { skill: 'Negotiation', category: 'soft' },
        { skill: 'Customer Relationship', category: 'domain' },
        { skill: 'Market Analysis', category: 'domain' }
      ]
    };

    return roleSkillsMap[posizione] || [];
  }

  /**
   * Genera goal performance iniziali
   */
  private generateInitialPerformanceGoals(employee: Employee): PerformanceGoal[] {
    const commonGoals = [
      {
        title: 'Migliorare comunicazione interpersonale',
        description: 'Sviluppare capacità comunicative con team e stakeholder',
        category: 'behavior' as const,
        measurementCriteria: 'Feedback positivo da colleghi e manager in survey 360°'
      },
      {
        title: 'Completare progetti entro scadenze',
        description: 'Rispettare timeline e deadlines assegnati',
        category: 'performance' as const,
        measurementCriteria: 'Consegnare il 90% dei progetti entro le scadenze stabilite'
      }
    ];

    const roleGoals = this.getRoleSpecificGoals(employee.posizione);
    const allGoals = [...commonGoals, ...roleGoals];

    return allGoals.map(goalInfo => ({
      id: generateId(),
      title: goalInfo.title,
      description: goalInfo.description,
      category: goalInfo.category,
      targetDate: this.getQuarterEndDate(),
      status: 'active' as const,
      measurementCriteria: goalInfo.measurementCriteria
    }));
  }

  /**
   * Goal specifici per ruolo
   */
  private getRoleSpecificGoals(posizione: string): Array<{
    title: string,
    description: string,
    category: 'performance' | 'behavior' | 'skill' | 'project',
    measurementCriteria: string
  }> {
    const roleGoalsMap: Record<string, Array<{
      title: string,
      description: string,
      category: 'performance' | 'behavior' | 'skill' | 'project',
      measurementCriteria: string
    }>> = {
      'Senior Developer': [
        {
          title: 'Migliorare qualità del codice',
          description: 'Ridurre bug e migliorare maintainability del codice',
          category: 'performance',
          measurementCriteria: 'Ridurre bug in produzione del 30% e ottenere rating 4+ nei code review'
        },
        {
          title: 'Mentoring junior developers',
          description: 'Guidare e supportare sviluppatori junior nel team',
          category: 'behavior',
          measurementCriteria: 'Supportare almeno 2 junior developer con feedback settimanali'
        }
      ],
      'Marketing Manager': [
        {
          title: 'Aumentare ROI campagne marketing',
          description: 'Migliorare ritorno investimento delle attività marketing',
          category: 'performance',
          measurementCriteria: 'Aumentare ROI del 15% rispetto al trimestre precedente'
        },
        {
          title: 'Sviluppare competenze data analytics',
          description: 'Approfondire analisi dati per decisioni strategiche',
          category: 'skill',
          measurementCriteria: 'Completare corso Google Analytics e implementare 3 nuovi KPI'
        }
      ]
    };

    return roleGoalsMap[posizione] || [];
  }

  /**
   * Crea review di performance
   */
  public async createPerformanceReview(
    employeeId: string, 
    reviewType: 'annual' | 'semi_annual' | 'quarterly' | 'probation' | 'project_based',
    reviewerId: string
  ): Promise<string> {
    try {
      const employee = this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Calcola periodo review
      const reviewPeriod = this.getReviewPeriod(reviewType);
      
      // Genera categorie di valutazione
      const categories = this.generateReviewCategories(employee);
      
      // Genera goal da performance precedenti
      const goals = this.generateReviewGoals(employee);

      const review: PerformanceReview = {
        id: generateId(),
        employeeId,
        reviewPeriod,
        overallRating: 0, // Da compilare
        reviewType,
        categories,
        strengths: [],
        areasForImprovement: [],
        goals,
        reviewerComments: '',
        status: 'draft',
        reviewerId,
        createdAt: new Date().toISOString()
      };

      // Salva review
      this.savePerformanceReview(review);

      // Notifica inizio review
      await this.sendReviewStartedNotification(employee, review);

      console.log(`📝 Performance review created for ${employee.nome} ${employee.cognome}`);
      return review.id;
      
    } catch (error) {
      console.error('Error creating performance review:', error);
      throw error;
    }
  }

  /**
   * Genera categorie di valutazione per review
   */
  private generateReviewCategories(employee: Employee): PerformanceCategory[] {
    const baseCategories = [
      { name: 'Qualità del Lavoro', weight: 25 },
      { name: 'Produttività', weight: 20 },
      { name: 'Comunicazione', weight: 15 },
      { name: 'Collaborazione', weight: 15 },
      { name: 'Iniziativa', weight: 10 },
      { name: 'Rispetto delle Scadenze', weight: 15 }
    ];

    return baseCategories.map(cat => ({
      name: cat.name,
      rating: 0, // Da compilare durante review
      weight: cat.weight,
      feedback: ''
    }));
  }

  /**
   * Aggiorna skill assessment
   */
  public async updateSkillAssessment(
    employeeId: string, 
    skillId: string, 
    newLevel: number, 
    assessedBy: string,
    evidences?: string[]
  ): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const employee = employees.find(e => e.id === employeeId);
      
      if (!employee || !employee.skillAssessments) {
        throw new Error('Employee or skill assessments not found');
      }

      const skillIndex = employee.skillAssessments.findIndex(s => s.id === skillId);
      if (skillIndex === -1) {
        throw new Error('Skill assessment not found');
      }

      const oldLevel = employee.skillAssessments[skillIndex].currentLevel;
      
      // Aggiorna assessment
      employee.skillAssessments[skillIndex] = {
        ...employee.skillAssessments[skillIndex],
        currentLevel: newLevel,
        assessmentDate: new Date().toISOString().split('T')[0],
        assessedBy,
        evidences: evidences || employee.skillAssessments[skillIndex].evidences,
        nextAssessmentDate: this.getNextAssessmentDate()
      };

      // Aggiorna performance score generale se significativo miglioramento
      if (newLevel > oldLevel) {
        await this.updateOverallPerformanceScore(employee);
      }

      this.updateEmployeeInStorage(employee);

      // Notifica se miglioramento significativo
      if (newLevel > oldLevel + 1) {
        await this.sendSkillImprovementNotification(employee, employee.skillAssessments[skillIndex]);
      }
      
    } catch (error) {
      console.error('Error updating skill assessment:', error);
      throw error;
    }
  }

  /**
   * Analizza performance da dati call
   */
  public async analyzePerformanceFromCalls(employeeId: string): Promise<void> {
    try {
      const calls = LocalStorage.getCalls();
      const employeeCalls = calls.filter(call => 
        call.employeeId === employeeId && call.status === 'completed'
      );

      if (employeeCalls.length === 0) return;

      const employee = this.getEmployeeById(employeeId);
      if (!employee) return;

      // Analizza trend performance dalle call
      const recentCalls = employeeCalls
        .filter(call => this.isRecentCall(call, 30)) // Ultimi 30 giorni
        .sort((a, b) => new Date(b.dataCompletata!).getTime() - new Date(a.dataCompletata!).getTime());

      if (recentCalls.length === 0) return;

      // Calcola metriche
      const averageRating = this.calculateAverageCallRating(recentCalls);
      const callFrequency = this.calculateCallFrequency(recentCalls);
      const consistencyScore = this.calculateConsistencyScore(recentCalls);

      // Aggiorna score performance basato su call
      const newPerformanceScore = this.calculatePerformanceFromCallMetrics(
        averageRating,
        callFrequency,
        consistencyScore
      );

      // Aggiorna dipendente
      const updatedEmployee: Employee = {
        ...employee,
        performanceScore: newPerformanceScore,
        lastCallRating: recentCalls[0].rating || employee.lastCallRating,
        averageCallRating: averageRating,
        totalCalls: employeeCalls.length
      };

      this.updateEmployeeInStorage(updatedEmployee);

      // Notifica se cambiamento significativo
      const oldScore = employee.performanceScore || 7;
      if (Math.abs(newPerformanceScore - oldScore) >= 1) {
        await this.sendPerformanceChangeNotification(updatedEmployee, oldScore, newPerformanceScore);
      }
      
    } catch (error) {
      console.error('Error analyzing performance from calls:', error);
    }
  }

  /**
   * Ottieni metriche performance
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const employees = LocalStorage.getEmployees();
    const activeEmployees = employees.filter(e => e.isActive && e.performanceScore);

    if (activeEmployees.length === 0) {
      return {
        averageRating: 0,
        distributionByRating: [],
        improvementTrends: [],
        goalAchievementRate: 0
      };
    }

    // Media rating
    const averageRating = activeEmployees.reduce((sum, e) => sum + (e.performanceScore || 0), 0) / activeEmployees.length;

    // Distribuzione per rating
    const distributionMap: Record<number, number> = {};
    activeEmployees.forEach(e => {
      const rating = Math.floor(e.performanceScore || 0);
      distributionMap[rating] = (distributionMap[rating] || 0) + 1;
    });

    const distributionByRating = Object.entries(distributionMap).map(([rating, count]) => ({
      rating: parseInt(rating),
      count
    }));

    // Mock data per trends (in implementazione reale verrebbe dal database)
    const improvementTrends = [
      { period: '2024-Q1', averageRating: 7.2 },
      { period: '2024-Q2', averageRating: 7.4 },
      { period: '2024-Q3', averageRating: 7.6 },
      { period: '2024-Q4', averageRating: averageRating }
    ];

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      distributionByRating,
      improvementTrends,
      goalAchievementRate: 75 // Mock data
    };
  }

  /**
   * Verifica review in scadenza
   */
  public async checkUpcomingReviews(): Promise<void> {
    try {
      const employees = LocalStorage.getEmployees();
      const now = new Date();
      
      for (const employee of employees) {
        if (!employee.isActive) continue;
        
        // Controlla se necessita review
        const needsReview = this.needsPerformanceReview(employee, now);
        
        if (needsReview.needed) {
          await this.sendReviewReminderNotification(employee, needsReview.type);
        }
      }
      
    } catch (error) {
      console.error('Error checking upcoming reviews:', error);
    }
  }

  /**
   * Helper methods
   */
  private getNextAssessmentDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // Ogni 6 mesi
    return date.toISOString().split('T')[0];
  }

  private getQuarterEndDate(): string {
    const date = new Date();
    const quarter = Math.floor(date.getMonth() / 3);
    const quarterEndMonth = (quarter + 1) * 3 - 1;
    const quarterEndDate = new Date(date.getFullYear(), quarterEndMonth + 1, 0);
    return quarterEndDate.toISOString().split('T')[0];
  }

  private getReviewPeriod(reviewType: string) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (reviewType) {
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'semi_annual':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'annual':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 3);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  private generateReviewGoals(employee: Employee): PerformanceGoal[] {
    // In implementazione reale, genererebbe goal basati su performance precedenti
    return [];
  }

  private isRecentCall(call: Call, days: number): boolean {
    if (!call.dataCompletata) return false;
    const callDate = new Date(call.dataCompletata);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return callDate >= cutoffDate;
  }

  private calculateAverageCallRating(calls: Call[]): number {
    const ratedCalls = calls.filter(call => call.rating);
    if (ratedCalls.length === 0) return 0;
    
    const totalRating = ratedCalls.reduce((sum, call) => sum + (call.rating || 0), 0);
    return Math.round((totalRating / ratedCalls.length) * 10) / 10;
  }

  private calculateCallFrequency(calls: Call[]): number {
    if (calls.length === 0) return 0;
    
    const firstCall = new Date(calls[calls.length - 1].dataCompletata!);
    const lastCall = new Date(calls[0].dataCompletata!);
    const daysDiff = Math.max(1, Math.ceil((lastCall.getTime() - firstCall.getTime()) / (1000 * 60 * 60 * 24)));
    
    return calls.length / daysDiff * 30; // Call per month
  }

  private calculateConsistencyScore(calls: Call[]): number {
    if (calls.length < 2) return 1;
    
    const ratings = calls.filter(call => call.rating).map(call => call.rating!);
    if (ratings.length < 2) return 1;
    
    const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);
    
    // Score più alto = più consistente (meno varianza)
    return Math.max(0, Math.min(1, 1 - (stdDev / 2)));
  }

  private calculatePerformanceFromCallMetrics(avgRating: number, frequency: number, consistency: number): number {
    // Formula ponderata per calcolare performance score
    const ratingWeight = 0.5;
    const frequencyWeight = 0.3;
    const consistencyWeight = 0.2;
    
    const normalizedFrequency = Math.min(1, frequency / 5); // Max 5 call/month optimal
    
    const score = (avgRating / 5 * ratingWeight) + 
                  (normalizedFrequency * frequencyWeight) + 
                  (consistency * consistencyWeight);
    
    return Math.round(score * 10 * 10) / 10; // Convert to 1-10 scale
  }

  private needsPerformanceReview(employee: Employee, now: Date): { needed: boolean, type: string } {
    const hireDate = new Date(employee.dataAssunzione);
    const monthsSinceHire = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // Controlla se mai fatto review
    const hasReviews = employee.performanceHistory && employee.performanceHistory.length > 0;
    
    if (!hasReviews) {
      if (monthsSinceHire >= 3) {
        return { needed: true, type: 'probation' };
      }
    }
    
    // Controlla review annuale
    if (monthsSinceHire >= 12) {
      const lastReview = employee.performanceHistory?.[0];
      if (!lastReview) {
        return { needed: true, type: 'annual' };
      }
      
      const lastReviewDate = new Date(lastReview.createdAt);
      const monthsSinceLastReview = (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsSinceLastReview >= 12) {
        return { needed: true, type: 'annual' };
      }
    }
    
    return { needed: false, type: '' };
  }

  private async updateOverallPerformanceScore(employee: Employee): Promise<void> {
    if (!employee.skillAssessments) return;
    
    // Calcola media skill levels
    const avgSkillLevel = employee.skillAssessments.reduce((sum, skill) => sum + skill.currentLevel, 0) / employee.skillAssessments.length;
    
    // Aggiorna performance score basato su skills
    const newScore = Math.min(10, Math.max(1, avgSkillLevel * 2));
    
    const updatedEmployee: Employee = {
      ...employee,
      performanceScore: newScore
    };
    
    this.updateEmployeeInStorage(updatedEmployee);
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

  private savePerformanceReview(review: PerformanceReview): void {
    // In implementazione reale, salverebbe nel database
    // Per ora salviamo nell'employee record
    const employee = this.getEmployeeById(review.employeeId);
    if (employee) {
      if (!employee.performanceHistory) {
        employee.performanceHistory = [];
      }
      employee.performanceHistory.unshift(review);
      this.updateEmployeeInStorage(employee);
    }
  }

  private schedulePerformanceReviews(employeeId: string): void {
    // Pianifica controlli periodici per review
    // In implementazione reale userebbe job scheduler
  }

  // Notification methods
  private async sendReviewStartedNotification(employee: Employee, review: PerformanceReview): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'performance_review_started',
      priority: 'high',
      title: `Review di Performance Avviato 📊`,
      message: `È stata avviata la tua performance review ${review.reviewType}. Collabora con il tuo manager per completarla.`,
      contextData: { employeeId: employee.id, reviewId: review.id },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendSkillImprovementNotification(employee: Employee, skill: SkillAssessment): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'skill_improvement',
      priority: 'medium',
      title: `Miglioramento Skills Riconosciuto! 🚀`,
      message: `Complimenti ${employee.nome}! Il tuo livello in "${skill.skill}" è migliorato a ${skill.currentLevel}/5.`,
      contextData: { employeeId: employee.id, skill: skill.skill, newLevel: skill.currentLevel },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendPerformanceChangeNotification(employee: Employee, oldScore: number, newScore: number): Promise<void> {
    const isImprovement = newScore > oldScore;
    
    await smartNotificationService.createCustomNotification({
      type: 'performance_change',
      priority: isImprovement ? 'medium' : 'high',
      title: `Cambiamento Performance ${isImprovement ? '📈' : '⚠️'}`,
      message: `${employee.nome}, la tua performance è ${isImprovement ? 'migliorata' : 'diminuita'} da ${oldScore} a ${newScore}.`,
      contextData: { employeeId: employee.id, oldScore, newScore, trend: isImprovement ? 'up' : 'down' },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: !isImprovement } // Email solo se peggioramento
      ],
      autoGenerated: true
    });
  }

  private async sendReviewReminderNotification(employee: Employee, reviewType: string): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'review_reminder',
      priority: 'medium',
      title: `Promemoria Performance Review 📅`,
      message: `${employee.nome}, è tempo per la tua performance review ${reviewType}. Contatta il tuo manager per programmarla.`,
      contextData: { employeeId: employee.id, reviewType },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }
}

// Export singleton instance
export const performanceTrackingEngine = PerformanceTrackingEngine.getInstance();