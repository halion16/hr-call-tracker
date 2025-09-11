'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Grid3x3, List, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDateTime, isToday } from '@/lib/utils';

interface CallWithEmployee extends Call {
  employee: Employee;
}

type ViewType = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calls, setCalls] = useState<CallWithEmployee[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('month');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const getUniqueDepartments = () => {
    const departments = [...new Set(calls.map(call => call.employee.dipartimento))];
    return departments.sort();
  };

  const getFilteredCalls = () => {
    return calls.filter(call => {
      const departmentMatch = filterDepartment === 'all' || call.employee.dipartimento === filterDepartment;
      const statusMatch = filterStatus === 'all' || call.status === filterStatus;
      return departmentMatch && statusMatch;
    });
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
    const filteredCalls = getFilteredCalls();
    return filteredCalls.filter(call => {
      const callDate = new Date(call.dataSchedulata).toISOString().split('T')[0];
      return callDate === dateStr;
    });
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getHours = () => {
    const hours = [];
    for (let i = 8; i <= 18; i++) {
      hours.push(i);
    }
    return hours;
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewType === 'month') {
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else if (viewType === 'week') {
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    } else if (viewType === 'day') {
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  const days = getDaysInMonth(currentDate);
  const weekDays = getWeekDays(currentDate);
  const hours = getHours();
  
  const filteredCalls = getFilteredCalls();
  const todaysCalls = filteredCalls.filter(call => isToday(call.dataSchedulata));
  const upcomingCalls = filteredCalls.filter(call => {
    const callDate = new Date(call.dataSchedulata);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return callDate > today;
  }).slice(0, 5);

  const getViewTitle = () => {
    if (viewType === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewType === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else {
        return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
      }
    } else {
      return `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-600">Visualizza e gestisci le call programmate</p>
        </div>
        
        {/* Controlli Vista e Filtri */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Controlli Vista */}
          <div className="flex rounded-lg border border-gray-200 p-1">
            <Button
              variant={viewType === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('month')}
            >
              <Grid3x3 className="w-4 h-4 mr-1" />
              Mese
            </Button>
            <Button
              variant={viewType === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('week')}
            >
              <List className="w-4 h-4 mr-1" />
              Settimana
            </Button>
            <Button
              variant={viewType === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('day')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Giorno
            </Button>
          </div>
          
          {/* Filtri */}
          <div className="flex gap-2">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">Tutti i dipartimenti</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">Tutti gli stati</option>
              <option value="scheduled">Programmate</option>
              <option value="completed">Completate</option>
              <option value="cancelled">Annullate</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario principale */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {getViewTitle()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Oggi
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Vista Mensile */}
              {viewType === 'month' && (
                <>
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
                                      : call.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
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
                </>
              )}

              {/* Vista Settimanale */}
              {viewType === 'week' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-8 gap-2 text-sm font-medium text-gray-500">
                    <div>Ora</div>
                    {weekDays.map(day => (
                      <div key={day.toISOString()} className="text-center">
                        <div>{dayNames[day.getDay()]}</div>
                        <div className={`text-lg ${isToday(day) ? 'text-blue-600 font-bold' : ''}`}>
                          {day.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {hours.map(hour => (
                    <div key={hour} className="grid grid-cols-8 gap-2 min-h-[60px] border-b border-gray-100">
                      <div className="text-sm text-gray-500 py-2">
                        {hour}:00
                      </div>
                      {weekDays.map(day => {
                        const daysCalls = getCallsForDate(day);
                        const hourCalls = daysCalls.filter(call => {
                          const callHour = new Date(call.dataSchedulata).getHours();
                          return callHour === hour;
                        });
                        
                        return (
                          <div key={`${day.toISOString()}-${hour}`} className="border border-gray-100 p-1 min-h-[60px]">
                            {hourCalls.map(call => (
                              <div
                                key={call.id}
                                className={`text-xs p-2 mb-1 rounded cursor-pointer ${
                                  call.status === 'scheduled' 
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                    : call.status === 'completed'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                                title={`${call.employee.nome} ${call.employee.cognome} - ${call.employee.dipartimento}`}
                              >
                                <div className="font-medium truncate">{call.employee.nome}</div>
                                <div className="text-xs opacity-75">{new Date(call.dataSchedulata).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Vista Giornaliera */}
              {viewType === 'day' && (
                <div className="space-y-2">
                  <div className="text-center text-lg font-medium text-gray-700 mb-6">
                    {dayNames[currentDate.getDay()]} {currentDate.getDate()} {monthNames[currentDate.getMonth()]}
                  </div>
                  
                  {hours.map(hour => {
                    const dayCalls = getCallsForDate(currentDate);
                    const hourCalls = dayCalls.filter(call => {
                      const callHour = new Date(call.dataSchedulata).getHours();
                      return callHour === hour;
                    });
                    
                    return (
                      <div key={hour} className="flex border-b border-gray-100 min-h-[80px]">
                        <div className="w-20 text-sm text-gray-500 py-4 text-right pr-4">
                          {hour}:00
                        </div>
                        <div className="flex-1 border-l border-gray-100 p-2">
                          {hourCalls.map(call => (
                            <div
                              key={call.id}
                              className={`p-3 mb-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                                call.status === 'scheduled' 
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                  : call.status === 'completed'
                                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                  : 'bg-red-50 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{call.employee.nome} {call.employee.cognome}</div>
                                  <div className="text-sm text-gray-600">{call.employee.dipartimento}</div>
                                  <div className="text-sm text-gray-600">
                                    {new Date(call.dataSchedulata).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}
                                    {call.durata && ` • ${call.durata} min`}
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  call.status === 'scheduled' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : call.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {call.status === 'scheduled' ? 'Programmata' : 
                                   call.status === 'completed' ? 'Completata' : 'Annullata'}
                                </div>
                              </div>
                              {call.note && (
                                <div className="mt-2 text-sm text-gray-700 italic">
                                  {call.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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