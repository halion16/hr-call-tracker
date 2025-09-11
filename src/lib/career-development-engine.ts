import { Employee, CareerGoal, DevelopmentPlan, DevelopmentObjective, LearningActivity, MentorshipInfo, DevelopmentMetrics } from '@/types';
import { LocalStorage } from './storage';
import { generateId } from './utils';
import { smartNotificationService } from './smart-notification-service';

/**
 * Career Development Engine - Sistema per pianificazione crescita professionale
 * Gestione piani di sviluppo, goal di carriera, programmi formazione e mentorship
 */
export class CareerDevelopmentEngine {
  private static instance: CareerDevelopmentEngine;
  private intervalId: NodeJS.Timeout | null = null;
  
  public static getInstance(): CareerDevelopmentEngine {
    if (!this.instance) {
      this.instance = new CareerDevelopmentEngine();
    }
    return this.instance;
  }

  /**
   * Inizializza piano di sviluppo per dipendente
   */
  public async initializeDevelopmentPlan(employee: Employee, budgetAssigned: number = 2000): Promise<string> {
    try {
      console.log(`🎯 Initializing career development plan for ${employee.nome} ${employee.cognome}`);
      
      // Genera piano di sviluppo personalizzato
      const developmentPlan = this.createPersonalizedDevelopmentPlan(employee, budgetAssigned);
      
      // Genera goal di carriera iniziali
      const careerGoals = this.generateInitialCareerGoals(employee);
      
      // Aggiorna dipendente
      const updatedEmployee: Employee = {
        ...employee,
        developmentPlan,
        careerGoals: careerGoals,
        lifecycleStage: employee.lifecycleStage === 'active' ? 'development' : employee.lifecycleStage
      };

      this.updateEmployeeInStorage(updatedEmployee);

      // Notifica piano creato
      await this.sendDevelopmentPlanCreatedNotification(employee, developmentPlan);

      // Pianifica check periodici
      this.scheduleDevelopmentChecks(employee.id);
      
      console.log('✅ Development plan initialized successfully');
      return developmentPlan.id;
      
    } catch (error) {
      console.error('Error initializing development plan:', error);
      throw error;
    }
  }

  /**
   * Crea piano di sviluppo personalizzato
   */
  private createPersonalizedDevelopmentPlan(employee: Employee, budget: number): DevelopmentPlan {
    const planPeriod = {
      startDate: new Date().toISOString().split('T')[0],
      endDate: this.getYearEndDate()
    };

    // Genera obiettivi di sviluppo basati su ruolo e skills
    const objectives = this.generateDevelopmentObjectives(employee);
    
    // Genera attività di apprendimento
    const learningActivities = this.generateLearningActivities(employee, objectives);
    
    // Configura mentorship se appropriato
    const mentorshipProgram = this.configureMentorshipProgram(employee);

    return {
      id: generateId(),
      employeeId: employee.id,
      planPeriod,
      objectives,
      learningActivities,
      mentorshipProgram,
      budget,
      status: 'active',
      progress: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Genera obiettivi di sviluppo personalizzati
   */
  private generateDevelopmentObjectives(employee: Employee): DevelopmentObjective[] {
    const commonObjectives = [
      {
        title: 'Miglioramento competenze comunicative',
        description: 'Sviluppare capacità di comunicazione efficace in contesti professionali',
        targetSkills: ['Communication', 'Presentation Skills', 'Active Listening'],
        successCriteria: 'Completare corso di public speaking e ricevere feedback positivo in almeno 3 presentazioni'
      },
      {
        title: 'Sviluppo leadership personale',
        description: 'Acquisire competenze base di leadership e gestione team',
        targetSkills: ['Leadership', 'Team Management', 'Decision Making'],
        successCriteria: 'Guidare con successo almeno 1 progetto di team e ottenere valutazione 4+ da colleghi'
      }
    ];

    const roleObjectives = this.getRoleSpecificDevelopmentObjectives(employee.posizione);
    const allObjectives = [...commonObjectives, ...roleObjectives];

    return allObjectives.map((obj, index) => ({
      id: generateId(),
      title: obj.title,
      description: obj.description,
      targetSkills: obj.targetSkills,
      successCriteria: obj.successCriteria,
      targetDate: this.getObjectiveTargetDate(index),
      status: 'pending' as const,
      progress: 0
    }));
  }

  /**
   * Obiettivi specifici per ruolo
   */
  private getRoleSpecificDevelopmentObjectives(posizione: string): Array<{
    title: string,
    description: string,
    targetSkills: string[],
    successCriteria: string
  }> {
    const roleObjectivesMap: Record<string, Array<{
      title: string,
      description: string,
      targetSkills: string[],
      successCriteria: string
    }>> = {
      'Senior Developer': [
        {
          title: 'Mastery architetture cloud-native',
          description: 'Approfondire conoscenze su architetture scalabili e cloud computing',
          targetSkills: ['AWS/Azure', 'Kubernetes', 'Microservices', 'DevOps'],
          successCriteria: 'Ottenere certificazione cloud e progettare architettura per progetto production'
        },
        {
          title: 'Technical leadership avanzato',
          description: 'Sviluppare capacità di guida tecnica e mentoring del team',
          targetSkills: ['Technical Mentoring', 'System Design', 'Code Review Leadership'],
          successCriteria: 'Mentorare 2+ sviluppatori junior e condurre design reviews mensili'
        }
      ],
      'Marketing Manager': [
        {
          title: 'Digital marketing analytics avanzato',
          description: 'Padroneggiare strumenti avanzati di analisi e ottimizzazione campagne',
          targetSkills: ['Advanced Analytics', 'Marketing Automation', 'A/B Testing', 'Attribution Modeling'],
          successCriteria: 'Implementare modello attribuzione multi-touch e migliorare ROI del 20%'
        },
        {
          title: 'Strategic marketing leadership',
          description: 'Sviluppare visione strategica e capacità di guida team marketing',
          targetSkills: ['Marketing Strategy', 'Team Leadership', 'Budget Management', 'Cross-functional Collaboration'],
          successCriteria: 'Creare piano marketing strategico annuale e guidare team di 5+ persone'
        }
      ],
      'HR Specialist': [
        {
          title: 'HR Business Partnership',
          description: 'Evolvere da supporto operativo a partner strategico del business',
          targetSkills: ['Business Acumen', 'Strategic HR', 'Change Management', 'HR Analytics'],
          successCriteria: 'Implementare iniziativa strategica HR e dimostrare impatto business measurabile'
        },
        {
          title: 'People Analytics e Data-Driven HR',
          description: 'Sviluppare competenze analitiche per decisioni HR basate sui dati',
          targetSkills: ['HR Analytics', 'Data Visualization', 'Predictive Modeling', 'Statistical Analysis'],
          successCriteria: 'Creare dashboard HR e sviluppare modello predittivo turnover'
        }
      ]
    };

    return roleObjectivesMap[posizione] || [];
  }

  /**
   * Genera attività di apprendimento
   */
  private generateLearningActivities(employee: Employee, objectives: DevelopmentObjective[]): LearningActivity[] {
    const activities: LearningActivity[] = [];

    // Attività per ogni obiettivo
    objectives.forEach(objective => {
      const roleActivities = this.getRoleSpecificLearningActivities(employee.posizione, objective.targetSkills);
      activities.push(...roleActivities);
    });

    // Attività comuni
    const commonActivities = [
      {
        title: 'Corso Leadership Fundamentals',
        type: 'course' as const,
        provider: 'LinkedIn Learning',
        duration: 8,
        cost: 150
      },
      {
        title: 'Workshop Comunicazione Efficace',
        type: 'workshop' as const,
        provider: 'Internal Training',
        duration: 16,
        cost: 200
      }
    ];

    activities.push(...commonActivities.map(activity => ({
      id: generateId(),
      title: activity.title,
      type: activity.type,
      provider: activity.provider,
      duration: activity.duration,
      cost: activity.cost,
      status: 'planned' as const
    })));

    return activities;
  }

  /**
   * Attività di apprendimento specifiche per ruolo
   */
  private getRoleSpecificLearningActivities(posizione: string, targetSkills: string[]): LearningActivity[] {
    const roleActivitiesMap: Record<string, LearningActivity[]> = {
      'Senior Developer': [
        {
          id: generateId(),
          title: 'AWS Solutions Architect Certification',
          type: 'certification',
          provider: 'Amazon Web Services',
          duration: 40,
          cost: 300,
          status: 'planned',
          certificate: true
        },
        {
          id: generateId(),
          title: 'Advanced System Design Course',
          type: 'course',
          provider: 'System Design Interview',
          duration: 20,
          cost: 200,
          status: 'planned'
        },
        {
          id: generateId(),
          title: 'Tech Conference - DevOps Summit',
          type: 'conference',
          provider: 'DevOps Institute',
          duration: 16,
          cost: 800,
          status: 'planned'
        }
      ],
      'Marketing Manager': [
        {
          id: generateId(),
          title: 'Google Analytics Advanced Certification',
          type: 'certification',
          provider: 'Google',
          duration: 15,
          cost: 0,
          status: 'planned',
          certificate: true
        },
        {
          id: generateId(),
          title: 'Marketing Automation Mastery',
          type: 'course',
          provider: 'HubSpot Academy',
          duration: 12,
          cost: 250,
          status: 'planned'
        },
        {
          id: generateId(),
          title: 'Strategic Marketing Workshop',
          type: 'workshop',
          provider: 'Marketing Institute',
          duration: 24,
          cost: 600,
          status: 'planned'
        }
      ]
    };

    return roleActivitiesMap[posizione] || [];
  }

  /**
   * Configura programma di mentorship
   */
  private configureMentorshipProgram(employee: Employee): MentorshipInfo | undefined {
    const employees = LocalStorage.getEmployees();
    
    // Trova potenziali mentor (senior con stesso dipartimento o competenze correlate)
    const potentialMentors = employees.filter(e => 
      e.isActive &&
      e.id !== employee.id &&
      (e.dipartimento === employee.dipartimento || this.hasRelevantExperience(e, employee)) &&
      this.isSeniorLevel(e.posizione)
    );

    if (potentialMentors.length === 0) {
      return undefined;
    }

    // Scegli mentor con migliore match
    const selectedMentor = this.selectBestMentor(potentialMentors, employee);
    
    return {
      mentorId: selectedMentor.id,
      startDate: new Date().toISOString().split('T')[0],
      focus: this.generateMentorshipFocus(employee),
      meetingFrequency: 'biweekly',
      status: 'active'
    };
  }

  /**
   * Genera goal di carriera iniziali
   */
  private generateInitialCareerGoals(employee: Employee): CareerGoal[] {
    const careerPath = this.getCareerPath(employee.posizione);
    
    return careerPath.map((goal, index) => ({
      id: generateId(),
      employeeId: employee.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      priority: index === 0 ? 'high' as const : 'medium' as const,
      targetDate: this.getCareerGoalTargetDate(index),
      status: 'active' as const,
      progress: 0,
      milestones: goal.milestones.map(m => ({
        id: generateId(),
        title: m.title,
        description: m.description,
        targetDate: this.getMilestoneTargetDate(index, m.monthsFromStart),
        status: 'pending' as const
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Definisce percorso di carriera per posizione
   */
  private getCareerPath(posizione: string): Array<{
    title: string,
    description: string,
    category: 'skill_development' | 'promotion' | 'role_change' | 'certification' | 'leadership',
    milestones: Array<{ title: string, description: string, monthsFromStart: number }>
  }> {
    const careerPathsMap: Record<string, Array<{
      title: string,
      description: string,
      category: 'skill_development' | 'promotion' | 'role_change' | 'certification' | 'leadership',
      milestones: Array<{ title: string, description: string, monthsFromStart: number }>
    }>> = {
      'Junior Developer': [
        {
          title: 'Diventare Senior Developer',
          description: 'Sviluppare competenze avanzate per progredire a ruolo senior',
          category: 'promotion',
          milestones: [
            { title: 'Padronanza tecnologie core', description: 'Dimostrare expertise nelle tecnologie principali del team', monthsFromStart: 6 },
            { title: 'Leadership progetti', description: 'Guidare almeno 2 progetti di media complessità', monthsFromStart: 12 },
            { title: 'Mentoring colleghi', description: 'Iniziare a supportare developer junior', monthsFromStart: 18 }
          ]
        }
      ],
      'Senior Developer': [
        {
          title: 'Evoluzione a Tech Lead',
          description: 'Assumere responsabilità di leadership tecnica del team',
          category: 'promotion',
          milestones: [
            { title: 'Competenze architetturali', description: 'Progettare architetture scalabili e maintainible', monthsFromStart: 8 },
            { title: 'Team leadership', description: 'Guidare team di 3-5 sviluppatori', monthsFromStart: 12 },
            { title: 'Stakeholder management', description: 'Interfacciarsi efficacemente con business stakeholders', monthsFromStart: 16 }
          ]
        },
        {
          title: 'Specializzazione Cloud Architecture',
          description: 'Diventare esperto in soluzioni cloud enterprise',
          category: 'certification',
          milestones: [
            { title: 'AWS/Azure Certification', description: 'Ottenere certificazione cloud principal', monthsFromStart: 6 },
            { title: 'Progetto cloud migration', description: 'Guidare migrazione applicazione enterprise', monthsFromStart: 12 }
          ]
        }
      ],
      'Marketing Manager': [
        {
          title: 'Crescita a Marketing Director',
          description: 'Assumere responsabilità strategiche e gestione team estesa',
          category: 'promotion',
          milestones: [
            { title: 'Strategic planning', description: 'Sviluppare piano marketing strategico multi-anno', monthsFromStart: 6 },
            { title: 'Team expansion', description: 'Costruire e guidare team di 8+ persone', monthsFromStart: 12 },
            { title: 'P&L responsibility', description: 'Assumere responsabilità budget e risultati business', monthsFromStart: 18 }
          ]
        }
      ]
    };

    return careerPathsMap[posizione] || [];
  }

  /**
   * Aggiorna progresso goal di carriera
   */
  public async updateCareerGoalProgress(employeeId: string, goalId: string, progress: number, completedMilestones?: string[]): Promise<void> {
    try {
      const employee = this.getEmployeeById(employeeId);
      if (!employee || !employee.careerGoals) {
        throw new Error('Employee or career goals not found');
      }

      const goalIndex = employee.careerGoals.findIndex(g => g.id === goalId);
      if (goalIndex === -1) {
        throw new Error('Career goal not found');
      }

      const goal = employee.careerGoals[goalIndex];
      const oldProgress = goal.progress;

      // Aggiorna progress
      goal.progress = Math.min(100, Math.max(0, progress));
      goal.updatedAt = new Date().toISOString();

      // Aggiorna milestones se specificati
      if (completedMilestones) {
        goal.milestones.forEach(milestone => {
          if (completedMilestones.includes(milestone.id) && milestone.status !== 'completed') {
            milestone.status = 'completed';
            milestone.completedDate = new Date().toISOString().split('T')[0];
          }
        });
      }

      // Controlla se goal completato
      if (progress === 100 && goal.status !== 'completed') {
        goal.status = 'completed';
        await this.sendCareerGoalCompletedNotification(employee, goal);
      }

      this.updateEmployeeInStorage(employee);

      // Notifica progresso significativo
      if (progress - oldProgress >= 25) {
        await this.sendCareerProgressNotification(employee, goal, progress);
      }

      console.log(`📈 Career goal progress updated: ${goal.title} - ${progress}%`);
      
    } catch (error) {
      console.error('Error updating career goal progress:', error);
      throw error;
    }
  }

  /**
   * Completa attività di apprendimento
   */
  public async completeLearningActivity(employeeId: string, activityId: string, rating?: number): Promise<void> {
    try {
      const employee = this.getEmployeeById(employeeId);
      if (!employee || !employee.developmentPlan) {
        throw new Error('Employee or development plan not found');
      }

      const activityIndex = employee.developmentPlan.learningActivities.findIndex(a => a.id === activityId);
      if (activityIndex === -1) {
        throw new Error('Learning activity not found');
      }

      const activity = employee.developmentPlan.learningActivities[activityIndex];
      
      // Aggiorna attività
      activity.status = 'completed';
      activity.completionDate = new Date().toISOString().split('T')[0];
      if (rating) activity.rating = rating;

      // Aggiorna progress piano sviluppo
      this.updateDevelopmentPlanProgress(employee.developmentPlan);

      this.updateEmployeeInStorage(employee);

      // Notifica completamento
      await this.sendLearningActivityCompletedNotification(employee, activity);

      console.log(`🎓 Learning activity completed: ${activity.title}`);
      
    } catch (error) {
      console.error('Error completing learning activity:', error);
      throw error;
    }
  }

  /**
   * Ottieni metriche sviluppo
   */
  public getDevelopmentMetrics(): DevelopmentMetrics {
    const employees = LocalStorage.getEmployees();
    const employeesWithPlans = employees.filter(e => e.developmentPlan);

    if (employeesWithPlans.length === 0) {
      return {
        activePlans: 0,
        completionRate: 0,
        budgetUtilization: 0,
        skillImprovementRate: 0,
        popularLearningTypes: []
      };
    }

    // Piani attivi
    const activePlans = employeesWithPlans.filter(e => e.developmentPlan?.status === 'active').length;

    // Tasso completamento attività
    let totalActivities = 0;
    let completedActivities = 0;
    let totalBudget = 0;
    let usedBudget = 0;

    const learningTypeCount: Record<string, number> = {};

    employeesWithPlans.forEach(employee => {
      const plan = employee.developmentPlan!;
      totalBudget += plan.budget;

      plan.learningActivities.forEach(activity => {
        totalActivities++;
        
        // Conta tipi learning
        learningTypeCount[activity.type] = (learningTypeCount[activity.type] || 0) + 1;

        if (activity.status === 'completed') {
          completedActivities++;
          usedBudget += activity.cost;
        } else if (activity.status === 'enrolled' || activity.status === 'in_progress') {
          usedBudget += activity.cost;
        }
      });
    });

    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;

    // Popular learning types
    const popularLearningTypes = Object.entries(learningTypeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      activePlans,
      completionRate: Math.round(completionRate),
      budgetUtilization: Math.round(budgetUtilization),
      skillImprovementRate: 78, // Mock data - calcolato da skill assessments
      popularLearningTypes
    };
  }

  /**
   * Helper methods
   */
  private getYearEndDate(): string {
    const date = new Date();
    return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
  }

  private getObjectiveTargetDate(index: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + (3 + index * 2)); // Spread objectives over time
    return date.toISOString().split('T')[0];
  }

  private getCareerGoalTargetDate(index: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + (12 + index * 6)); // 1-2 years spread
    return date.toISOString().split('T')[0];
  }

  private getMilestoneTargetDate(goalIndex: number, monthsFromStart: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromStart);
    return date.toISOString().split('T')[0];
  }

  private hasRelevantExperience(mentor: Employee, mentee: Employee): boolean {
    // Controlla se mentor ha esperienza rilevante per il mentee
    const mentorSeniorityYears = this.calculateSeniorityYears(mentor.dataAssunzione);
    const menteeSeniorityYears = this.calculateSeniorityYears(mentee.dataAssunzione);
    
    return mentorSeniorityYears >= menteeSeniorityYears + 2;
  }

  private isSeniorLevel(posizione: string): boolean {
    const seniorPositions = ['Senior', 'Lead', 'Manager', 'Director', 'Principal'];
    return seniorPositions.some(level => posizione.includes(level));
  }

  private selectBestMentor(potentialMentors: Employee[], mentee: Employee): Employee {
    // Semplice selezione - in realtà userebbe algoritmo di matching più sofisticato
    return potentialMentors.sort((a, b) => {
      const aScore = (a.performanceScore || 0) + this.calculateSeniorityYears(a.dataAssunzione);
      const bScore = (b.performanceScore || 0) + this.calculateSeniorityYears(b.dataAssunzione);
      return bScore - aScore;
    })[0];
  }

  private generateMentorshipFocus(employee: Employee): string[] {
    const roleFocusMap: Record<string, string[]> = {
      'Junior Developer': ['Technical Skills', 'Code Quality', 'Problem Solving', 'Career Planning'],
      'Marketing Manager': ['Strategic Thinking', 'Team Leadership', 'Analytics', 'Campaign Optimization'],
      'HR Specialist': ['Employee Relations', 'Policy Development', 'Conflict Resolution', 'Business Partnership']
    };

    return roleFocusMap[employee.posizione] || ['Professional Growth', 'Communication', 'Leadership'];
  }

  private calculateSeniorityYears(dataAssunzione: string): number {
    const hireDate = new Date(dataAssunzione);
    const now = new Date();
    return Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  private updateDevelopmentPlanProgress(plan: DevelopmentPlan): void {
    const totalActivities = plan.learningActivities.length;
    if (totalActivities === 0) return;

    const completedActivities = plan.learningActivities.filter(a => a.status === 'completed').length;
    const inProgressActivities = plan.learningActivities.filter(a => a.status === 'in_progress' || a.status === 'enrolled').length;
    
    // Progress formula: completed + (in_progress * 0.5)
    const weightedProgress = completedActivities + (inProgressActivities * 0.5);
    plan.progress = Math.round((weightedProgress / totalActivities) * 100);
    plan.lastUpdated = new Date().toISOString();
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

  private scheduleDevelopmentChecks(employeeId: string): void {
    // Pianifica controlli periodici per piani sviluppo
    // In implementazione reale userebbe job scheduler
  }

  // Notification methods
  private async sendDevelopmentPlanCreatedNotification(employee: Employee, plan: DevelopmentPlan): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'development_plan_created',
      priority: 'medium',
      title: `Piano di Sviluppo Creato! 🚀`,
      message: `${employee.nome}, il tuo piano di sviluppo personale è stato creato con budget di €${plan.budget}. Scopri le attività pianificate!`,
      contextData: { employeeId: employee.id, planId: plan.id, budget: plan.budget },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendCareerGoalCompletedNotification(employee: Employee, goal: CareerGoal): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'career_goal_completed',
      priority: 'high',
      title: `Obiettivo di Carriera Raggiunto! 🏆`,
      message: `Complimenti ${employee.nome}! Hai completato l'obiettivo "${goal.title}". Ottimo lavoro!`,
      contextData: { employeeId: employee.id, goalId: goal.id, goalTitle: goal.title },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendCareerProgressNotification(employee: Employee, goal: CareerGoal, progress: number): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'career_progress',
      priority: 'medium',
      title: `Ottimo Progresso! 📈`,
      message: `${employee.nome}, hai fatto grandi progressi nell'obiettivo "${goal.title}" - ${progress}% completato!`,
      contextData: { employeeId: employee.id, goalId: goal.id, progress },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true }
      ],
      autoGenerated: true
    });
  }

  private async sendLearningActivityCompletedNotification(employee: Employee, activity: LearningActivity): Promise<void> {
    await smartNotificationService.createCustomNotification({
      type: 'learning_completed',
      priority: 'medium',
      title: `Formazione Completata! 🎓`,
      message: `${employee.nome}, hai completato "${activity.title}". ${activity.certificate ? 'Certificazione ottenuta!' : 'Complimenti per l\'impegno!'}`,
      contextData: { 
        employeeId: employee.id, 
        activityId: activity.id, 
        activityTitle: activity.title,
        certificate: activity.certificate,
        rating: activity.rating
      },
      relatedEmployeeId: employee.id,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: activity.certificate } // Email per certificazioni
      ],
      autoGenerated: true
    });
  }
}

// Export singleton instance
export const careerDevelopmentEngine = CareerDevelopmentEngine.getInstance();