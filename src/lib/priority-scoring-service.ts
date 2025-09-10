// Intelligent Priority Scoring Service for Employee Call Management
import { Employee, Call } from '@/types';
import { LocalStorage } from './storage';

export interface PriorityScore {
  employeeId: string;
  totalScore: number;
  factors: {
    performanceScore: number;
    interactionFrequency: number;
    urgencyScore: number;
    riskScore: number;
    engagementScore: number;
  };
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
  lastUpdated: Date;
}

export interface PriorityRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  category: 'performance' | 'frequency' | 'urgency' | 'risk' | 'engagement';
}

export class PriorityService {
  private static instance: PriorityService;
  private defaultRules: PriorityRule[] = [
    {
      id: 'recent-performance',
      name: 'Performance Recente',
      description: 'Score basato su rating delle ultime chiamate',
      weight: 0.25,
      enabled: true,
      category: 'performance'
    },
    {
      id: 'call-frequency',
      name: 'Frequenza Chiamate',
      description: 'Frequenza di interazione negli ultimi 30 giorni',
      weight: 0.15,
      enabled: true,
      category: 'frequency'
    },
    {
      id: 'overdue-calls',
      name: 'Chiamate in Ritardo',
      description: 'Presenza di chiamate scadute o rimandate',
      weight: 0.2,
      enabled: true,
      category: 'urgency'
    },
    {
      id: 'performance-decline',
      name: 'Declino Performance',
      description: 'Trend negativo nelle ultime valutazioni',
      weight: 0.15,
      enabled: true,
      category: 'risk'
    },
    {
      id: 'engagement-level',
      name: 'Livello Engagement',
      description: 'Partecipazione e coinvolgimento nelle chiamate',
      weight: 0.15,
      enabled: true,
      category: 'engagement'
    },
    {
      id: 'long-absence',
      name: 'Assenza Prolungata',
      description: 'Lungo periodo senza chiamate programmate',
      weight: 0.1,
      enabled: true,
      category: 'risk'
    }
  ];

  private constructor() {}

  static getInstance(): PriorityService {
    if (!PriorityService.instance) {
      PriorityService.instance = new PriorityService();
    }
    return PriorityService.instance;
  }

  // Calculate comprehensive priority score for an employee
  calculateEmployeePriority(employee: Employee): PriorityScore {
    const calls = LocalStorage.getCalls().filter(call => call.employeeId === employee.id);
    const rules = this.getActiveRules();
    
    const factors = {
      performanceScore: this.calculatePerformanceScore(calls),
      interactionFrequency: this.calculateInteractionFrequency(calls),
      urgencyScore: this.calculateUrgencyScore(calls),
      riskScore: this.calculateRiskScore(calls, employee),
      engagementScore: this.calculateEngagementScore(calls)
    };

    // Calculate weighted total score
    const totalScore = this.calculateWeightedScore(factors, rules);
    
    const priority = this.determinePriorityLevel(totalScore);
    const recommendations = this.generateRecommendations(factors, employee, calls);

    return {
      employeeId: employee.id,
      totalScore,
      factors,
      priority,
      recommendations,
      lastUpdated: new Date()
    };
  }

  // Calculate performance score based on recent call ratings
  private calculatePerformanceScore(calls: Call[]): number {
    const recentCalls = calls
      .filter(call => call.status === 'completed' && call.rating)
      .slice(-5); // Last 5 completed calls
    
    if (recentCalls.length === 0) return 50; // Neutral score if no data
    
    const avgRating = recentCalls.reduce((sum, call) => sum + (call.rating || 0), 0) / recentCalls.length;
    
    // Convert 1-5 rating to 0-100 score (inverted - lower rating = higher priority)
    return Math.max(0, 100 - (avgRating - 1) * 25);
  }

  // Calculate interaction frequency score
  private calculateInteractionFrequency(calls: Call[]): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCalls = calls.filter(call => 
      new Date(call.dataSchedulata) >= thirtyDaysAgo
    );
    
    // Optimal frequency is 2-4 calls per month
    const frequency = recentCalls.length;
    
    if (frequency === 0) return 90; // High priority if no recent calls
    if (frequency >= 2 && frequency <= 4) return 20; // Low priority if optimal
    if (frequency === 1) return 60; // Medium priority
    return Math.min(40, frequency * 5); // Increasing priority with too many calls
  }

  // Calculate urgency score based on overdue/rescheduled calls
  private calculateUrgencyScore(calls: Call[]): number {
    const now = new Date();
    const overdueCalls = calls.filter(call => 
      call.status === 'scheduled' && new Date(call.dataSchedulata) < now
    );
    
    const rescheduledCalls = calls.filter(call => 
      call.status === 'scheduled' && call.rescheduledCount && call.rescheduledCount > 0
    );
    
    let urgencyScore = 0;
    
    // Add points for overdue calls
    urgencyScore += overdueCalls.length * 30;
    
    // Add points for rescheduled calls
    urgencyScore += rescheduledCalls.reduce((sum, call) => 
      sum + (call.rescheduledCount || 0) * 15, 0
    );
    
    return Math.min(100, urgencyScore);
  }

  // Calculate risk score based on performance trends and patterns
  private calculateRiskScore(calls: Call[], employee: Employee): number {
    const completedCalls = calls
      .filter(call => call.status === 'completed' && call.rating)
      .sort((a, b) => new Date(a.dataCompletata || a.dataSchedulata).getTime() - 
                     new Date(b.dataCompletata || b.dataSchedulata).getTime());
    
    if (completedCalls.length < 2) return 30; // Neutral risk if insufficient data
    
    let riskScore = 0;
    
    // Analyze performance trend
    const recentRatings = completedCalls.slice(-3).map(call => call.rating || 0);
    const olderRatings = completedCalls.slice(-6, -3).map(call => call.rating || 0);
    
    if (recentRatings.length > 0 && olderRatings.length > 0) {
      const recentAvg = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length;
      const olderAvg = olderRatings.reduce((a, b) => a + b, 0) / olderRatings.length;
      
      if (recentAvg < olderAvg) {
        riskScore += (olderAvg - recentAvg) * 20; // Declining performance
      }
    }
    
    // Check for long gaps between calls
    const lastCall = calls
      .filter(call => call.status === 'completed')
      .sort((a, b) => new Date(b.dataCompletata || b.dataSchedulata).getTime() - 
                     new Date(a.dataCompletata || a.dataSchedulata).getTime())[0];
    
    if (lastCall) {
      const daysSinceLastCall = Math.floor(
        (Date.now() - new Date(lastCall.dataCompletata || lastCall.dataSchedulata).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastCall > 60) {
        riskScore += Math.min(40, daysSinceLastCall - 60);
      }
    }
    
    return Math.min(100, riskScore);
  }

  // Calculate engagement score based on call outcomes and notes
  private calculateEngagementScore(calls: Call[]): number {
    const completedCalls = calls.filter(call => call.status === 'completed');
    
    if (completedCalls.length === 0) return 50; // Neutral if no data
    
    let engagementScore = 0;
    let factors = 0;
    
    // Check for detailed notes (engagement indicator)
    const callsWithNotes = completedCalls.filter(call => 
      call.note && call.note.length > 50
    );
    engagementScore += (callsWithNotes.length / completedCalls.length) * 30;
    factors++;
    
    // Check for follow-up calls (engagement indicator)
    const callsWithFollowup = completedCalls.filter(call => call.nextCallDate);
    engagementScore += (callsWithFollowup.length / completedCalls.length) * 25;
    factors++;
    
    // Check for proactive scheduling (low cancellation rate)
    const cancelledCalls = calls.filter(call => call.status === 'cancelled').length;
    const totalCalls = calls.length;
    if (totalCalls > 0) {
      const cancellationRate = cancelledCalls / totalCalls;
      engagementScore += Math.max(0, (1 - cancellationRate) * 25);
      factors++;
    }
    
    // Average the engagement factors
    const avgEngagement = factors > 0 ? engagementScore / factors : 50;
    
    // Invert score (lower engagement = higher priority)
    return Math.max(0, 100 - avgEngagement);
  }

  // Calculate weighted total score
  private calculateWeightedScore(
    factors: PriorityScore['factors'], 
    rules: PriorityRule[]
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    const rulesByCategory = new Map(rules.map(rule => [rule.category, rule]));
    
    // Performance
    const perfRule = rulesByCategory.get('performance');
    if (perfRule?.enabled) {
      weightedSum += factors.performanceScore * perfRule.weight;
      totalWeight += perfRule.weight;
    }
    
    // Frequency
    const freqRule = rulesByCategory.get('frequency');
    if (freqRule?.enabled) {
      weightedSum += factors.interactionFrequency * freqRule.weight;
      totalWeight += freqRule.weight;
    }
    
    // Urgency
    const urgRule = rulesByCategory.get('urgency');
    if (urgRule?.enabled) {
      weightedSum += factors.urgencyScore * urgRule.weight;
      totalWeight += urgRule.weight;
    }
    
    // Risk
    const riskRule = rulesByCategory.get('risk');
    if (riskRule?.enabled) {
      weightedSum += factors.riskScore * riskRule.weight;
      totalWeight += riskRule.weight;
    }
    
    // Engagement
    const engRule = rulesByCategory.get('engagement');
    if (engRule?.enabled) {
      weightedSum += factors.engagementScore * engRule.weight;
      totalWeight += engRule.weight;
    }
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  }

  // Determine priority level based on score
  private determinePriorityLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  // Generate actionable recommendations
  private generateRecommendations(
    factors: PriorityScore['factors'], 
    employee: Employee, 
    calls: Call[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (factors.performanceScore > 60) {
      recommendations.push('Performance in calo - programmare call di supporto');
    }
    
    if (factors.interactionFrequency > 70) {
      recommendations.push('Poche interazioni recenti - schedulare call di check-in');
    }
    
    if (factors.urgencyScore > 50) {
      recommendations.push('Chiamate in ritardo - rischedulare immediatamente');
    }
    
    if (factors.riskScore > 60) {
      recommendations.push('Possibile rischio turnover - call prioritaria HR');
    }
    
    if (factors.engagementScore > 60) {
      recommendations.push('Basso engagement - focus su motivazione e obiettivi');
    }
    
    const overdueCalls = calls.filter(call => 
      call.status === 'scheduled' && new Date(call.dataSchedulata) < new Date()
    );
    
    if (overdueCalls.length > 0) {
      recommendations.push(`${overdueCalls.length} chiamate scadute da riprogrammare`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Situazione stabile - mantenere cadenza regolare');
    }
    
    return recommendations;
  }

  // Get all employee priorities sorted by score
  getAllEmployeePriorities(): PriorityScore[] {
    const employees = LocalStorage.getEmployees().filter(emp => emp.isActive);
    const priorities = employees.map(emp => this.calculateEmployeePriority(emp));
    
    return priorities.sort((a, b) => b.totalScore - a.totalScore);
  }

  // Get high priority employees
  getHighPriorityEmployees(): PriorityScore[] {
    return this.getAllEmployeePriorities().filter(p => p.priority === 'high');
  }

  // Get priority rules configuration
  getPriorityRules(): PriorityRule[] {
    const stored = localStorage.getItem('hr-tracker-priority-rules');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to load priority rules, using defaults');
      }
    }
    return [...this.defaultRules];
  }

  // Update priority rules
  updatePriorityRules(rules: PriorityRule[]): void {
    try {
      localStorage.setItem('hr-tracker-priority-rules', JSON.stringify(rules));
    } catch (error) {
      console.warn('Failed to save priority rules');
    }
  }

  // Get active rules only
  private getActiveRules(): PriorityRule[] {
    return this.getPriorityRules().filter(rule => rule.enabled);
  }

  // Get priority statistics
  getPriorityStats(): {
    high: number;
    medium: number;
    low: number;
    avgScore: number;
    totalEmployees: number;
  } {
    const priorities = this.getAllEmployeePriorities();
    
    const stats = {
      high: priorities.filter(p => p.priority === 'high').length,
      medium: priorities.filter(p => p.priority === 'medium').length,
      low: priorities.filter(p => p.priority === 'low').length,
      avgScore: priorities.length > 0 
        ? Math.round(priorities.reduce((sum, p) => sum + p.totalScore, 0) / priorities.length)
        : 0,
      totalEmployees: priorities.length
    };
    
    return stats;
  }
}

// Export singleton instance
export const priorityService = PriorityService.getInstance();