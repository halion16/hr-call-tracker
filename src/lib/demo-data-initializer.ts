import { Employee, CompanyEvent } from '@/types';
import { LocalStorage } from './storage';
import { autoSchedulingEngine } from './auto-scheduling-engine';
import { generateId } from './utils';

/**
 * Inizializza dati demo per testare il Workflow Automation System
 */
export class DemoDataInitializer {
  
  /**
   * Inizializza dipendenti con dati realistici per testing
   */
  static initializeEmployeesWithPerformanceData(): void {
    const existingEmployees = LocalStorage.getEmployees();
    
    // Se ci sono già dipendenti, aggiorniamo i loro dati con performance info
    if (existingEmployees.length > 0) {
      const updatedEmployees = existingEmployees.map((employee, index) => ({
        ...employee,
        // Aggiungi dati performance realistici
        performanceScore: this.getRandomPerformanceScore(index),
        lastPerformanceReview: this.getRandomPastDate(30, 180),
        contractExpiryDate: this.getRandomFutureDate(30, 400),
        riskLevel: this.calculateRiskLevel(index),
        preferredCallFrequency: this.getRandomFrequency(),
        lastCallRating: Math.floor(Math.random() * 3) + 3, // 3-5
        averageCallRating: Math.floor(Math.random() * 2) + 3.5, // 3.5-5
        totalCalls: Math.floor(Math.random() * 20) + 5 // 5-25
      })) as Employee[];

      LocalStorage.saveEmployees(updatedEmployees);
      console.log('✅ Updated employees with performance data');
    } else {
      // Crea dipendenti demo se non esistono
      this.createDemoEmployees();
    }
  }

  /**
   * Crea dipendenti demo con dati completi
   */
  private static createDemoEmployees(): void {
    const demoEmployees: Employee[] = [
      {
        id: generateId(),
        nome: 'Marco',
        cognome: 'Rossi',
        email: 'marco.rossi@company.com',
        posizione: 'Senior Developer',
        dipartimento: 'IT',
        dataAssunzione: '2020-03-15',
        telefono: '+39 333 123 4567',
        isActive: true,
        performanceScore: 8.5,
        lastPerformanceReview: '2024-10-15',
        contractExpiryDate: '2025-12-31',
        riskLevel: 'low',
        preferredCallFrequency: 'monthly',
        lastCallRating: 5,
        averageCallRating: 4.5,
        totalCalls: 15
      },
      {
        id: generateId(),
        nome: 'Sofia',
        cognome: 'Bianchi',
        email: 'sofia.bianchi@company.com',
        posizione: 'Marketing Manager',
        dipartimento: 'Marketing',
        dataAssunzione: '2019-06-20',
        telefono: '+39 333 234 5678',
        isActive: true,
        performanceScore: 3.2, // Performance critica
        lastPerformanceReview: '2024-08-10',
        contractExpiryDate: '2025-01-15', // Contratto in scadenza
        riskLevel: 'high',
        preferredCallFrequency: 'weekly',
        lastCallRating: 2,
        averageCallRating: 2.5,
        totalCalls: 8
      },
      {
        id: generateId(),
        nome: 'Alessandro',
        cognome: 'Verdi',
        email: 'alessandro.verdi@company.com',
        posizione: 'Sales Representative',
        dipartimento: 'Sales',
        dataAssunzione: '2021-01-10',
        telefono: '+39 333 345 6789',
        isActive: true,
        performanceScore: 6.8,
        lastPerformanceReview: '2024-09-05',
        contractExpiryDate: '2026-01-10',
        riskLevel: 'medium',
        preferredCallFrequency: 'biweekly',
        lastCallRating: 3,
        averageCallRating: 3.8,
        totalCalls: 12
      },
      {
        id: generateId(),
        nome: 'Giulia',
        cognome: 'Ferrari',
        email: 'giulia.ferrari@company.com',
        posizione: 'HR Specialist',
        dipartimento: 'HR',
        dataAssunzione: '2022-05-01',
        telefono: '+39 333 456 7890',
        isActive: true,
        performanceScore: 9.1,
        lastPerformanceReview: '2024-11-01',
        contractExpiryDate: '2027-05-01',
        riskLevel: 'low',
        preferredCallFrequency: 'monthly',
        lastCallRating: 5,
        averageCallRating: 4.8,
        totalCalls: 20
      },
      {
        id: generateId(),
        nome: 'Lorenzo',
        cognome: 'Romano',
        email: 'lorenzo.romano@company.com',
        posizione: 'Junior Developer',
        dipartimento: 'IT',
        dataAssunzione: '2023-09-15',
        telefono: '+39 333 567 8901',
        isActive: true,
        performanceScore: 5.5,
        lastPerformanceReview: '2024-08-20',
        contractExpiryDate: '2025-02-28', // Contratto in scadenza presto
        riskLevel: 'medium',
        preferredCallFrequency: 'weekly',
        lastCallRating: 4,
        averageCallRating: 4.2,
        totalCalls: 6
      },
      {
        id: generateId(),
        nome: 'Francesca',
        cognome: 'Conti',
        email: 'francesca.conti@company.com',
        posizione: 'Project Manager',
        dipartimento: 'Operations',
        dataAssunzione: '2018-11-12',
        telefono: '+39 333 678 9012',
        isActive: true,
        performanceScore: 7.8,
        lastPerformanceReview: '2024-10-30',
        contractExpiryDate: '2025-11-12',
        riskLevel: 'low',
        preferredCallFrequency: 'monthly',
        lastCallRating: 4,
        averageCallRating: 4.3,
        totalCalls: 25
      }
    ];

    LocalStorage.saveEmployees(demoEmployees);
    console.log('✅ Created demo employees with performance data');
  }

  /**
   * Inizializza eventi aziendali demo
   */
  static initializeCompanyEvents(): void {
    const demoEvents: Omit<CompanyEvent, 'id'>[] = [
      {
        title: 'Performance Review Cycle Q1 2025',
        date: '2025-01-15',
        type: 'review_cycle',
        impactsEmployees: true,
        affectedDepartments: ['IT', 'Marketing', 'Sales', 'HR'],
        description: 'Ciclo di valutazione performance per il primo trimestre 2025'
      },
      {
        title: 'Budget Planning 2025',
        date: '2025-02-01',
        type: 'budget_planning',
        impactsEmployees: true,
        affectedDepartments: ['Operations', 'IT', 'Marketing'],
        description: 'Pianificazione budget e allocazione risorse 2025'
      },
      {
        title: 'Restructuring IT Department',
        date: '2025-01-20',
        type: 'restructuring',
        impactsEmployees: true,
        affectedDepartments: ['IT'],
        description: 'Riorganizzazione del dipartimento IT'
      },
      {
        title: 'Sales Training Workshop',
        date: '2025-01-25',
        type: 'training',
        impactsEmployees: true,
        affectedDepartments: ['Sales'],
        description: 'Workshop di formazione per il team vendite'
      }
    ];

    // Aggiungi eventi usando l'autoSchedulingEngine
    demoEvents.forEach(event => {
      autoSchedulingEngine.addCompanyEvent(event);
    });

    console.log('✅ Initialized company events');
  }

  /**
   * Genera score performance realistico
   */
  private static getRandomPerformanceScore(index: number): number {
    // Crea una distribuzione realistica di performance
    const distributions = [8.5, 3.2, 6.8, 9.1, 5.5, 7.8, 4.1, 8.2, 6.3, 7.5];
    return distributions[index % distributions.length] || Math.random() * 4 + 6;
  }

  /**
   * Genera data passata random
   */
  private static getRandomPastDate(minDays: number, maxDays: number): string {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * (maxDays - minDays) + minDays);
    const pastDate = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
    return pastDate.toISOString().split('T')[0];
  }

  /**
   * Genera data futura random
   */
  private static getRandomFutureDate(minDays: number, maxDays: number): string {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * (maxDays - minDays) + minDays);
    const futureDate = new Date(now.getTime() + (randomDays * 24 * 60 * 60 * 1000));
    return futureDate.toISOString().split('T')[0];
  }

  /**
   * Calcola livello di rischio basato sull'indice
   */
  private static calculateRiskLevel(index: number): 'low' | 'medium' | 'high' {
    const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'high', 'medium', 'low', 'medium', 'low'];
    return riskLevels[index % riskLevels.length] || 'medium';
  }

  /**
   * Genera frequenza call random
   */
  private static getRandomFrequency(): 'weekly' | 'biweekly' | 'monthly' | 'quarterly' {
    const frequencies: Array<'weekly' | 'biweekly' | 'monthly' | 'quarterly'> = ['weekly', 'biweekly', 'monthly', 'quarterly'];
    return frequencies[Math.floor(Math.random() * frequencies.length)];
  }

  /**
   * Inizializza tutti i dati demo
   */
  static initializeAllDemoData(): void {
    console.log('🎭 Initializing demo data for Workflow Automation...');
    
    this.initializeEmployeesWithPerformanceData();
    this.initializeCompanyEvents();
    
    console.log('✅ Demo data initialization completed');
  }
}