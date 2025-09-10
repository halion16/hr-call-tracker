import { useEffect, useCallback, useState } from 'react';
import { Call, Employee } from '@/types';
import { BrowserNotificationService } from '@/lib/browser-notifications';

export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number; // Minutes before call to show reminder
  overdueMinutes: number;  // Minutes after call to show overdue notification
  dailyReminder: boolean;  // Show daily summary of calls
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderMinutes: 15,
  overdueMinutes: 30,
  dailyReminder: true
};

export function useCallNotifications(calls: Call[], employees: Employee[]) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notificationService] = useState(() => BrowserNotificationService.getInstance());
  const [hasPermission, setHasPermission] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hr-call-notification-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('hr-call-notification-settings', JSON.stringify(updated));
  }, [settings]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    return granted;
  }, [notificationService]);

  // Check permission on mount
  useEffect(() => {
    setHasPermission(notificationService.hasPermission());
  }, [notificationService]);

  // Get calls that need notifications
  const getCallsNeedingNotification = useCallback(() => {
    if (!settings.enabled || !hasPermission) return [];

    const now = new Date();
    const callsWithEmployees = calls.map(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      return { ...call, employee };
    }).filter(call => call.employee && call.status === 'scheduled');

    const upcomingCalls = callsWithEmployees.filter(call => {
      const callTime = new Date(call.dataSchedulata);
      const timeDiff = callTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      // Show notification between reminderMinutes and 0 minutes before call
      return minutesDiff <= settings.reminderMinutes && minutesDiff >= 0;
    });

    const overdueCalls = callsWithEmployees.filter(call => {
      const callTime = new Date(call.dataSchedulata);
      const timeDiff = now.getTime() - callTime.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      // Show overdue notification for calls that are past due but within overdue window
      return minutesDiff >= 0 && minutesDiff <= settings.overdueMinutes;
    });

    return { upcomingCalls, overdueCalls };
  }, [calls, employees, settings, hasPermission]);

  // Show notification for upcoming call
  const showCallReminder = useCallback(async (call: Call & { employee: Employee }) => {
    const callTime = new Date(call.dataSchedulata);
    const timeString = callTime.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const notification = await notificationService.showCallReminder(
      `${call.employee.nome} ${call.employee.cognome}`,
      timeString
    );

    if (notification) {
      // Handle notification clicks
      notification.onclick = () => {
        window.focus();
        // Navigate to calls page and highlight the call
        window.location.href = `/calls?highlight=${call.id}`;
        notification.close();
      };
    }

    return notification;
  }, [notificationService]);

  // Show notification for overdue call
  const showOverdueNotification = useCallback(async (call: Call & { employee: Employee }) => {
    const callTime = new Date(call.dataSchedulata);
    const timeString = callTime.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const notification = await notificationService.showCallOverdue(
      `${call.employee.nome} ${call.employee.cognome}`,
      timeString
    );

    if (notification) {
      notification.onclick = () => {
        window.focus();
        window.location.href = `/calls?highlight=${call.id}`;
        notification.close();
      };
    }

    return notification;
  }, [notificationService]);

  // Show daily summary notification
  const showDailyReminder = useCallback(async () => {
    if (!settings.dailyReminder) return;

    const today = new Date();
    const todayCalls = calls.filter(call => {
      const callDate = new Date(call.dataSchedulata);
      return callDate.toDateString() === today.toDateString() && 
             call.status === 'scheduled';
    });

    if (todayCalls.length > 0) {
      const notification = await notificationService.showBulkReminder(todayCalls.length);
      
      if (notification) {
        notification.onclick = () => {
          window.focus();
          window.location.href = '/calls';
          notification.close();
        };
      }
    }
  }, [calls, settings.dailyReminder, notificationService]);

  // Main notification check interval
  useEffect(() => {
    if (!settings.enabled || !hasPermission) return;

    const checkNotifications = () => {
      const { upcomingCalls, overdueCalls } = getCallsNeedingNotification();

      // Show reminders for upcoming calls
      upcomingCalls.forEach(call => {
        const notificationKey = `reminder-${call.id}`;
        const lastShown = localStorage.getItem(notificationKey);
        const now = Date.now();

        // Only show once per hour to avoid spam
        if (!lastShown || (now - parseInt(lastShown)) > 60 * 60 * 1000) {
          showCallReminder(call);
          localStorage.setItem(notificationKey, now.toString());
        }
      });

      // Show overdue notifications
      overdueCalls.forEach(call => {
        const notificationKey = `overdue-${call.id}`;
        const lastShown = localStorage.getItem(notificationKey);
        const now = Date.now();

        // Only show once per hour
        if (!lastShown || (now - parseInt(lastShown)) > 60 * 60 * 1000) {
          showOverdueNotification(call);
          localStorage.setItem(notificationKey, now.toString());
        }
      });
    };

    // Check immediately
    checkNotifications();

    // Check every 5 minutes
    const interval = setInterval(checkNotifications, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.enabled, hasPermission, getCallsNeedingNotification, showCallReminder, showOverdueNotification]);

  // Daily reminder at 9 AM
  useEffect(() => {
    if (!settings.enabled || !settings.dailyReminder || !hasPermission) return;

    const now = new Date();
    const target = new Date();
    target.setHours(9, 0, 0, 0);

    // If it's past 9 AM today, set for tomorrow
    if (now > target) {
      target.setDate(target.getDate() + 1);
    }

    const timeUntilTarget = target.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      showDailyReminder();
      
      // Set up daily interval
      const dailyInterval = setInterval(showDailyReminder, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(dailyInterval);
    }, timeUntilTarget);

    return () => clearTimeout(timeout);
  }, [settings.enabled, settings.dailyReminder, hasPermission, showDailyReminder]);

  // Test notification function
  const testNotification = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    await notificationService.showNotification(
      '🔔 Test Notifica HR',
      {
        body: 'Le notifiche stanno funzionando correttamente!',
        tag: 'test-notification'
      }
    );

    return true;
  }, [hasPermission, requestPermission, notificationService]);

  return {
    settings,
    updateSettings,
    hasPermission,
    requestPermission,
    testNotification,
    isSupported: notificationService.isSupported(),
    clearAllNotifications: () => notificationService.clearAllNotifications()
  };
}