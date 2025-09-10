'use client';

import { useEffect, useState } from 'react';
import { Bell, Clock, User, X, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDate } from '@/lib/utils';

interface CallReminder {
  call: Call;
  employee: Employee;
  urgencyLevel: 'low' | 'medium' | 'high' | 'overdue';
  timeUntil: string;
}

export function CallReminders() {
  const [reminders, setReminders] = useState<CallReminder[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    checkForUpcomingCalls();
    
    // Controlla ogni minuto per nuove chiamate in scadenza
    const interval = setInterval(checkForUpcomingCalls, 60000);
    
    // Richiede permessi notifiche
    requestNotificationPermission();
    
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const checkForUpcomingCalls = () => {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    const now = new Date();
    const dismissedList = JSON.parse(localStorage.getItem('hr-tracker-dismissed-reminders') || '[]');
    
    const upcomingReminders: CallReminder[] = [];

    calls
      .filter(call => call.status === 'scheduled')
      .filter(call => !dismissedList.includes(call.id))
      .forEach(call => {
        const employee = employees.find(emp => emp.id === call.employeeId);
        if (!employee) return;

        const callDate = new Date(call.dataSchedulata);
        const timeDiff = callDate.getTime() - now.getTime();
        const hoursUntil = timeDiff / (1000 * 60 * 60);
        const daysUntil = Math.floor(hoursUntil / 24);
        
        let urgencyLevel: 'low' | 'medium' | 'high' | 'overdue' = 'low';
        let timeUntil = '';

        if (timeDiff < 0) {
          urgencyLevel = 'overdue';
          const hoursOverdue = Math.abs(hoursUntil);
          timeUntil = hoursOverdue < 24 
            ? `${Math.floor(hoursOverdue)} ore fa`
            : `${Math.floor(hoursOverdue / 24)} giorni fa`;
        } else if (hoursUntil <= 1) {
          urgencyLevel = 'high';
          const minutesUntil = Math.floor(timeDiff / (1000 * 60));
          timeUntil = `tra ${minutesUntil} minuti`;
        } else if (hoursUntil <= 4) {
          urgencyLevel = 'high';
          timeUntil = `tra ${Math.floor(hoursUntil)} ore`;
        } else if (hoursUntil <= 24) {
          urgencyLevel = 'medium';
          timeUntil = `oggi alle ${callDate.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`;
        } else if (daysUntil <= 1) {
          urgencyLevel = 'medium';
          timeUntil = `domani alle ${callDate.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`;
        } else if (daysUntil <= 3) {
          urgencyLevel = 'low';
          timeUntil = `tra ${daysUntil} giorni`;
        }

        // Solo mostra reminder per chiamate nei prossimi 3 giorni o scadute
        if (daysUntil <= 3 || timeDiff < 0) {
          upcomingReminders.push({
            call,
            employee,
            urgencyLevel,
            timeUntil
          });
        }
      });

    // Ordina per urgenza e data
    upcomingReminders.sort((a, b) => {
      const urgencyOrder = { 'overdue': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      return new Date(a.call.dataSchedulata).getTime() - new Date(b.call.dataSchedulata).getTime();
    });

    setReminders(upcomingReminders);
    setDismissed(dismissedList);
    
    // Mostra notifiche browser per chiamate urgenti
    showBrowserNotifications(upcomingReminders);
  };

  const showBrowserNotifications = (reminders: CallReminder[]) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const urgentReminders = reminders.filter(r => 
        r.urgencyLevel === 'high' || r.urgencyLevel === 'overdue'
      );

      urgentReminders.slice(0, 3).forEach(reminder => {
        // Non ripetere notifiche già inviate
        const notificationKey = `notification-${reminder.call.id}-${Date.now()}`;
        const lastNotified = localStorage.getItem(notificationKey);
        
        if (!lastNotified || Date.now() - parseInt(lastNotified) > 600000) { // 10 minuti
          new Notification(`Call HR in scadenza`, {
            body: `${reminder.employee.nome} ${reminder.employee.cognome} - ${reminder.timeUntil}`,
            icon: '/favicon.ico',
            tag: reminder.call.id
          });
          
          localStorage.setItem(notificationKey, Date.now().toString());
        }
      });
    }
  };

  const dismissReminder = (callId: string) => {
    const updatedDismissed = [...dismissed, callId];
    setDismissed(updatedDismissed);
    localStorage.setItem('hr-tracker-dismissed-reminders', JSON.stringify(updatedDismissed));
    setReminders(prev => prev.filter(r => r.call.id !== callId));
  };

  const clearAllDismissed = () => {
    setDismissed([]);
    localStorage.removeItem('hr-tracker-dismissed-reminders');
    checkForUpcomingCalls();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'Scaduta';
      case 'high': return 'Urgente';
      case 'medium': return 'Media';
      case 'low': return 'Bassa';
      default: return urgency;
    }
  };

  if (reminders.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80">
          <CardContent className="p-4">
            <div className="flex items-center text-green-600">
              <Bell className="w-5 h-5 mr-2" />
              <span className="text-sm">Nessuna chiamata in scadenza</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 max-h-96 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Bell className="w-5 h-5 mr-2 text-orange-500" />
              Reminder Call ({reminders.length})
            </CardTitle>
            <div className="flex gap-2">
              {dismissed.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAllDismissed}
                  className="text-xs"
                >
                  Mostra tutti
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowReminders(!showReminders)}
              >
                {showReminders ? 'Nascondi' : 'Mostra'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showReminders && (
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            <div className="space-y-2 p-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.call.id}
                  className={`p-3 rounded-lg border ${getUrgencyColor(reminder.urgencyLevel)} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium text-sm">
                          {reminder.employee.nome} {reminder.employee.cognome}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getUrgencyLabel(reminder.urgencyLevel)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-600 mb-2">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {reminder.timeUntil}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(reminder.call.dataSchedulata)}
                        </span>
                      </div>
                      
                      {reminder.call.note && (
                        <p className="text-xs text-gray-700 truncate">
                          Note: {reminder.call.note}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          // Apri la pagina calls con focus su questa call
                          window.location.href = '/calls';
                        }}
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => dismissReminder(reminder.call.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}