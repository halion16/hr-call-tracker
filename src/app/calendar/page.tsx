'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDateTime, isToday } from '@/lib/utils';

interface CallWithEmployee extends Call {
  employee: Employee;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calls, setCalls] = useState<CallWithEmployee[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const employees = LocalStorage.getEmployees();
    const loadedCalls = LocalStorage.getCalls();
    
    const callsWithEmployees = loadedCalls
      .map(call => {
        const employee = employees.find(emp => emp.id === call.employeeId);
        return employee ? { ...call, employee } : null;
      })
      .filter(Boolean) as CallWithEmployee[];
    
    setCalls(callsWithEmployees);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Aggiungi i giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getCallsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calls.filter(call => {
      const callDate = new Date(call.dataSchedulata).toISOString().split('T')[0];
      return callDate === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  const days = getDaysInMonth(currentDate);
  const todaysCalls = calls.filter(call => isToday(call.dataSchedulata));
  const upcomingCalls = calls.filter(call => {
    const callDate = new Date(call.dataSchedulata);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return callDate > today;
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
        <p className="text-gray-600">Visualizza e gestisci le call programmate</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario principale */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="p-2 h-20"></div>;
                  }
                  
                  const daysCalls = getCallsForDate(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 h-20 border border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        isCurrentDay ? 'bg-blue-50 border-blue-200' : ''
                      } ${!isCurrentMonth ? 'text-gray-400' : ''}`}
                      onClick={() => setSelectedDate(day.toISOString())}
                    >
                      <div className="font-medium text-sm">{day.getDate()}</div>
                      {daysCalls.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {daysCalls.slice(0, 2).map(call => (
                            <div
                              key={call.id}
                              className={`text-xs p-1 rounded truncate ${
                                call.status === 'scheduled' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {call.employee.nome}
                            </div>
                          ))}
                          {daysCalls.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{daysCalls.length - 2} altre
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar con dettagli */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Call di Oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysCalls.length === 0 ? (
                <p className="text-sm text-gray-600">Nessuna call oggi</p>
              ) : (
                <div className="space-y-3">
                  {todaysCalls.map(call => (
                    <div key={call.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <User className="w-4 h-4 mt-1 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {call.employee.nome} {call.employee.cognome}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(call.dataSchedulata).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Prossime Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingCalls.length === 0 ? (
                <p className="text-sm text-gray-600">Nessuna call programmata</p>
              ) : (
                <div className="space-y-3">
                  {upcomingCalls.map(call => (
                    <div key={call.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <User className="w-4 h-4 mt-1 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {call.employee.nome} {call.employee.cognome}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDateTime(call.dataSchedulata)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}