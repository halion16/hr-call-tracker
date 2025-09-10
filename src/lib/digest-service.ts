import { Call, Employee } from '@/types';
import { LocalStorage } from './storage';
import { NotificationService, DigestData } from './notification-service';
import { formatDate, formatDateTime, isToday, isThisWeek } from './utils';

export interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // HH:MM format
  recipients: string[]; // Manager emails
  includeStats: boolean;
  includeTopEmployees: boolean;
  includeAlerts: boolean;
  includeUpcoming: boolean;
  includeTrends: boolean;
}

export interface DigestSchedule {
  id: string;
  type: 'daily' | 'weekly';
  scheduledFor: Date;
  lastSent?: Date;
  status: 'pending' | 'sent' | 'failed';
}

const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  enabled: false,
  frequency: 'daily',
  time: '09:00',
  recipients: [],
  includeStats: true,
  includeTopEmployees: true,
  includeAlerts: true,
  includeUpcoming: true,
  includeTrends: false
};

export class DigestService {
  private static readonly STORAGE_KEY = 'hr-tracker-digest-settings';
  private static readonly SCHEDULE_KEY = 'hr-tracker-digest-schedule';
  
  // Settings management
  static getSettings(): DigestSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? { ...DEFAULT_DIGEST_SETTINGS, ...JSON.parse(saved) } : DEFAULT_DIGEST_SETTINGS;
  }

  static saveSettings(settings: DigestSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    
    // Reschedule digests if settings changed
    if (settings.enabled) {
      this.scheduleNextDigests();
    } else {
      this.cancelAllScheduledDigests();
    }
  }

  // Schedule management
  static getScheduledDigests(): DigestSchedule[] {
    const saved = localStorage.getItem(this.SCHEDULE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  private static saveScheduledDigests(schedules: DigestSchedule[]): void {
    localStorage.setItem(this.SCHEDULE_KEY, JSON.stringify(schedules));
  }

  static scheduleNextDigests(): void {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const schedules = this.getScheduledDigests();
    const now = new Date();
    
    // Remove old schedules
    const activeSchedules = schedules.filter(schedule => 
      schedule.status === 'pending' && new Date(schedule.scheduledFor) > now
    );

    // Schedule next digest
    const nextDigestTime = this.calculateNextDigestTime(settings);
    
    // Check if we already have a digest scheduled for this time
    const existingSchedule = activeSchedules.find(schedule => 
      schedule.type === settings.frequency &&
      Math.abs(new Date(schedule.scheduledFor).getTime() - nextDigestTime.getTime()) < 60000 // Within 1 minute
    );

    if (!existingSchedule) {
      const newSchedule: DigestSchedule = {
        id: `digest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: settings.frequency,
        scheduledFor: nextDigestTime,
        status: 'pending'
      };
      
      activeSchedules.push(newSchedule);
    }

    // Schedule weekly digest if daily is enabled (for comparison)
    if (settings.frequency === 'daily') {
      const weeklyTime = this.calculateNextWeeklyDigestTime(settings);
      const existingWeekly = activeSchedules.find(schedule => 
        schedule.type === 'weekly' &&
        Math.abs(new Date(schedule.scheduledFor).getTime() - weeklyTime.getTime()) < 60000
      );

      if (!existingWeekly) {
        activeSchedules.push({
          id: `digest_weekly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'weekly',
          scheduledFor: weeklyTime,
          status: 'pending'
        });
      }
    }

    this.saveScheduledDigests(activeSchedules);
  }

  private static calculateNextDigestTime(settings: DigestSettings): Date {
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    let nextTime = new Date();
    nextTime.setHours(hours, minutes, 0, 0);
    
    if (settings.frequency === 'daily') {
      // If time has passed today, schedule for tomorrow
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1);
      }
    } else { // weekly
      // Schedule for next Monday
      const daysUntilMonday = (8 - nextTime.getDay()) % 7 || 7;
      nextTime.setDate(nextTime.getDate() + daysUntilMonday);
      
      // If it's Monday and time hasn't passed, keep today
      if (now.getDay() === 1 && nextTime > now) {
        nextTime = new Date();
        nextTime.setHours(hours, minutes, 0, 0);
      }
    }
    
    return nextTime;
  }

  private static calculateNextWeeklyDigestTime(settings: DigestSettings): Date {
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    let nextMonday = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(hours, minutes, 0, 0);
    
    return nextMonday;
  }

  static cancelAllScheduledDigests(): void {
    this.saveScheduledDigests([]);
  }

  // Digest generation
  static generateDailyDigest(): DigestData {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    return this.generateDigest(startOfDay, today, 'daily');
  }

  static generateWeeklyDigest(): DigestData {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    return this.generateDigest(startOfWeek, now, 'weekly');
  }

  private static generateDigest(startDate: Date, endDate: Date, period: 'daily' | 'weekly'): DigestData {
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    
    // Filter calls for the period
    const periodCalls = calls.filter(call => {
      const callDate = new Date(call.dataSchedulata);
      return callDate >= startDate && callDate <= endDate;
    });

    const completedCalls = periodCalls.filter(call => call.status === 'completed');
    const pendingCalls = periodCalls.filter(call => call.status === 'scheduled');
    
    // Calculate overdue calls
    const overdueCalls = calls.filter(call => {
      if (call.status === 'completed') return false;
      const callDate = new Date(call.dataSchedulata);
      const hoursOverdue = (endDate.getTime() - callDate.getTime()) / (1000 * 60 * 60);
      return hoursOverdue > 24;
    });

    // Stats
    const stats = {
      totalCalls: periodCalls.length,
      completedCalls: completedCalls.length,
      pendingCalls: pendingCalls.length,
      overdueCalls: overdueCalls.length,
      completionRate: periodCalls.length > 0 ? 
        Math.round((completedCalls.length / periodCalls.length) * 100) : 0
    };

    // Top employees
    const employeeStats = employees.map(employee => {
      const employeeCalls = periodCalls.filter(call => call.employeeId === employee.id);
      const employeeCompleted = employeeCalls.filter(call => call.status === 'completed');
      
      return {
        employee,
        callsCount: employeeCalls.length,
        completionRate: employeeCalls.length > 0 ? 
          Math.round((employeeCompleted.length / employeeCalls.length) * 100) : 0
      };
    }).filter(emp => emp.callsCount > 0)
      .sort((a, b) => b.callsCount - a.callsCount)
      .slice(0, 5);

    // Alerts
    const alerts = [];
    
    if (overdueCalls.length > 0) {
      alerts.push({
        type: 'overdue' as const,
        count: overdueCalls.length,
        message: `${overdueCalls.length} call in ritardo oltre le 24 ore`
      });
    }

    if (stats.completionRate < 70 && periodCalls.length >= 5) {
      alerts.push({
        type: 'performance' as const,
        count: 0,
        message: `Tasso di completamento basso: ${stats.completionRate}%`
      });
    }

    const missedCalls = pendingCalls.filter(call => {
      const callDate = new Date(call.dataSchedulata);
      return callDate < endDate;
    });
    
    if (missedCalls.length > 0) {
      alerts.push({
        type: 'missed' as const,
        count: missedCalls.length,
        message: `${missedCalls.length} call non completate nel periodo`
      });
    }

    // Upcoming calls (next 7 days)
    const nextWeek = new Date(endDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingCalls = calls.filter(call => {
      if (call.status !== 'scheduled') return false;
      const callDate = new Date(call.dataSchedulata);
      return callDate > endDate && callDate <= nextWeek;
    }).map(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      const hoursUntil = Math.round((new Date(call.dataSchedulata).getTime() - endDate.getTime()) / (1000 * 60 * 60));
      
      return {
        call,
        employee: employee!,
        hoursUntil
      };
    }).filter(item => item.employee)
      .sort((a, b) => a.hoursUntil - b.hoursUntil)
      .slice(0, 10);

    return {
      period: period === 'daily' ? formatDate(startDate) : 
        `${formatDate(startDate)} - ${formatDate(endDate)}`,
      stats,
      topEmployees: employeeStats,
      alerts,
      upcomingCalls
    };
  }

  // Digest processing and sending
  static async processScheduledDigests(): Promise<void> {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const schedules = this.getScheduledDigests();
    const now = new Date();

    const dueDigests = schedules.filter(schedule => 
      schedule.status === 'pending' && new Date(schedule.scheduledFor) <= now
    );

    for (const digest of dueDigests) {
      try {
        await this.sendDigest(digest.type);
        
        // Mark as sent
        digest.status = 'sent';
        digest.lastSent = now;
        
        // Schedule next digest
        if (settings.frequency === digest.type) {
          this.scheduleNextDigests();
        }
        
      } catch (error) {
        console.error('Failed to send digest:', digest.id, error);
        digest.status = 'failed';
      }
    }

    this.saveScheduledDigests(schedules);
  }

  private static async sendDigest(type: 'daily' | 'weekly'): Promise<void> {
    const settings = this.getSettings();
    const digestData = type === 'daily' ? 
      this.generateDailyDigest() : this.generateWeeklyDigest();

    // Generate digest content
    const title = `HR Call Tracker - Digest ${type === 'daily' ? 'Giornaliero' : 'Settimanale'}`;
    const content = this.formatDigestContent(digestData, settings);

    // Send notification
    const notification = NotificationService.createNotification(
      'digest',
      title,
      content.summary,
      new Date(),
      {
        priority: 'medium',
        metadata: {
          digestType: type,
          digestData,
          fullContent: content.full
        }
      }
    );

    console.log('Digest sent:', notification);
  }

  private static formatDigestContent(data: DigestData, settings: DigestSettings): {
    summary: string;
    full: string;
  } {
    let summary = `Periodo: ${data.period}`;
    
    if (settings.includeStats) {
      summary += ` • ${data.stats.completedCalls}/${data.stats.totalCalls} call completate (${data.stats.completionRate}%)`;
    }

    if (settings.includeAlerts && data.alerts.length > 0) {
      summary += ` • ${data.alerts.length} alert attivi`;
    }

    // Full content for detailed view
    let full = `# HR Call Tracker - Digest ${data.period}\n\n`;

    if (settings.includeStats) {
      full += `## 📊 Statistiche\n`;
      full += `- **Call Totali:** ${data.stats.totalCalls}\n`;
      full += `- **Call Completate:** ${data.stats.completedCalls}\n`;
      full += `- **Call Pendenti:** ${data.stats.pendingCalls}\n`;
      full += `- **Call in Ritardo:** ${data.stats.overdueCalls}\n`;
      full += `- **Tasso Completamento:** ${data.stats.completionRate}%\n\n`;
    }

    if (settings.includeTopEmployees && data.topEmployees.length > 0) {
      full += `## 🏆 Top Dipendenti\n`;
      data.topEmployees.forEach((emp, idx) => {
        full += `${idx + 1}. **${emp.employee.nome} ${emp.employee.cognome}** - ${emp.callsCount} call (${emp.completionRate}%)\n`;
      });
      full += '\n';
    }

    if (settings.includeAlerts && data.alerts.length > 0) {
      full += `## ⚠️ Alert\n`;
      data.alerts.forEach(alert => {
        const icon = alert.type === 'overdue' ? '🔴' : alert.type === 'performance' ? '📉' : '⏰';
        full += `${icon} ${alert.message}\n`;
      });
      full += '\n';
    }

    if (settings.includeUpcoming && data.upcomingCalls.length > 0) {
      full += `## 📅 Prossime Call\n`;
      data.upcomingCalls.slice(0, 5).forEach(item => {
        const days = Math.floor(item.hoursUntil / 24);
        const hours = item.hoursUntil % 24;
        const timeStr = days > 0 ? `${days}g ${hours}h` : `${hours}h`;
        full += `- **${item.employee.nome} ${item.employee.cognome}** - tra ${timeStr}\n`;
      });
    }

    return { summary, full };
  }

  // Initialize digest scheduler
  static initialize(): void {
    // Start digest processor
    setInterval(() => {
      this.processScheduledDigests();
    }, 60000); // Check every minute

    // Schedule initial digests if enabled
    const settings = this.getSettings();
    if (settings.enabled) {
      this.scheduleNextDigests();
    }
  }

  // Manual digest generation for testing
  static async sendTestDigest(type: 'daily' | 'weekly' = 'daily'): Promise<DigestData> {
    const digestData = type === 'daily' ? 
      this.generateDailyDigest() : this.generateWeeklyDigest();

    const settings = this.getSettings();
    const content = this.formatDigestContent(digestData, settings);

    // Create notification for test
    const notification = NotificationService.createNotification(
      'digest',
      `🧪 Test Digest ${type === 'daily' ? 'Giornaliero' : 'Settimanale'}`,
      content.summary,
      new Date(),
      {
        priority: 'low',
        metadata: {
          digestType: type,
          isTest: true,
          fullContent: content.full
        }
      }
    );

    return digestData;
  }
}