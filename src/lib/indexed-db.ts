// IndexedDB utility for notification persistence
import { Notification } from './notification-service';

const DB_NAME = 'hr-tracker-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

export interface NotificationQueue {
  id: string;
  notification: Notification;
  retryCount: number;
  lastAttempt?: Date;
  nextRetry?: Date;
}

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async initialize(): Promise<boolean> {
    try {
      this.db = await this.openDB();
      return true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return false;
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create notifications store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Indexes for efficient querying
          store.createIndex('scheduledFor', 'notification.scheduledFor');
          store.createIndex('status', 'notification.status');
          store.createIndex('priority', 'notification.priority');
          store.createIndex('type', 'notification.type');
          store.createIndex('callId', 'notification.callId');
        }
      };
    });
  }

  // Store notification in IndexedDB
  async storeNotification(notification: Notification): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const queueItem: NotificationQueue = {
      id: notification.id,
      notification,
      retryCount: 0,
      lastAttempt: new Date(),
      nextRetry: new Date(notification.scheduledFor)
    };

    await this.promisifyRequest(store.put(queueItem));
  }

  // Get all stored notifications
  async getAllNotifications(): Promise<NotificationQueue[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();
    return this.promisifyRequest(request);
  }

  // Get notifications by status
  async getNotificationsByStatus(status: Notification['status']): Promise<NotificationQueue[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    
    const request = index.getAll(status);
    return this.promisifyRequest(request);
  }

  // Get due notifications (scheduled time <= now)
  async getDueNotifications(): Promise<NotificationQueue[]> {
    if (!this.db) return [];

    const now = new Date();
    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('scheduledFor');
    
    // Get all notifications scheduled for now or earlier
    const request = index.getAll(IDBKeyRange.upperBound(now));
    const allDue = await this.promisifyRequest(request);
    
    // Filter for pending status and ready for retry
    return allDue.filter(item => 
      item.notification.status === 'pending' &&
      (!item.nextRetry || item.nextRetry <= now)
    );
  }

  // Update notification status
  async updateNotification(
    id: string, 
    updates: Partial<Notification>, 
    queueUpdates?: Partial<NotificationQueue>
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Get existing item
    const existing = await this.promisifyRequest(store.get(id));
    if (!existing) return;

    // Update notification and queue data
    const updated: NotificationQueue = {
      ...existing,
      notification: { ...existing.notification, ...updates },
      ...queueUpdates
    };

    await this.promisifyRequest(store.put(updated));
  }

  // Mark notification as sent
  async markAsSent(id: string): Promise<void> {
    await this.updateNotification(id, {
      status: 'sent',
      sentAt: new Date()
    });
  }

  // Mark notification as failed with retry logic
  async markAsFailed(id: string, error?: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const existing = await this.promisifyRequest(store.get(id));
    if (!existing) return;

    const maxRetries = 3;
    const retryCount = existing.retryCount + 1;
    const now = new Date();
    
    // Calculate next retry with exponential backoff
    const backoffMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20 minutes
    const nextRetry = new Date(now.getTime() + backoffMinutes * 60 * 1000);

    const updates: Partial<NotificationQueue> = {
      retryCount,
      lastAttempt: now,
      nextRetry: retryCount < maxRetries ? nextRetry : undefined
    };

    const notificationUpdates: Partial<Notification> = {
      status: retryCount >= maxRetries ? 'failed' : 'pending',
      metadata: {
        ...existing.notification.metadata,
        error,
        retryCount,
        lastAttempt: now.toISOString()
      }
    };

    await this.updateNotification(id, notificationUpdates, updates);
  }

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await this.promisifyRequest(store.delete(id));
  }

  // Cancel notification (mark as cancelled)
  async cancelNotification(id: string): Promise<void> {
    await this.updateNotification(id, { status: 'cancelled' });
  }

  // Cancel notifications for a specific call
  async cancelCallNotifications(callId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('callId');
    
    const request = index.getAll(callId);
    const notifications = await this.promisifyRequest(request);
    
    for (const item of notifications) {
      if (item.notification.status === 'pending') {
        await this.updateNotification(item.id, { status: 'cancelled' });
      }
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanup(olderThanDays: number = 30): Promise<void> {
    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();
    const allNotifications = await this.promisifyRequest(request);
    
    for (const item of allNotifications) {
      const createdAt = new Date(item.notification.createdAt);
      if (createdAt < cutoffDate) {
        await this.promisifyRequest(store.delete(item.id));
      }
    }
  }

  // Get notification statistics
  async getStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  }> {
    if (!this.db) return { total: 0, pending: 0, sent: 0, failed: 0, cancelled: 0 };

    const all = await this.getAllNotifications();
    
    return {
      total: all.length,
      pending: all.filter(n => n.notification.status === 'pending').length,
      sent: all.filter(n => n.notification.status === 'sent').length,
      failed: all.filter(n => n.notification.status === 'failed').length,
      cancelled: all.filter(n => n.notification.status === 'cancelled').length
    };
  }

  // Sync with localStorage (migration utility)
  async syncWithLocalStorage(): Promise<void> {
    const localStorageKey = 'hr-tracker-notifications';
    const localData = localStorage.getItem(localStorageKey);
    
    if (!localData) return;

    try {
      const notifications: Notification[] = JSON.parse(localData);
      
      for (const notification of notifications) {
        await this.storeNotification(notification);
      }
      
      console.log(`Migrated ${notifications.length} notifications to IndexedDB`);
    } catch (error) {
      console.error('Failed to sync with localStorage:', error);
    }
  }

  // Utility to convert IDB request to Promise
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const indexedDBService = new IndexedDBService();