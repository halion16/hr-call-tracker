export class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.checkPermission();
  }

  public static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  private checkPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser non supporta le notifiche');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    return permission === 'granted';
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public hasPermission(): boolean {
    return this.permission === 'granted';
  }

  public async showNotification(
    title: string, 
    options: {
      body?: string;
      icon?: string;
      badge?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
      actions?: NotificationAction[];
      data?: any;
    } = {}
  ): Promise<Notification | null> {
    
    if (!this.isSupported()) {
      console.warn('Notifiche non supportate dal browser');
      return null;
    }

    if (!this.hasPermission()) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Permesso per notifiche negato');
        return null;
      }
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close dopo 10 secondi se non richiede interazione
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('Errore durante la creazione della notifica:', error);
      return null;
    }
  }

  public showCallReminder(employeeName: string, callTime: string): Promise<Notification | null> {
    return this.showNotification(
      '🔔 Call HR Imminente',
      {
        body: `Call con ${employeeName} programmata per ${callTime}`,
        tag: 'call-reminder',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'Visualizza Call'
          },
          {
            action: 'dismiss',
            title: 'Ignora'
          }
        ],
        data: {
          type: 'call-reminder',
          employeeName,
          callTime
        }
      }
    );
  }

  public showCallOverdue(employeeName: string, callTime: string): Promise<Notification | null> {
    return this.showNotification(
      '⚠️ Call HR Scaduta',
      {
        body: `Call con ${employeeName} era programmata per ${callTime}`,
        tag: 'call-overdue',
        requireInteraction: true,
        actions: [
          {
            action: 'reschedule',
            title: 'Riprogramma'
          },
          {
            action: 'complete',
            title: 'Segna come Completata'
          }
        ],
        data: {
          type: 'call-overdue',
          employeeName,
          callTime
        }
      }
    );
  }

  public showBulkReminder(callCount: number): Promise<Notification | null> {
    return this.showNotification(
      '📅 Call Multiple Oggi',
      {
        body: `Hai ${callCount} call programmate per oggi`,
        tag: 'bulk-reminder',
        requireInteraction: false,
        data: {
          type: 'bulk-reminder',
          callCount
        }
      }
    );
  }

  public clearNotificationsByTag(tag: string): void {
    // Per i browser che supportano getNotifications
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.getNotifications) {
          registration.getNotifications({ tag }).then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        }
      });
    }
  }

  public clearAllNotifications(): void {
    this.clearNotificationsByTag('call-reminder');
    this.clearNotificationsByTag('call-overdue');
    this.clearNotificationsByTag('bulk-reminder');
  }
}