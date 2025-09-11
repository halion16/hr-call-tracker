import { Call, Employee } from '@/types';
import { LocalStorage } from './storage';
import { formatDateTime, isToday } from './utils';
import { indexedDBService } from './indexed-db';

export interface Notification {
  id: string;
  type: 'reminder' | 'escalation' | 'digest' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  callId?: string;
  employeeId?: string;
  scheduledFor: Date;
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
}

export type NotificationChannel = 'browser' | 'email' | 'slack' | 'teams' | 'sms';

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  remindersEnabled: boolean;
  reminderMinutes: number;
  escalationEnabled: boolean;
  escalationHours: number;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
  digestTime: string; // HH:MM format
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export interface DigestData {
  period: string;
  stats: {
    totalCalls: number;
    completedCalls: number;
    pendingCalls: number;
    overdueCalls: number;
    completionRate: number;
  };
  topEmployees: Array<{
    employee: Employee;
    callsCount: number;
    completionRate: number;
  }>;
  alerts: Array<{
    type: 'overdue' | 'performance' | 'missed';
    count: number;
    message: string;
  }>;
  upcomingCalls: Array<{
    call: Call;
    employee: Employee;
    hoursUntil: number;
  }>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  channels: ['browser'],
  remindersEnabled: true,
  reminderMinutes: 60,
  escalationEnabled: true,
  escalationHours: 48,
  digestEnabled: false,
  digestFrequency: 'daily',
  digestTime: '09:00',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  }
};

export class NotificationService {
  private static readonly STORAGE_KEY = 'hr-tracker-notifications';
  private static readonly SETTINGS_KEY = 'hr-tracker-notification-settings';
  private static readonly PERMISSION_REQUESTED_KEY = 'hr-tracker-notification-permission';
  
  private static worker: Worker | null = null;
  private static isInitialized = false;
  private static useIndexedDB = false;

  // Initialize notification service
  static async initialize(): Promise<boolean> {
    try {
      // Initialize IndexedDB
      const indexedDBInitialized = await indexedDBService.initialize();
      if (indexedDBInitialized) {
        this.useIndexedDB = true;
        console.log('✅ IndexedDB initialized for notifications');
        
        // Migrate existing localStorage data
        await this.migrateFromLocalStorage();
      } else {
        console.warn('⚠️ IndexedDB initialization failed, using localStorage fallback');
      }

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        localStorage.setItem(this.PERMISSION_REQUESTED_KEY, 'true');
        
        if (permission !== 'granted') {
          console.warn('Notification permission denied');
          return false;
        }
      }

      // Initialize service worker for background notifications
      if ('serviceWorker' in navigator) {
        try {
          await this.registerServiceWorker();
        } catch (error) {
          console.warn('Service Worker registration failed:', error);
        }
      }

      // Start notification scheduler
      this.startScheduler();
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  // Service Worker registration
  private static async registerServiceWorker(): Promise<void> {
    const registration = await navigator.serviceWorker.register('/notification-worker.js');
    console.log('Service Worker registered:', registration);
  }

  // Start background scheduler
  private static startScheduler(): void {
    // Check for due notifications every minute
    setInterval(() => {
      this.processPendingNotifications();
    }, 60000);

    // Process immediately on start
    this.processPendingNotifications();
  }

  // Migration from localStorage to IndexedDB
  private static async migrateFromLocalStorage(): Promise<void> {
    if (!this.useIndexedDB) return;
    
    try {
      await indexedDBService.syncWithLocalStorage();
      console.log('✅ Notifications migrated from localStorage to IndexedDB');
    } catch (error) {
      console.error('Failed to migrate notifications:', error);
    }
  }

  // Settings management
  static getSettings(): NotificationSettings {
    const saved = localStorage.getItem(this.SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  }

  static saveSettings(settings: NotificationSettings): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  // Notification CRUD operations
  static async getNotifications(): Promise<Notification[]> {
    if (this.useIndexedDB) {
      const queueItems = await indexedDBService.getAllNotifications();
      return queueItems.map(item => item.notification);
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  private static async saveNotifications(notifications: Notification[]): Promise<void> {
    if (this.useIndexedDB) {
      // For IndexedDB, notifications are stored individually
      return;
    }
    
    // Fallback to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
  }

  static async createNotification(
    type: Notification['type'],
    title: string,
    message: string,
    scheduledFor: Date,
    options: Partial<Notification> = {}
  ): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options.priority || 'medium',
      title,
      message,
      scheduledFor,
      createdAt: new Date(),
      status: 'pending',
      channels: options.channels || this.getSettings().channels,
      ...options
    };

    if (this.useIndexedDB) {
      await indexedDBService.storeNotification(notification);
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      notifications.push(notification);
      await this.saveNotifications(notifications);
    }

    return notification;
  }

  // Core notification scheduling methods
  static async scheduleCallReminder(call: Call, employee: Employee): Promise<Notification | null> {
    const settings = this.getSettings();
    
    if (!settings.enabled || !settings.remindersEnabled) {
      return null;
    }

    const callDate = new Date(call.dataSchedulata);
    const reminderDate = new Date(callDate.getTime() - settings.reminderMinutes * 60 * 1000);
    
    // Don't schedule if reminder time has already passed
    if (reminderDate <= new Date()) {
      return null;
    }

    const title = `Promemoria Call HR`;
    const message = `Call programmata con ${employee.nome} ${employee.cognome} alle ${formatDateTime(callDate)}`;

    return await this.createNotification('reminder', title, message, reminderDate, {
      priority: 'medium',
      callId: call.id,
      employeeId: employee.id,
      metadata: {
        callDate: callDate.toISOString(),
        employeeName: `${employee.nome} ${employee.cognome}`,
        department: employee.dipartimento
      }
    });
  }

  static async scheduleEscalation(call: Call, employee: Employee): Promise<Notification | null> {
    const settings = this.getSettings();
    
    if (!settings.enabled || !settings.escalationEnabled) {
      return null;
    }

    const callDate = new Date(call.dataSchedulata);
    const escalationDate = new Date(callDate.getTime() + settings.escalationHours * 60 * 60 * 1000);

    const title = `Call in Ritardo - Escalation`;
    const message = `Call con ${employee.nome} ${employee.cognome} non completata dopo ${settings.escalationHours}h`;

    return await this.createNotification('escalation', title, message, escalationDate, {
      priority: 'high',
      callId: call.id,
      employeeId: employee.id,
      metadata: {
        originalCallDate: callDate.toISOString(),
        employeeName: `${employee.nome} ${employee.cognome}`,
        hoursOverdue: settings.escalationHours
      }
    });
  }

  // Process pending notifications
  private static async processPendingNotifications(): Promise<void> {
    const now = new Date();
    const settings = this.getSettings();

    // Get due notifications
    let dueNotifications: any[] = [];
    
    if (this.useIndexedDB) {
      const queueItems = await indexedDBService.getDueNotifications();
      dueNotifications = queueItems;
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      dueNotifications = notifications
        .filter(notif => notif.status === 'pending' && new Date(notif.scheduledFor) <= now)
        .map(notif => ({ notification: notif }));
    }

    for (const item of dueNotifications) {
      const notification = item.notification;
      
      try {
        // Check if it's quiet hours
        if (this.isQuietHours(settings.quietHours)) {
          // Reschedule for after quiet hours, unless urgent
          if (notification.priority !== 'urgent') {
            await this.rescheduleAfterQuietHours(notification, settings.quietHours);
            continue;
          }
        }

        // Send notification through selected channels
        await this.sendNotification(notification);
        
        // Mark as sent
        if (this.useIndexedDB) {
          await indexedDBService.markAsSent(notification.id);
        } else {
          notification.sentAt = new Date();
          notification.status = 'sent';
        }
        
      } catch (error) {
        console.error('Failed to send notification:', notification.id, error);
        
        if (this.useIndexedDB) {
          await indexedDBService.markAsFailed(notification.id, error instanceof Error ? error.message : String(error));
        } else {
          notification.status = 'failed';
        }
      }
    }

    // Save updated notifications (localStorage fallback)
    if (!this.useIndexedDB && dueNotifications.length > 0) {
      const allNotifications = await this.getNotifications();
      await this.saveNotifications(allNotifications);
    }

    // Clean up old notifications (older than 30 days)
    await this.cleanupOldNotifications();
  }

  // Send notification through various channels
  private static async sendNotification(notification: Notification): Promise<void> {
    const promises = notification.channels.map(channel => {
      switch (channel) {
        case 'browser':
          return this.sendBrowserNotification(notification);
        case 'email':
          return this.sendEmailNotification(notification);
        case 'slack':
          return this.sendSlackNotification(notification);
        case 'teams':
          return this.sendTeamsNotification(notification);
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  // Browser notification
  private static async sendBrowserNotification(notification: Notification): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Browser notifications not available');
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
      actions: notification.callId ? [
        {
          action: 'view-call',
          title: 'Visualizza Call'
        },
        {
          action: 'dismiss',
          title: 'Ignora'
        }
      ] : undefined
    };

    const browserNotif = new Notification(notification.title, options);
    
    browserNotif.onclick = () => {
      window.focus();
      if (notification.callId) {
        window.location.href = `/calls?highlight=${notification.callId}`;
      }
    };

    // Auto-close after 10 seconds for non-urgent notifications
    if (notification.priority !== 'urgent') {
      setTimeout(() => browserNotif.close(), 10000);
    }
  }

  // Email notification (placeholder - requires backend)
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    // TODO: Implement email sending via backend API
    console.log('Email notification (not implemented):', notification);
  }

  // Slack notification (placeholder - requires integration)
  private static async sendSlackNotification(notification: Notification): Promise<void> {
    // TODO: Implement Slack webhook integration
    console.log('Slack notification (not implemented):', notification);
  }

  // Teams notification (placeholder - requires integration)
  private static async sendTeamsNotification(notification: Notification): Promise<void> {
    // TODO: Implement Teams webhook integration
    console.log('Teams notification (not implemented):', notification);
  }

  // Utility methods
  private static isQuietHours(quietHours: NotificationSettings['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= quietHours.start || currentTime <= quietHours.end;
  }

  private static async rescheduleAfterQuietHours(
    notification: Notification, 
    quietHours: NotificationSettings['quietHours']
  ): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = quietHours.end.split(':');
    tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (this.useIndexedDB) {
      await indexedDBService.updateNotification(notification.id, { scheduledFor: tomorrow });
    } else {
      notification.scheduledFor = tomorrow;
    }
  }

  private static async cleanupOldNotifications(): Promise<void> {
    if (this.useIndexedDB) {
      await indexedDBService.cleanup(30);
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filtered = notifications.filter(notif => 
        new Date(notif.createdAt) > thirtyDaysAgo
      );

      if (filtered.length !== notifications.length) {
        await this.saveNotifications(filtered);
      }
    }
  }

  // Public API methods
  static async createCallReminder(callId: string): Promise<Notification | null> {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    
    const call = calls.find(c => c.id === callId);
    if (!call) return null;
    
    const employee = employees.find(e => e.id === call.employeeId);
    if (!employee) return null;

    return this.scheduleCallReminder(call, employee);
  }

  static async createCallEscalation(callId: string): Promise<Notification | null> {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    
    const call = calls.find(c => c.id === callId);
    if (!call || call.status === 'completed') return null;
    
    const employee = employees.find(e => e.id === call.employeeId);
    if (!employee) return null;

    return this.scheduleEscalation(call, employee);
  }

  static async cancelNotification(id: string): Promise<void> {
    if (this.useIndexedDB) {
      await indexedDBService.cancelNotification(id);
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      const notification = notifications.find(n => n.id === id);
      
      if (notification && notification.status === 'pending') {
        notification.status = 'cancelled';
        await this.saveNotifications(notifications);
      }
    }
  }

  static async cancelCallNotifications(callId: string): Promise<void> {
    if (this.useIndexedDB) {
      await indexedDBService.cancelCallNotifications(callId);
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      const callNotifications = notifications.filter(n => n.callId === callId);
      
      callNotifications.forEach(notification => {
        if (notification.status === 'pending') {
          notification.status = 'cancelled';
        }
      });
      
      await this.saveNotifications(notifications);
    }
  }

  // Email notification method (for external integrations)
  static async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    priority?: string;
  }): Promise<void> {
    // TODO: Implement actual email sending via backend API
    // For now, log the email notification
    console.log('📧 Email notification:', {
      to: emailData.to,
      subject: emailData.subject,
      priority: emailData.priority,
      html: emailData.html.substring(0, 100) + '...'
    });
    
    // Simulate async email sending
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  // SMS notification method (for external integrations)
  static async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // TODO: Implement actual SMS sending via SMS service provider
    // For now, log the SMS notification
    console.log('📱 SMS notification:', {
      to: phoneNumber,
      message: message
    });
    
    // Simulate async SMS sending
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get notification statistics
  static async getStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled?: number;
  }> {
    if (this.useIndexedDB) {
      return await indexedDBService.getStats();
    } else {
      // Fallback to localStorage
      const notifications = await this.getNotifications();
      
      return {
        total: notifications.length,
        pending: notifications.filter(n => n.status === 'pending').length,
        sent: notifications.filter(n => n.status === 'sent').length,
        failed: notifications.filter(n => n.status === 'failed').length
      };
    }
  }
}