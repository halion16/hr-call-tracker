'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, Calendar, Clock, Star, User, CheckCircle, XCircle, Edit3, MoreVertical, Pause, Trash2, RotateCcw, Play, History, Activity, Square, CheckSquare, ChevronDown, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { callToasts } from '@/lib/toast';

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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Filtri e paginazione per Storico Call
  const [callSearchFilter, setCallSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [callCurrentPage, setCallCurrentPage] = useState(1);
  const [callItemsPerPage] = useState(5);
  const [callSortField, setCallSortField] = useState<'employee' | 'date' | 'status' | null>(null);
  const [callSortDirection, setCallSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({
    employeeId: '',
    dataSchedulata: '',
    note: '',
    durata: '',
    rating: '5',
    nextCallDate: ''
  });
  const [bulkEmployeeIds, setBulkEmployeeIds] = useState<Set<string>>(new Set());
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

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
    
    // Check if we're in bulk mode for multiple employees
    const employeeIds = bulkMode && bulkEmployeeIds.size > 0 
      ? Array.from(bulkEmployeeIds)
      : formData.employeeId ? [formData.employeeId] : [];
    
    if (employeeIds.length === 0) {
      toast.error(bulkMode ? 'Seleziona almeno un dipendente' : 'Seleziona un dipendente');
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
    
    try {
      const createdCalls: Call[] = [];
      const calendarEvents: string[] = [];
      
      // Create calls for all selected employees
      for (const employeeId of employeeIds) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) {
          console.warn(`Employee not found: ${employeeId}`);
          continue;
        }
        
        const newCall: Call = {
          id: generateId(),
          employeeId: employeeId,
          dataSchedulata: formData.dataSchedulata,
          note: formData.note,
          status: 'scheduled'
        };
        
        // Save call to storage
        LocalStorage.addCall(newCall);
        createdCalls.push(newCall);
        
        // Track creation
        CallTrackingService.trackModification(newCall.id, 'created', undefined, newCall);
        
        // Create automatic notifications
        try {
          await NotificationService.createCallReminder(newCall.id);
          await NotificationService.createCallEscalation(newCall.id);
        } catch (notificationError) {
          console.warn('Notification creation failed for call:', newCall.id, notificationError);
        }
        
        // Create Google Calendar event if connected
        try {
          if (GoogleCalendarService.isConnected()) {
            const calendarEvent = await GoogleCalendarService.createCallEvent({
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
              calendarEvents.push(employee.nome);
            }
          }
        } catch (calendarError) {
          console.warn('Calendar event creation failed for employee:', employee.nome, calendarError);
          // Non blocchiamo il processo se il calendario fallisce
        }
      }
      
      // Show success message
      const successMessage = employeeIds.length === 1
        ? `Call programmata!`
        : `${employeeIds.length} call programmate!`;
      
      const descriptionParts = [];
      if (calendarEvents.length > 0) {
        descriptionParts.push(`${calendarEvents.length} eventi calendario creati`);
      }
      descriptionParts.push(`Promemoria ed escalation attivati`);
      
      // Usa toast personalizzata
      if (bulkMode && selectedEmployees.length > 1) {
        callToasts.bulkCallsScheduled(selectedEmployees.length, {
          description: descriptionParts.join(' • '),
          action: {
            label: 'Visualizza Storico',
            onClick: () => {
              const element = document.getElementById('call-history-section');
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      } else {
        const employee = selectedEmployees[0];
        callToasts.callScheduled(
          `${employee.nome} ${employee.cognome}`, 
          formatDateTime(formData.dataSchedulata),
          {
            description: descriptionParts.join(' • '),
            action: {
              label: 'Visualizza',
              onClick: () => {
                const element = document.getElementById(`call-${createdCalls[0].id}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        );
      }
      
      loadData();
      resetForm();
      
    } catch (error) {
      console.error('Error scheduling calls:', error);
      toast.error('Errore durante la programmazione delle call');
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
      
      callToasts.callCompleted(employeeName, {
        description: `Call completata con successo${nextCallId ? ' • Prossima call programmata' : ''}`,
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
    setBulkEmployeeIds(new Set());
    setEmployeeSearchQuery('');
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

  // Bulk Actions Functions
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) {
      setSelectedCalls(new Set());
      setShowBulkActions(false);
    }
  };

  const toggleCallSelection = (callId: string) => {
    const newSelected = new Set(selectedCalls);
    if (newSelected.has(callId)) {
      newSelected.delete(callId);
    } else {
      newSelected.add(callId);
    }
    setSelectedCalls(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAllCalls = () => {
    const allCallIds = calls.map(call => call.id);
    setSelectedCalls(new Set(allCallIds));
    setShowBulkActions(true);
  };

  const deselectAllCalls = () => {
    setSelectedCalls(new Set());
    setShowBulkActions(false);
  };

  const getSelectedCallsData = () => {
    return calls.filter(call => selectedCalls.has(call.id));
  };

  // Bulk Employee Selection for New Calls
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(bulkEmployeeIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setBulkEmployeeIds(newSelected);
  };

  const selectAllEmployees = () => {
    const allEmployeeIds = employees.map(emp => emp.id);
    setBulkEmployeeIds(new Set(allEmployeeIds));
  };

  const deselectAllEmployees = () => {
    setBulkEmployeeIds(new Set());
  };

  // Filter employees based on search query
  const getFilteredEmployees = () => {
    if (!employeeSearchQuery.trim()) return employees;
    
    const query = employeeSearchQuery.toLowerCase().trim();
    return employees.filter(emp => 
      emp.nome.toLowerCase().includes(query) ||
      emp.cognome.toLowerCase().includes(query) ||
      emp.posizione.toLowerCase().includes(query) ||
      emp.dipartimento.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    );
  };

  // Bulk Action Handlers
  const bulkSuspendCalls = async () => {
    const selectedCallsData = getSelectedCallsData();
    const scheduledCalls = selectedCallsData.filter(call => call.status === 'scheduled');
    
    if (scheduledCalls.length === 0) {
      toast.error('Nessuna call programmata selezionata');
      return;
    }

    try {
      const promises = scheduledCalls.map(async (call) => {
        const updatedCall = { status: 'suspended' as const };
        LocalStorage.updateCall(call.id, updatedCall);
        CallTrackingService.trackModification(call.id, 'suspended', call, updatedCall);
        
        // Update calendar if connected
        if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
          try {
            await CalendarSyncService.syncCallToCalendar(updatedCall, call.employee, 'update');
          } catch (error) {
            console.warn(`Failed to update calendar for call ${call.id}:`, error);
          }
        }
      });

      await Promise.all(promises);
      loadData();
      setSelectedCalls(new Set());
      setShowBulkActions(false);
      
      toast.success(`${scheduledCalls.length} call sospese`, {
        description: 'Tutte le call selezionate sono state sospese'
      });
    } catch (error) {
      toast.error('Errore durante la sospensione delle call');
    }
  };

  const bulkResumeCalls = async () => {
    const selectedCallsData = getSelectedCallsData();
    const suspendedCalls = selectedCallsData.filter(call => call.status === 'suspended');
    
    if (suspendedCalls.length === 0) {
      toast.error('Nessuna call sospesa selezionata');
      return;
    }

    try {
      const promises = suspendedCalls.map(async (call) => {
        const updatedCall = { status: 'scheduled' as const };
        LocalStorage.updateCall(call.id, updatedCall);
        CallTrackingService.trackModification(call.id, 'resumed', call, updatedCall);
        
        // Update calendar if connected
        if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
          try {
            await CalendarSyncService.syncCallToCalendar(updatedCall, call.employee, 'update');
          } catch (error) {
            console.warn(`Failed to update calendar for call ${call.id}:`, error);
          }
        }
      });

      await Promise.all(promises);
      loadData();
      setSelectedCalls(new Set());
      setShowBulkActions(false);
      
      toast.success(`${suspendedCalls.length} call riattivate`, {
        description: 'Tutte le call selezionate sono state riattivate'
      });
    } catch (error) {
      toast.error('Errore durante la riattivazione delle call');
    }
  };

  const bulkDeleteCalls = async () => {
    const selectedCallsData = getSelectedCallsData();
    
    if (!confirm(`Vuoi davvero eliminare ${selectedCallsData.length} call selezionate?`)) {
      return;
    }

    try {
      const promises = selectedCallsData.map(async (call) => {
        // Track deletion before actually deleting
        CallTrackingService.trackModification(call.id, 'deleted', call, undefined);
        
        // Cancel notifications
        NotificationService.cancelCallNotifications(call.id);
        
        // Delete Google Calendar event if exists
        if (call.googleCalendarEventId && GoogleCalendarService.isConnected()) {
          try {
            await GoogleCalendarService.deleteEvent(call.googleCalendarEventId);
          } catch (error) {
            console.warn(`Failed to delete calendar event for call ${call.id}:`, error);
          }
        }
        
        LocalStorage.deleteCall(call.id);
      });

      await Promise.all(promises);
      loadData();
      setSelectedCalls(new Set());
      setShowBulkActions(false);
      
      toast.success(`${selectedCallsData.length} call eliminate`, {
        description: 'Tutte le call selezionate sono state eliminate'
      });
    } catch (error) {
      toast.error('Errore durante l\'eliminazione delle call');
    }
  };

  // Funzioni per filtri e ordinamento delle call
  const filteredCalls = calls.filter(call => {
    const matchesSearch = callSearchFilter === '' || 
      `${call.employee.nome} ${call.employee.cognome}`.toLowerCase().includes(callSearchFilter.toLowerCase()) ||
      call.employee.posizione.toLowerCase().includes(callSearchFilter.toLowerCase()) ||
      call.employee.dipartimento.toLowerCase().includes(callSearchFilter.toLowerCase()) ||
      call.note?.toLowerCase().includes(callSearchFilter.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedCalls = [...filteredCalls].sort((a, b) => {
    if (!callSortField) return 0;
    
    let aValue, bValue;
    switch (callSortField) {
      case 'employee':
        aValue = `${a.employee.nome} ${a.employee.cognome}`.toLowerCase();
        bValue = `${b.employee.nome} ${b.employee.cognome}`.toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.dataSchedulata).getTime();
        bValue = new Date(b.dataSchedulata).getTime();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return callSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return callSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalCallPages = Math.ceil(sortedCalls.length / callItemsPerPage);
  const startCallIndex = (callCurrentPage - 1) * callItemsPerPage;
  const paginatedCalls = sortedCalls.slice(startCallIndex, startCallIndex + callItemsPerPage);

  const handleCallSort = (field: 'employee' | 'date' | 'status') => {
    if (callSortField === field) {
      setCallSortDirection(callSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCallSortField(field);
      setCallSortDirection('asc');
    }
    setCallCurrentPage(1);
  };

  const getSortCallIcon = (field: 'employee' | 'date' | 'status') => {
    if (callSortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return callSortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
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
        
        <div className="flex space-x-2">
          <Button 
            variant={bulkMode ? "secondary" : "outline"}
            onClick={toggleBulkMode}
          >
            {bulkMode ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
            {bulkMode ? 'Esci Selezione' : 'Azioni di Massa'}
          </Button>
          <Button onClick={() => setShowScheduleForm(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Pianifica Nuova Call
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <Card className="fade-in smooth-hover">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {selectedCalls.size === 0 ? (
                    'Seleziona le call su cui agire'
                  ) : (
                    `${selectedCalls.size} call selezionate`
                  )}
                </div>
                {calls.length > 0 && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllCalls}
                      disabled={selectedCalls.size === calls.length}
                    >
                      Seleziona tutte ({calls.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllCalls}
                      disabled={selectedCalls.size === 0}
                    >
                      Deseleziona tutto
                    </Button>
                  </div>
                )}
              </div>
              
              {showBulkActions && (
                <div className="flex space-x-2">
                  {getSelectedCallsData().some(call => call.status === 'scheduled') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={bulkSuspendCalls}
                      className="text-yellow-700 hover:text-yellow-800"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Sospendi Selezionate
                    </Button>
                  )}
                  
                  {getSelectedCallsData().some(call => call.status === 'suspended') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={bulkResumeCalls}
                      className="text-green-700 hover:text-green-800"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Riattiva Selezionate
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={bulkDeleteCalls}
                    className="text-red-700 hover:text-red-800"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina Selezionate
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showScheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {bulkMode ? 'Pianifica Call Multiple' : 'Pianifica Nuova Call'}
            </CardTitle>
            <CardDescription>
              {bulkMode ? 'Schedula call con più dipendenti contemporaneamente' : 'Schedula una call di recap con un dipendente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={scheduleCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {bulkMode ? 'Dipendenti' : 'Dipendente'}
                </label>
                
                {bulkMode ? (
                  <div className="space-y-3">
                    {/* Search Filter */}
                    <Input
                      type="text"
                      placeholder="Cerca dipendenti per nome, posizione, dipartimento..."
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      className="w-full"
                    />
                    
                    {/* Bulk Selection Controls */}
                    <div className="flex items-center space-x-4 py-2">
                      <div className="text-sm text-gray-600">
                        {bulkEmployeeIds.size === 0 
                          ? 'Nessun dipendente selezionato'
                          : `${bulkEmployeeIds.size} dipendenti selezionati`
                        }
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={selectAllEmployees}
                          disabled={bulkEmployeeIds.size === employees.length}
                        >
                          Seleziona tutti
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={deselectAllEmployees}
                          disabled={bulkEmployeeIds.size === 0}
                        >
                          Deseleziona tutto
                        </Button>
                      </div>
                    </div>
                    
                    {/* Employee Selection List */}
                    <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                      {getFilteredEmployees().map(emp => (
                        <div
                          key={emp.id} 
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleEmployeeSelection(emp.id)}
                        >
                          <div className="flex items-center justify-center w-5 h-5">
                            {bulkEmployeeIds.has(emp.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {emp.nome} {emp.cognome}
                            </div>
                            <div className="text-xs text-gray-600">
                              {emp.posizione} • {emp.dipartimento}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {getFilteredEmployees().length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          {employeeSearchQuery ? 'Nessun dipendente trovato' : 'Nessun dipendente disponibile'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
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
                )}
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
      <Card className="fade-in smooth-hover">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Attività Recente
          </CardTitle>
          <CardDescription>Ultime modifiche alle call</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const recentModifications = CallTrackingService.getRecentModifications(15);
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
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
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

      <Card id="call-history-section" className="fade-in smooth-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storico Call ({sortedCalls.length})</CardTitle>
              <CardDescription>Tutte le call pianificate e completate</CardDescription>
            </div>
          </div>
          
          {/* Filtri e Ricerca */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome, posizione, dipartimento o note..."
                  value={callSearchFilter}
                  onChange={(e) => setCallSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 h-10 px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">Tutti gli stati</option>
              <option value="scheduled">Programmata</option>
              <option value="completed">Completata</option>
              <option value="cancelled">Annullata</option>
              <option value="suspended">Sospesa</option>
              <option value="rescheduled">Riprogrammata</option>
            </select>
          </div>

          {/* Header di ordinamento */}
          <div className="flex items-center gap-4 mt-4 p-2 bg-gray-50 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCallSort('employee')}
              className="flex items-center gap-2"
            >
              Dipendente {getSortCallIcon('employee')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCallSort('date')}
              className="flex items-center gap-2"
            >
              Data {getSortCallIcon('date')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCallSort('status')}
              className="flex items-center gap-2"
            >
              Stato {getSortCallIcon('status')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {callSearchFilter || statusFilter !== 'all' 
                  ? 'Nessuna call corrisponde ai filtri selezionati' 
                  : 'Nessuna call trovata. Pianifica la tua prima call!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedCalls.map((call, index) => (
                <div key={call.id} className="space-y-0 stagger-item" style={{animationDelay: `${index * 0.05}s`}}>
                  <div 
                    id={`call-${call.id}`}
                    className={`flex items-center justify-between p-4 border rounded-lg smooth-hover ${
                      highlightCallId === call.id ? 'bg-yellow-50 border-yellow-300' : ''
                    } ${selectedCalls.has(call.id) ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Selection Checkbox */}
                      {bulkMode && (
                        <button
                          onClick={() => toggleCallSelection(call.id)}
                          className="flex items-center justify-center w-5 h-5"
                        >
                          {selectedCalls.has(call.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      )}
                      
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
                      
                      {!bulkMode && call.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          onClick={() => openCompleteForm(call)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completa
                        </Button>
                      )}

                      {/* Dropdown Menu for Actions */}
                      {!bulkMode && (call.status === 'scheduled' || call.status === 'suspended' || call.status === 'rescheduled') && (
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
            
            {/* Paginazione */}
            {totalCallPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando {startCallIndex + 1}-{Math.min(startCallIndex + callItemsPerPage, sortedCalls.length)} di {sortedCalls.length} call
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCallCurrentPage(callCurrentPage - 1)}
                    disabled={callCurrentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Precedente
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalCallPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalCallPages || 
                        Math.abs(page - callCurrentPage) <= 1
                      )
                      .map((page, index, array) => (
                        <div key={page} className="flex items-center">
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={callCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCallCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCallCurrentPage(callCurrentPage + 1)}
                    disabled={callCurrentPage === totalCallPages}
                  >
                    Successiva
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}