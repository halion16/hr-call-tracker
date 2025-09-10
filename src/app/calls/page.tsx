'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, Calendar, Clock, Star, User, CheckCircle, XCircle, Edit3, MoreVertical, Pause, Trash2, RotateCcw, Play, History, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { NotificationService } from '@/lib/notification-service';
import { GoogleCalendarService } from '@/lib/google-calendar-service';
import { CalendarSyncService } from '@/lib/calendar-sync-service';
import { CallTrackingService } from '@/lib/call-tracking-service';
import { Call, Employee } from '@/types';
import { formatDateTime, getCallStatusColor, generateId } from '@/lib/utils';
import { toast } from 'sonner';

interface CallWithEmployee extends Call {
  employee: Employee;
}

export default function CallsPage() {
  const searchParams = useSearchParams();
  const highlightCallId = searchParams.get('highlight');
  
  const [calls, setCalls] = useState<CallWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    dataSchedulata: '',
    note: ''
  });
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCallHistory, setSelectedCallHistory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    dataSchedulata: '',
    note: '',
    durata: '',
    rating: '5',
    nextCallDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const loadData = () => {
    const loadedEmployees = LocalStorage.getEmployees();
    const loadedCalls = LocalStorage.getCalls();
    
    setEmployees(loadedEmployees);
    
    const callsWithEmployees = loadedCalls
      .map(call => {
        const employee = loadedEmployees.find(emp => emp.id === call.employeeId);
        return employee ? { ...call, employee } : null;
      })
      .filter(Boolean) as CallWithEmployee[];
    
    setCalls(callsWithEmployees.sort((a, b) => 
      new Date(b.dataSchedulata).getTime() - new Date(a.dataSchedulata).getTime()
    ));
  };

  const scheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      toast.error('Seleziona un dipendente');
      return;
    }
    
    if (!formData.dataSchedulata) {
      toast.error('Seleziona data e ora');
      return;
    }
    
    const selectedDate = new Date(formData.dataSchedulata);
    const now = new Date();
    
    if (selectedDate < now) {
      toast.error('Non puoi schedulare una call nel passato');
      return;
    }
    
    // Find employee for notifications
    const employee = employees.find(emp => emp.id === formData.employeeId);
    if (!employee) {
      toast.error('Dipendente non trovato');
      return;
    }
    
    const newCall: Call = {
      id: generateId(),
      employeeId: formData.employeeId,
      dataSchedulata: formData.dataSchedulata,
      note: formData.note,
      status: 'scheduled'
    };
    
    try {
      // Save call to storage
      LocalStorage.addCall(newCall);
      
      // Track creation
      CallTrackingService.trackModification(newCall.id, 'created', undefined, newCall);
      
      // Create automatic notifications
      const reminder = await NotificationService.createCallReminder(newCall.id);
      const escalation = await NotificationService.createCallEscalation(newCall.id);
      
      // Create Google Calendar event if connected
      let calendarEvent = null;
      try {
        if (GoogleCalendarService.isConnected()) {
          calendarEvent = await GoogleCalendarService.createCallEvent({
            employeeName: `${employee.nome} ${employee.cognome}`,
            employeeEmail: employee.email,
            scheduledDate: new Date(formData.dataSchedulata),
            employeeData: employee
          });

          // Update call with calendar event ID
          if (calendarEvent) {
            newCall.googleCalendarEventId = calendarEvent.id;
            newCall.lastSyncedAt = new Date().toISOString();
            LocalStorage.updateCall(newCall.id, newCall);
          }
        }
      } catch (calendarError) {
        console.warn('Calendar event creation failed:', calendarError);
        // Non blocchiamo il processo se il calendario fallisce
      }
      
      // Show success message with notification info
      let notificationMessage = `Call programmata con ${employee.nome} ${employee.cognome}`;
      if (reminder) {
        notificationMessage += ' • Promemoria attivato';
      }
      if (escalation) {
        notificationMessage += ' • Escalation programmata';
      }
      if (calendarEvent) {
        notificationMessage += ' • Evento calendario creato';
      }
      
      toast.success('Call programmata!', {
        description: notificationMessage,
        action: {
          label: 'Visualizza',
          onClick: () => {
            const element = document.getElementById(`call-${newCall.id}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
      
      loadData();
      resetForm();
      
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast.error('Errore durante la programmazione della call');
    }
  };

  const completeCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCall) {
      toast.error('Errore: nessuna call selezionata');
      return;
    }
    
    if (!formData.durata) {
      toast.error('Inserisci la durata della call');
      return;
    }
    
    const duration = parseInt(formData.durata);
    if (isNaN(duration) || duration <= 0) {
      toast.error('La durata deve essere un numero positivo');
      return;
    }
    
    if (duration > 480) {
      toast.error('La durata non può superare 8 ore (480 minuti)');
      return;
    }
    
    if (!formData.rating) {
      toast.error('Seleziona una valutazione');
      return;
    }
    
    if (formData.nextCallDate) {
      const nextCallDate = new Date(formData.nextCallDate);
      const now = new Date();
      
      if (nextCallDate <= now) {
        toast.error('La data della prossima call deve essere nel futuro');
        return;
      }
    }
    
    try {
      const updatedCall: Partial<Call> = {
        status: 'completed',
        dataCompletata: new Date().toISOString(),
        durata: parseInt(formData.durata),
        note: formData.note,
        rating: parseInt(formData.rating),
        nextCallDate: formData.nextCallDate || undefined
      };
      
      LocalStorage.updateCall(selectedCall.id, updatedCall);
      
      // Track completion
      CallTrackingService.trackModification(selectedCall.id, 'completed', selectedCall, updatedCall);
      
      // Cancel pending notifications for this call (reminder/escalation)
      NotificationService.cancelCallNotifications(selectedCall.id);
      
      let nextCallId: string | null = null;
      
      if (formData.nextCallDate) {
        const nextCall: Call = {
          id: generateId(),
          employeeId: selectedCall.employeeId,
          dataSchedulata: formData.nextCallDate,
          note: `Follow-up della call del ${formatDateTime(selectedCall.dataSchedulata)}`,
          status: 'scheduled'
        };
        LocalStorage.addCall(nextCall);
        nextCallId = nextCall.id;
        
        // Create notifications for the next call
        const employee = employees.find(emp => emp.id === selectedCall.employeeId);
        if (employee) {
          await NotificationService.createCallReminder(nextCall.id);
          await NotificationService.createCallEscalation(nextCall.id);
          
          // Sync new call to calendar
          await CalendarSyncService.syncCallToCalendar(nextCall, employee, 'create');
        }
      }
      
      const employee = employees.find(emp => emp.id === selectedCall.employeeId);
      const employeeName = employee ? `${employee.nome} ${employee.cognome}` : 'Dipendente';
      
      // Update calendar event if call was completed
      if (employee && selectedCall.googleCalendarEventId) {
        try {
          await CalendarSyncService.syncCallToCalendar(updatedCall, employee, 'update');
        } catch (error) {
          console.warn('Failed to update calendar event:', error);
        }
      }
      
      toast.success('Call completata!', {
        description: `Call con ${employeeName} completata con successo${nextCallId ? ' • Prossima call programmata' : ''}`,
        action: nextCallId ? {
          label: 'Vedi prossima',
          onClick: () => {
            const element = document.getElementById(`call-${nextCallId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } : undefined
      });
      
      loadData();
      resetCompleteForm();
      
    } catch (error) {
      console.error('Error completing call:', error);
      toast.error('Errore durante il completamento della call');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      dataSchedulata: '',
      note: '',
      durata: '',
      rating: '5',
      nextCallDate: ''
    });
    setShowScheduleForm(false);
  };

  const resetCompleteForm = () => {
    setFormData({
      employeeId: '',
      dataSchedulata: '',
      note: '',
      durata: '',
      rating: '5',
      nextCallDate: ''
    });
    setShowCompleteForm(false);
    setSelectedCall(null);
  };

  // Call Actions
  const handleSuspendCall = async (call: CallWithEmployee) => {
    try {
      const updatedCall = { status: 'suspended' as const };
      LocalStorage.updateCall(call.id, updatedCall);
      
      // Track suspension
      CallTrackingService.trackModification(call.id, 'suspended', call, updatedCall);
      
      // Update calendar event to reflect suspension
      if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
        try {
          await CalendarSyncService.syncCallToCalendar(updatedCall, call.employee, 'update');
        } catch (error) {
          console.warn('Failed to update calendar event for suspension:', error);
        }
      }
      
      loadData();
      
      toast.success('Call sospesa', {
        description: `Call con ${call.employee.nome} ${call.employee.cognome} sospesa • Calendario aggiornato`
      });
      setOpenDropdown(null);
    } catch (error) {
      toast.error('Errore durante la sospensione della call');
    }
  };

  const handleResumeCall = async (call: CallWithEmployee) => {
    try {
      const updatedCall = { status: 'scheduled' as const };
      LocalStorage.updateCall(call.id, updatedCall);
      
      // Track resume
      CallTrackingService.trackModification(call.id, 'resumed', call, updatedCall);
      
      // Update calendar event to reflect resumption
      if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
        try {
          await CalendarSyncService.syncCallToCalendar(updatedCall, call.employee, 'update');
        } catch (error) {
          console.warn('Failed to update calendar event for resumption:', error);
        }
      }
      
      loadData();
      
      toast.success('Call riattivata', {
        description: `Call con ${call.employee.nome} ${call.employee.cognome} riattivata • Calendario aggiornato`
      });
      setOpenDropdown(null);
    } catch (error) {
      toast.error('Errore durante la riattivazione della call');
    }
  };

  const handleDeleteCall = async (call: CallWithEmployee) => {
    if (!confirm(`Vuoi davvero eliminare la call con ${call.employee.nome} ${call.employee.cognome}?`)) {
      return;
    }

    try {
      // Track deletion before actually deleting
      CallTrackingService.trackModification(call.id, 'deleted', call, undefined);
      
      // Cancel notifications
      NotificationService.cancelCallNotifications(call.id);
      
      // Delete Google Calendar event if exists
      if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
        try {
          await GoogleCalendarService.deleteEvent(call.googleCalendarEventId);
        } catch (error) {
          console.warn('Failed to delete calendar event:', error);
        }
      }
      
      LocalStorage.deleteCall(call.id);
      loadData();
      
      toast.success('Call eliminata', {
        description: `Call con ${call.employee.nome} ${call.employee.cognome} eliminata`
      });
      setOpenDropdown(null);
    } catch (error) {
      toast.error('Errore durante l\'eliminazione della call');
    }
  };

  const openRescheduleModal = (call: CallWithEmployee) => {
    setSelectedCall(call);
    setRescheduleData({
      dataSchedulata: call.dataSchedulata,
      note: call.note || ''
    });
    setShowRescheduleModal(true);
    setOpenDropdown(null);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCall) return;

    const selectedDate = new Date(rescheduleData.dataSchedulata);
    const now = new Date();
    
    if (selectedDate < now) {
      toast.error('Non puoi riprogrammare una call nel passato');
      return;
    }

    try {
      const updatedCall = { 
        dataSchedulata: rescheduleData.dataSchedulata,
        note: rescheduleData.note,
        status: 'scheduled' as const,
        lastSyncedAt: new Date().toISOString()
      };
      
      LocalStorage.updateCall(selectedCall.id, updatedCall);
      
      // Track rescheduling
      CallTrackingService.trackModification(selectedCall.id, 'rescheduled', selectedCall, updatedCall);
      
      // Update Google Calendar event if exists
      if (selectedCall.googleCalendarEventId && GoogleCalendarService.isConnected()) {
        try {
          const employee = employees.find(emp => emp.id === selectedCall.employeeId);
          if (employee) {
            await CalendarSyncService.syncCallToCalendar(updatedCall, employee, 'update');
          }
        } catch (error) {
          console.warn('Failed to update calendar event:', error);
        }
      }
      
      // Re-create notifications for the rescheduled call
      try {
        await NotificationService.createCallReminder(selectedCall.id);
        await NotificationService.createCallEscalation(selectedCall.id);
      } catch (error) {
        console.warn('Failed to create notifications for rescheduled call:', error);
      }
      
      const callWithEmployee = calls.find(c => c.id === selectedCall.id);
      const employeeName = callWithEmployee ? 
        `${callWithEmployee.employee.nome} ${callWithEmployee.employee.cognome}` : 
        'Dipendente';
      
      loadData();
      setShowRescheduleModal(false);
      setSelectedCall(null);
      setRescheduleData({ dataSchedulata: '', note: '' });
      
      toast.success('Call riprogrammata', {
        description: `Call con ${employeeName} riprogrammata`
      });
    } catch (error) {
      toast.error('Errore durante la riprogrammazione della call');
    }
  };

  const openCompleteForm = (call: Call) => {
    setSelectedCall(call);
    setFormData({
      ...formData,
      note: call.note || '',
      rating: '5'
    });
    setShowCompleteForm(true);
  };

  const toggleCallHistory = (callId: string) => {
    if (selectedCallHistory === callId) {
      setSelectedCallHistory(null);
    } else {
      setSelectedCallHistory(callId);
    }
    setOpenDropdown(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Call</h1>
          <div className="flex items-center space-x-3">
            <p className="text-gray-600">Pianifica e traccia le call di recap con i dipendenti</p>
            {GoogleCalendarService.isConnected() && (
              <div className="flex items-center text-xs text-green-600">
                <Calendar className="h-3 w-3 mr-1" />
                Google Calendar attivo
              </div>
            )}
          </div>
        </div>
        
        <Button onClick={() => setShowScheduleForm(true)}>
          <Phone className="mr-2 h-4 w-4" />
          Pianifica Nuova Call
        </Button>
      </div>

      {showScheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Pianifica Nuova Call</CardTitle>
            <CardDescription>Schedula una call di recap con un dipendente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={scheduleCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dipendente</label>
                <select 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Seleziona dipendente</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome} {emp.cognome} - {emp.posizione}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  value={formData.dataSchedulata}
                  onChange={(e) => setFormData({...formData, dataSchedulata: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Argomenti da discutere, obiettivi della call..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Pianifica Call</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCompleteForm && selectedCall && (
        <Card>
          <CardHeader>
            <CardTitle>Completa Call</CardTitle>
            <CardDescription>
              Registra i dettagli della call con {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.nome} {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.cognome}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={completeCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Durata (minuti)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.durata}
                  onChange={(e) => setFormData({...formData, durata: e.target.value})}
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valutazione (1-5)</label>
                <select 
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="5">5 - Eccellente</option>
                  <option value="4">4 - Buona</option>
                  <option value="3">3 - Sufficiente</option>
                  <option value="2">2 - Scarsa</option>
                  <option value="1">1 - Pessima</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note della call</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Riassunto della discussione, punti salienti, feedback..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Prossima Call (opzionale)</label>
                <Input
                  type="datetime-local"
                  value={formData.nextCallDate}
                  onChange={(e) => setFormData({...formData, nextCallDate: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Completa Call</Button>
                <Button type="button" variant="outline" onClick={resetCompleteForm}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedCall && (
        <Card>
          <CardHeader>
            <CardTitle>Riprogramma Call</CardTitle>
            <CardDescription>
              Modifica data e ora della call con {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.nome} {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.cognome}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nuova Data e Ora</label>
                <Input
                  type="datetime-local"
                  value={rescheduleData.dataSchedulata}
                  onChange={(e) => setRescheduleData({...rescheduleData, dataSchedulata: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  value={rescheduleData.note}
                  onChange={(e) => setRescheduleData({...rescheduleData, note: e.target.value})}
                  placeholder="Motivo della riprogrammazione, nuovi argomenti da discutere..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Riprogramma Call</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedCall(null);
                    setRescheduleData({ dataSchedulata: '', note: '' });
                  }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Attività Recente
          </CardTitle>
          <CardDescription>Ultime modifiche alle call</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const recentModifications = CallTrackingService.getRecentModifications(5);
            const stats = CallTrackingService.getModificationStats();
            
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-medium text-blue-900">
                      {stats.todayModifications} modifiche oggi
                    </span>
                    <span className="text-blue-700">
                      {stats.totalModifications} totali
                    </span>
                  </div>
                </div>
                
                {recentModifications.length === 0 ? (
                  <p className="text-sm text-gray-600 py-4 text-center">
                    Nessuna attività recente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentModifications.map((modification) => (
                      <div 
                        key={modification.id}
                        className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{modification.employeeName}</span>
                            {' - '}
                            {CallTrackingService.getModificationDescription(modification)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico Call ({calls.length})</CardTitle>
          <CardDescription>Tutte le call pianificate e completate</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Nessuna call trovata. Pianifica la tua prima call!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div key={call.id} className="space-y-0">
                  <div 
                    id={`call-${call.id}`}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${
                      highlightCallId === call.id ? 'bg-yellow-50 border-yellow-300' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {call.employee.nome} {call.employee.cognome}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDateTime(call.dataSchedulata)}
                          </span>
                          {call.durata && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {call.durata} min
                            </span>
                          )}
                          {call.rating && (
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-1 fill-current text-yellow-500" />
                              {call.rating}/5
                            </span>
                          )}
                        </div>
                        {call.note && (
                          <p className="text-sm text-gray-600 mt-1 max-w-md truncate">
                            {call.note}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCallStatusColor(call.status)}`}>
                        {call.status === 'scheduled' && 'Programmata'}
                        {call.status === 'completed' && 'Completata'}
                        {call.status === 'cancelled' && 'Annullata'}
                        {call.status === 'suspended' && 'Sospesa'}
                        {call.status === 'rescheduled' && 'Riprogrammata'}
                      </span>
                      
                      {call.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          onClick={() => openCompleteForm(call)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completa
                        </Button>
                      )}

                      {/* Dropdown Menu for Actions */}
                      {(call.status === 'scheduled' || call.status === 'suspended' || call.status === 'rescheduled') && (
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenDropdown(openDropdown === call.id ? null : call.id)}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          
                          {openDropdown === call.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                              <div className="py-1">
                                {call.status === 'scheduled' && (
                                  <>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => handleSuspendCall(call)}
                                    >
                                      <Pause className="w-4 h-4 mr-2" />
                                      Sospendi
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => openRescheduleModal(call)}
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Riprogramma
                                    </button>
                                  </>
                                )}
                                
                                {call.status === 'suspended' && (
                                  <button
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    onClick={() => handleResumeCall(call)}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Riattiva
                                  </button>
                                )}
                                
                                {(call.status === 'suspended' || call.status === 'rescheduled') && (
                                  <button
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    onClick={() => openRescheduleModal(call)}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Riprogramma
                                  </button>
                                )}
                                
                                <hr className="my-1" />
                                <button
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  onClick={() => toggleCallHistory(call.id)}
                                >
                                  <History className="w-4 h-4 mr-2" />
                                  Cronologia
                                </button>
                                <button
                                  className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                  onClick={() => handleDeleteCall(call)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Elimina
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Call History Timeline */}
                  {selectedCallHistory === call.id && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-t-0 rounded-t-none">
                      <h4 className="flex items-center text-sm font-medium text-gray-900 mb-3">
                        <Activity className="w-4 h-4 mr-2" />
                        Cronologia Modifiche
                      </h4>
                      {(() => {
                        const modifications = CallTrackingService.getCallModifications(call.id);
                        if (modifications.length === 0) {
                          return (
                            <p className="text-sm text-gray-600">Nessuna modifica registrata</p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {modifications.map((modification, index) => (
                              <div 
                                key={modification.id}
                                className="flex items-start space-x-3 text-sm"
                              >
                                <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-gray-900">
                                    {CallTrackingService.getModificationDescription(modification)}
                                  </p>
                                  {modification.reason && (
                                    <p className="text-gray-600 mt-1">
                                      Motivo: {modification.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}