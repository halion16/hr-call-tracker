'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Check, X, Clock, Calendar, Users, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDateTime, isToday } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'call_reminder' | 'overdue_call' | 'sync_complete' | 'target_achieved' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  callId?: string;
  employeeId?: string;
  urgent?: boolean;
}

interface NotificationCenterProps {
  showCenter: boolean;
  onClose: () => void;
}

export function NotificationCenter({ showCenter, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Controlla ogni minuto per nuove notifiche
    const interval = setInterval(checkForNewNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const stored = localStorage.getItem('hr_notifications');
    const storedNotifications = stored ? JSON.parse(stored) : [];
    
    // Genera notifiche automatiche
    const autoNotifications = generateAutoNotifications();
    
    // Combina e ordina per timestamp
    const allNotifications = [...storedNotifications, ...autoNotifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Mantieni solo le 20 più recenti

    setNotifications(allNotifications);
    setUnreadCount(allNotifications.filter(n => !n.read).length);
  };

  const generateAutoNotifications = (): Notification[] => {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    const autoNotifications: Notification[] = [];
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Notifiche per call di oggi
    const todaysCalls = calls.filter(call => 
      call.status === 'scheduled' && isToday(call.dataSchedulata)
    );
    
    todaysCalls.forEach(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      if (employee) {
        autoNotifications.push({
          id: `today_${call.id}`,
          type: 'call_reminder',
          title: 'Call programmata per oggi',
          message: `Call con ${employee.nome} ${employee.cognome} alle ${new Date(call.dataSchedulata).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`,
          timestamp: new Date().toISOString(),
          read: false,
          callId: call.id,
          employeeId: employee.id,
          urgent: true
        });
      }
    });

    // Notifiche per call in ritardo
    const overdueCalls = calls.filter(call => {
      if (call.status !== 'scheduled') return false;
      const callDate = new Date(call.dataSchedulata);
      return callDate < today;
    });

    overdueCalls.forEach(call => {
      const employee = employees.find(emp => emp.id === call.employeeId);
      if (employee) {
        const daysDiff = Math.floor((today.getTime() - new Date(call.dataSchedulata).getTime()) / (1000 * 60 * 60 * 24));
        autoNotifications.push({
          id: `overdue_${call.id}`,
          type: 'overdue_call',
          title: 'Call in ritardo',
          message: `Call con ${employee.nome} ${employee.cognome} è in ritardo di ${daysDiff} giorni`,
          timestamp: new Date().toISOString(),
          read: false,
          callId: call.id,
          employeeId: employee.id,
          urgent: true
        });
      }
    });

    return autoNotifications;
  };

  const checkForNewNotifications = () => {
    loadNotifications();
  };

  const markAsRead = (notificationId: string) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updated);
    
    // Salva solo le notifiche manuali
    const manualNotifications = updated.filter(n => 
      !n.id.startsWith('today_') && !n.id.startsWith('overdue_')
    );
    localStorage.setItem('hr_notifications', JSON.stringify(manualNotifications));
    
    setUnreadCount(updated.filter(n => !n.read).length);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    
    const manualNotifications = updated.filter(n => 
      !n.id.startsWith('today_') && !n.id.startsWith('overdue_')
    );
    localStorage.setItem('hr_notifications', JSON.stringify(manualNotifications));
    
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId: string) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    setNotifications(updated);
    
    const manualNotifications = updated.filter(n => 
      !n.id.startsWith('today_') && !n.id.startsWith('overdue_')
    );
    localStorage.setItem('hr_notifications', JSON.stringify(manualNotifications));
    
    setUnreadCount(updated.filter(n => !n.read).length);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'call_reminder':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'overdue_call':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'sync_complete':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'target_achieved':
        return <Calendar className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (notification: Notification) => {
    if (notification.urgent) return 'border-l-red-400 bg-red-50';
    if (!notification.read) return 'border-l-blue-400 bg-blue-50';
    return 'border-l-gray-200 bg-gray-50';
  };

  if (!showCenter) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {/* Gestito dal componente padre */}}
          className="relative"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <Card className="w-96 max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifiche
                {unreadCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    {unreadCount}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Centro notifiche e promemoria
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Segna tutte come lette
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna notifica</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 p-4 hover:bg-gray-100 transition-colors ${getNotificationColor(notification)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm ${!notification.read ? 'font-bold' : ''}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDateTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Utility per inviare notifiche reali
export class RealNotificationService {
  static async sendCallReminder(callId: string, employeeName: string, employeeEmail: string, employeePhone: string, callDate: string, callTime: string) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call_reminder',
          employeeName,
          employeeEmail,
          employeePhone,
          callDate,
          callTime,
          method: 'email' // TODO: Get from settings
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Aggiungi notifica locale di successo
        NotificationService.createNotification({
          type: 'info',
          title: 'Promemoria inviato',
          message: `Promemoria call inviato a ${employeeName}`,
          read: false,
          callId
        });
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send call reminder:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async sendOverdueAlert(callId: string, employeeName: string, employeeEmail: string, employeePhone: string, daysOverdue: number) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'overdue_notification',
          employeeName,
          employeeEmail,
          employeePhone,
          daysOverdue,
          method: 'email' // TODO: Get from settings
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Aggiungi notifica locale di successo
        NotificationService.createNotification({
          type: 'info',
          title: 'Avviso ritardo inviato',
          message: `Avviso ritardo inviato a ${employeeName} (${daysOverdue} giorni)`,
          read: false,
          callId
        });
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send overdue alert:', error);
      return { success: false, error: error.message };
    }
  }
}

// Utility per creare notifiche programmaticamente
export class NotificationService {
  static createNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const stored = localStorage.getItem('hr_notifications');
    const notifications = stored ? JSON.parse(stored) : [];
    
    const newNotification: Notification = {
      ...notification,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    notifications.unshift(newNotification);
    
    // Mantieni solo le 50 più recenti
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem('hr_notifications', JSON.stringify(trimmed));
    
    return newNotification;
  }
  
  static notifyCallCompleted(callId: string, employeeName: string) {
    return this.createNotification({
      type: 'info',
      title: 'Call completata',
      message: `Call con ${employeeName} completata con successo`,
      read: false,
      callId
    });
  }
  
  static notifyCallScheduled(callId: string, employeeName: string, dateTime: string) {
    return this.createNotification({
      type: 'call_reminder',
      title: 'Call programmata',
      message: `Nuova call con ${employeeName} programmata per ${formatDateTime(dateTime)}`,
      read: false,
      callId
    });
  }
  
  static notifySyncComplete(newEmployeesCount: number) {
    return this.createNotification({
      type: 'sync_complete',
      title: 'Sincronizzazione completata',
      message: `${newEmployeesCount} nuovi dipendenti sincronizzati`,
      read: false
    });
  }
}