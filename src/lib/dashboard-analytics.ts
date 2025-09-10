import { Call, Employee } from '@/types';
import { LocalStorage } from './storage';
import { isToday, isThisWeek, formatDate } from './utils';

export interface DashboardMetrics {
  todayCallsProgress: {
    completed: number;
    scheduled: number;
    percentage: number;
  };
  weekCallsProgress: {
    completed: number;
    scheduled: number;
    percentage: number;
  };
  topEmployees: Array<{
    employee: Employee;
    totalCalls: number;
    completedCalls: number;
    completionRate: number;
  }>;
  outcomesTrend: Array<{
    outcome: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  overdueCalls: Array<{
    call: Call;
    employee: Employee;
    daysOverdue: number;
  }>;
  quickStats: {
    avgCallDuration: number;
    completionRate: number;
    totalCallsThisMonth: number;
    avgResponseTime: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    count?: number;
  }>;
}

export class DashboardAnalyticsService {
  static calculateMetrics(): DashboardMetrics {
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    const now = new Date();

    // Today's calls progress
    const todayCalls = calls.filter(call => 
      call.dataSchedulata && isToday(call.dataSchedulata)
    );
    const todayCompleted = todayCalls.filter(call => call.status === 'completed');
    
    // Week's calls progress  
    const weekCalls = calls.filter(call => 
      call.dataSchedulata && isThisWeek(call.dataSchedulata)
    );
    const weekCompleted = weekCalls.filter(call => call.status === 'completed');

    // Top employees by call activity
    const employeeStats = employees.map(employee => {
      const employeeCalls = calls.filter(call => call.employeeId === employee.id);
      const completedCalls = employeeCalls.filter(call => call.status === 'completed');
      
      return {
        employee,
        totalCalls: employeeCalls.length,
        completedCalls: completedCalls.length,
        completionRate: employeeCalls.length > 0 ? 
          Math.round((completedCalls.length / employeeCalls.length) * 100) : 0
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 5);

    // Outcomes trend analysis
    const completedCalls = calls.filter(call => call.status === 'completed');
    const outcomeGroups = completedCalls.reduce((acc, call) => {
      const outcome = call.esito || 'Non specificato';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const outcomesTrend = Object.entries(outcomeGroups).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: Math.round((count / completedCalls.length) * 100),
      trend: 'stable' as const // TODO: implementare calcolo trend reale
    })).sort((a, b) => b.count - a.count);

    // Overdue calls (scheduled but not completed after 24h)
    const overdueCalls = calls
      .filter(call => {
        if (call.status === 'completed' || !call.dataSchedulata) return false;
        const scheduledDate = new Date(call.dataSchedulata);
        const hoursSinceScheduled = (now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceScheduled > 24;
      })
      .map(call => {
        const employee = employees.find(emp => emp.id === call.employeeId);
        const scheduledDate = new Date(call.dataSchedulata);
        const daysOverdue = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          call,
          employee: employee!,
          daysOverdue
        };
      })
      .filter(item => item.employee)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Quick stats calculation
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCalls = calls.filter(call => 
      call.dataCompletata && new Date(call.dataCompletata) >= thisMonthStart
    );
    
    const totalCompletedCalls = calls.filter(call => call.status === 'completed');
    const completionRate = calls.length > 0 ? 
      Math.round((totalCompletedCalls.length / calls.length) * 100) : 0;

    // Calcolo durata media (simulata)
    const avgCallDuration = completedCalls.length > 0 ? 
      Math.round(Math.random() * 30 + 15) : 0; // 15-45 min

    // Calcolo tempo di risposta medio (simulato)
    const avgResponseTime = calls.length > 0 ? 
      Math.round(Math.random() * 3 + 1) : 0; // 1-4 giorni

    // Generate alerts
    const alerts = [];
    
    if (overdueCalls.length > 0) {
      alerts.push({
        id: 'overdue-calls',
        type: 'error' as const,
        title: 'Call in ritardo',
        message: `Ci sono ${overdueCalls.length} call non completate oltre la scadenza`,
        count: overdueCalls.length
      });
    }

    if (todayCalls.length > 0 && todayCompleted.length === 0) {
      alerts.push({
        id: 'no-calls-today',
        type: 'warning' as const,
        title: 'Nessuna call completata oggi',
        message: `Sono programmate ${todayCalls.length} call per oggi`,
        count: todayCalls.length
      });
    }

    const lowPerformanceEmployees = employeeStats.filter(emp => 
      emp.totalCalls >= 3 && emp.completionRate < 50
    );
    
    if (lowPerformanceEmployees.length > 0) {
      alerts.push({
        id: 'low-performance',
        type: 'warning' as const,
        title: 'Dipendenti con basso tasso di completamento',
        message: `${lowPerformanceEmployees.length} dipendenti hanno un tasso di completamento < 50%`,
        count: lowPerformanceEmployees.length
      });
    }

    if (calls.length > 0 && completionRate > 90) {
      alerts.push({
        id: 'high-performance',
        type: 'info' as const,
        title: 'Ottima performance!',
        message: `Tasso di completamento del ${completionRate}%`
      });
    }

    return {
      todayCallsProgress: {
        completed: todayCompleted.length,
        scheduled: todayCalls.length,
        percentage: todayCalls.length > 0 ? 
          Math.round((todayCompleted.length / todayCalls.length) * 100) : 0
      },
      weekCallsProgress: {
        completed: weekCompleted.length,
        scheduled: weekCalls.length,
        percentage: weekCalls.length > 0 ? 
          Math.round((weekCompleted.length / weekCalls.length) * 100) : 0
      },
      topEmployees: employeeStats,
      outcomesTrend,
      overdueCalls: overdueCalls.slice(0, 10),
      quickStats: {
        avgCallDuration,
        completionRate,
        totalCallsThisMonth: thisMonthCalls.length,
        avgResponseTime
      },
      alerts: alerts.slice(0, 5)
    };
  }

  static getPerformanceTrend(days: number = 7): Array<{
    date: string;
    completed: number;
    scheduled: number;
  }> {
    const calls = LocalStorage.getCalls();
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayKey = formatDate(date);
      const dayCalls = calls.filter(call => 
        call.dataSchedulata && formatDate(call.dataSchedulata) === dayKey
      );
      const dayCompleted = dayCalls.filter(call => call.status === 'completed');
      
      result.push({
        date: dayKey,
        completed: dayCompleted.length,
        scheduled: dayCalls.length
      });
    }
    
    return result;
  }

  static getPriorityDistribution(): Array<{
    priority: 'high' | 'medium' | 'low';
    count: number;
    percentage: number;
  }> {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    
    const priorities = { high: 0, medium: 0, low: 0 };
    
    calls.forEach(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      if (employee) {
        // TODO: integrare con priority config service
        const priority = 'low'; // placeholder
        priorities[priority]++;
      }
    });
    
    const total = Object.values(priorities).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(priorities).map(([priority, count]) => ({
      priority: priority as 'high' | 'medium' | 'low',
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }
}