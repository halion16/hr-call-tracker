'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, Calendar, Clock, Star, User, CheckCircle, XCircle, Edit3, MoreVertical, Pause, Trash2, RotateCcw, Play, History, Activity, Square, CheckSquare, ChevronDown, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, Bell, Copy } from 'lucide-react';
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
import { ExportModal } from '@/components/ExportModal';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { AdvancedFilterPanel } from '@/components/filters/advanced-filter-panel';
import { CallFilters, filterManager } from '@/lib/filters';
import { QuickActions } from '@/components/calls/quick-actions';
import { BulkQuickActions } from '@/components/calls/bulk-quick-actions';
import { TemplateSelector } from '@/components/templates/template-selector';
import { callTemplatesService, CallTemplate } from '@/lib/call-templates-service';
import { autocompleteService } from '@/lib/autocomplete-service';
import { CallConflictDetector } from '@/lib/call-conflict-detector';

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
  
  // Template management states
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CallTemplate | null>(null);
  
  // Client-side hydration state
  const [isClient, setIsClient] = useState(false);
  
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
  
  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'calls' | 'employees' | 'both'>('calls');
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<CallFilters>({});

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<Call[][]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Conflict detection state
  const [conflicts, setConflicts] = useState<Call[][]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  
  // Validation for call scheduling

  // Initialize push notifications
  const {
    settings: notificationSettings,
    updateSettings: updateNotificationSettings,
    hasPermission,
    requestPermission,
    testNotification,
    isSupported: notificationsSupported
  } = useCallNotifications(calls.map(c => ({
    id: c.id,
    employeeId: c.employeeId,
    dataSchedulata: c.dataSchedulata,
    status: c.status
  })), employees);

  useEffect(() => {
    setIsClient(true);
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

  // Handle template selection
  const handleTemplateSelect = (template: CallTemplate) => {
    const templateContent = callTemplatesService.generateCallContent(template.id);
    
    setFormData(prev => ({
      ...prev,
      note: templateContent.note,
      durata: templateContent.estimatedDuration
    }));
    
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    
    toast.success(`Template "${template.name}" applicato con successo!`, {
      description: `Durata stimata: ${templateContent.estimatedDuration} minuti`
    });
  };

  const scheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we're in bulk mode for multiple employees
    const employeeIds = bulkMode && bulkEmployeeIds.size > 0 
      ? Array.from(bulkEmployeeIds)
      : formData.employeeId ? [formData.employeeId] : [];
    
    // Basic validation
    if (employeeIds.length === 0) {
      toast.error(bulkMode ? 'Seleziona almeno un dipendente' : 'Seleziona un dipendente');
      return;
    }
    
    if (!formData.dataSchedulata) {
      toast.error('Seleziona data e ora');
      return;
    }
    
    try {
      const createdCalls: Call[] = [];
      const calendarEvents: string[] = [];

      // Check for conflicts before creating any calls
      const requestedDateTime = new Date(formData.dataSchedulata);

      if (employeeIds.length === 1) {
        // Single employee - check conflict and suggest alternative if needed
        const conflictCheck = CallConflictDetector.hasTimeConflict(requestedDateTime);

        if (conflictCheck.hasConflict) {
          const alternative = CallConflictDetector.suggestAlternativeTime(requestedDateTime);
          const confirmMessage = `⚠️ Conflitto di orario rilevato!\n\n` +
            `Orario richiesto: ${requestedDateTime.toLocaleString()}\n` +
            `Orario suggerito: ${alternative.suggestedTime.toLocaleString()}\n\n` +
            `Vuoi usare l'orario suggerito?\n\n` +
            `Motivo: ${alternative.reason}`;

          if (confirm(confirmMessage)) {
            formData.dataSchedulata = alternative.suggestedTime.toISOString();
          } else {
            toast.warning('Programmazione annullata - conflitto di orario non risolto');
            return;
          }
        }
      } else {
        // Multiple employees - automatically space out calls with 25-minute gaps
        toast.info(`📅 Programmazione multipla: le call verranno distanziate di 25 minuti per evitare conflitti`);
      }

      // Create calls for all selected employees
      for (let index = 0; index < employeeIds.length; index++) {
        const employeeId = employeeIds[index];
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) {
          console.warn(`Employee not found: ${employeeId}`);
          continue;
        }

        // For multiple employees, space out calls by 25 minutes each
        let callDateTime = new Date(formData.dataSchedulata);
        if (employeeIds.length > 1) {
          callDateTime = CallConflictDetector.findAvailableTimeSlot(
            new Date(requestedDateTime.getTime() + (index * 25 * 60 * 1000))
          );
        }

        const newCall: Call = {
          id: generateId(),
          employeeId: employeeId,
          dataSchedulata: callDateTime.toISOString(),
          note: employeeIds.length > 1
            ? `${formData.note} (Programmata automaticamente con distanziamento per evitare conflitti)`
            : formData.note,
          status: 'scheduled'
        };
        
        // Save call to storage
        LocalStorage.addCall(newCall);
        createdCalls.push(newCall);
        
        // Learn from this call for autocomplete
        autocompleteService.learnFromCall(newCall);
        
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
      const selectedEmployees = employeeIds.map(id => employees.find(emp => emp.id === id)).filter(Boolean);
      
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
    
    // Basic validation for completion
    if (!formData.durata) {
      toast.error('Inserisci la durata della call');
      return;
    }
    
    if (!formData.rating) {
      toast.error('Seleziona una valutazione');
      return;
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
      
      // Learn from completed call for autocomplete
      const completedCall = { ...selectedCall, ...updatedCall };
      autocompleteService.learnFromCall(completedCall);
      
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

  // Duplicate detection function
  const detectDuplicates = () => {
    const duplicateGroups: Call[][] = [];
    const checkedCalls = new Set<string>();

    calls.forEach(call => {
      if (checkedCalls.has(call.id)) return;

      const potentialDuplicates = calls.filter(otherCall => {
        if (otherCall.id === call.id || checkedCalls.has(otherCall.id)) return false;

        // Same employee
        if (otherCall.employeeId !== call.employeeId) return false;

        // Same or very close scheduled date (within 24 hours)
        const date1 = new Date(call.dataSchedulata);
        const date2 = new Date(otherCall.dataSchedulata);
        const timeDiff = Math.abs(date1.getTime() - date2.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff > 24) return false;

        // Similar status or both scheduled/completed
        const similarStatus = otherCall.status === call.status ||
          (call.status === 'scheduled' && otherCall.status === 'rescheduled') ||
          (call.status === 'rescheduled' && otherCall.status === 'scheduled');

        return similarStatus;
      });

      if (potentialDuplicates.length > 0) {
        const duplicateGroup = [call, ...potentialDuplicates];
        duplicateGroups.push(duplicateGroup);

        // Mark all calls in this group as checked
        duplicateGroup.forEach(dupCall => checkedCalls.add(dupCall.id));
      }
    });

    setDuplicates(duplicateGroups);
    setShowDuplicates(true);

    if (duplicateGroups.length === 0) {
      toast.success('✅ Nessun duplicato trovato!');
    } else {
      toast.warning(`⚠️ Trovati ${duplicateGroups.length} gruppi di call duplicate`);
    }
  };

  // Check if a specific call has conflicts
  const hasCallConflicts = (callId: string) => {
    const conflictCheck = CallConflictDetector.getCallConflicts(callId);
    return conflictCheck.hasConflicts;
  };

  // Get enhanced call status information for rescheduled calls
  const getEnhancedCallStatus = (call: Call) => {
    const baseStatus = {
      status: call.status,
      label: {
        'scheduled': 'Programmata',
        'completed': 'Completata',
        'cancelled': 'Annullata',
        'suspended': 'Sospesa',
        'rescheduled': 'Riprogrammata'
      }[call.status] || call.status,
      colorClass: getCallStatusColor(call.status),
      tooltip: ''
    };

    // If not rescheduled, return basic info
    if (call.status !== 'rescheduled' || !call.modifications || call.modifications.length === 0) {
      return baseStatus;
    }

    // Find the reschedule modifications
    const reschedules = call.modifications
      .filter(mod => mod.action === 'rescheduled')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (reschedules.length === 0) {
      return baseStatus;
    }

    // Get original and current dates
    const firstReschedule = reschedules[0];
    const originalDate = firstReschedule.previousData?.dataSchedulata;
    const currentDate = call.dataSchedulata;
    const rescheduleCount = call.rescheduledCount || reschedules.length;

    // Enhanced label and tooltip
    const enhancedLabel = rescheduleCount > 1
      ? `Riprogrammata (${rescheduleCount}x)`
      : 'Riprogrammata';

    const tooltip = originalDate
      ? `Originale: ${formatDateTime(originalDate)}\nAttuale: ${formatDateTime(currentDate)}\nRiprogrammazioni: ${rescheduleCount}`
      : `Riprogrammata ${rescheduleCount} volte`;

    return {
      ...baseStatus,
      label: enhancedLabel,
      tooltip,
      hasRescheduleInfo: true,
      originalDate,
      currentDate,
      rescheduleCount
    };
  };

  // Detect existing conflicts function
  const detectExistingConflicts = () => {
    const conflictAnalysis = CallConflictDetector.detectAllExistingConflicts();

    setConflicts(conflictAnalysis.conflictGroups);
    setShowConflicts(true);

    if (conflictAnalysis.conflictGroups.length === 0) {
      toast.success('✅ Nessun conflitto di orario rilevato!');
    } else {
      toast.error(`⚠️ ${conflictAnalysis.summary}`);
    }
  };

  // Delete duplicate call function
  const deleteDuplicateCall = async (callId: string) => {
    const call = calls.find(c => c.id === callId);
    if (!call) return;

    const employee = employees.find(emp => emp.id === call.employeeId);
    if (!employee) return;

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

      // Update local state immediately
      const updatedCalls = calls.filter(c => c.id !== callId);
      setCalls(updatedCalls);

      // Update duplicates list based on remaining calls
      const remainingDuplicates = duplicates.map(group =>
        group.filter(c => c.id !== callId)
      ).filter(group => group.length > 1); // Keep only groups with 2+ calls

      setDuplicates(remainingDuplicates);

      toast.success('Call duplicata eliminata');

      // If no more duplicates, hide the panel
      if (remainingDuplicates.length === 0) {
        toast.success('✅ Nessun duplicato rimanente');
        setShowDuplicates(false);
      }

    } catch (error) {
      console.error('Errore durante l\'eliminazione della call duplicata:', error);
      toast.error('Errore durante l\'eliminazione della call');
    }
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

  // Apply advanced filters using filter manager
  const filteredCalls = React.useMemo(() => {
    // Combine advanced filters with existing legacy filters for backward compatibility
    const combinedFilters: CallFilters = {
      ...advancedFilters,
      // Merge legacy search and status filters
      ...(callSearchFilter && { search: callSearchFilter }),
      ...(statusFilter !== 'all' && { status: [statusFilter as Call['status']] })
    };
    
    return filterManager.filterCalls(calls, employees, combinedFilters);
  }, [calls, employees, advancedFilters, callSearchFilter, statusFilter]);

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

      {/* Advanced Filters */}
      <AdvancedFilterPanel
        onFiltersChange={setAdvancedFilters}
        currentFilters={advancedFilters}
        filterOptions={filterManager.getCallFilterOptions(calls, employees)}
      />

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
                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Actions */}
                  <BulkQuickActions
                    selectedCalls={getSelectedCallsData()}
                    onActionComplete={loadData}
                  />
                  
                  {/* Standard Bulk Actions */}
                  <div className="flex space-x-2 border-l pl-2">
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
              {/* Validation Summary */}
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {bulkMode ? 'Dipendenti' : 'Dipendente'}
                </label>
                
                {bulkMode ? (
                  <div className="space-y-3">
                    {/* Search Filter */}
                    <Input
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      placeholder="Cerca dipendenti per nome, posizione, dipartimento..."
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
                  <div className="space-y-2">
                    {/* Search Filter for Single Mode */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Cerca dipendente per nome, cognome, posizione..."
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Employee Selection Dropdown */}
                    <select 
                      value={formData.employeeId}
                      onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Seleziona dipendente</option>
                      {getFilteredEmployees().map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome} {emp.cognome} - {emp.posizione} ({emp.dipartimento})
                        </option>
                      ))}
                    </select>
                    
                    {getFilteredEmployees().length === 0 && employeeSearchQuery && (
                      <p className="text-sm text-gray-500 italic">
                        Nessun dipendente trovato per "{employeeSearchQuery}"
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  value={formData.dataSchedulata}
                  onChange={(e) => {
                    setFormData({...formData, dataSchedulata: e.target.value});
                  }}
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Note (opzionale)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateSelector(true)}
                    className="text-xs"
                  >
                    📋 Usa Template
                  </Button>
                </div>
                
                {selectedTemplate && (
                  <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
                    <span className="text-blue-700 dark:text-blue-300">
                      Template applicato: <strong>{selectedTemplate.name}</strong>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setFormData(prev => ({ ...prev, note: '' }));
                      }}
                      className="ml-2 h-4 w-4 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                )}
                
                <Textarea
                  value={formData.note}
                  onChange={(e) => {
                    setFormData({...formData, note: e.target.value});
                  }}
                  placeholder="Argomenti da discutere, obiettivi della call..."
                  rows={3}
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
                  onChange={(e) => {
                    setFormData({...formData, durata: e.target.value});
                  }}
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
                  onChange={(e) => {
                    setFormData({...formData, note: e.target.value});
                  }}
                  placeholder="Riassunto della discussione, punti salienti, feedback..."
                  rows={3}
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
                  rows={3}
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
          {!isClient ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium text-blue-900">
                    ... modifiche oggi
                  </span>
                  <span className="text-blue-700">
                    ... totali
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 py-4 text-center">
                Caricamento attività...
              </p>
            </div>
          ) : (() => {
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
            <div className="flex items-center gap-2">
              {/* Notification settings button */}
              {!isClient ? (
                // Server-side placeholder button
                <button
                  className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                  title="Caricamento notifiche..."
                  disabled
                >
                  <Bell className="h-4 w-4" />
                </button>
              ) : (
                notificationsSupported && (
                  <button
                    onClick={async () => {
                      if (!hasPermission) {
                        const granted = await requestPermission();
                        if (granted) {
                          updateNotificationSettings({ enabled: true });
                          toast.success('Notifiche abilitate!');
                        }
                      } else {
                        const success = await testNotification();
                        if (success) {
                          toast.success('Test notifica inviato!');
                        }
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      notificationSettings.enabled && hasPermission
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={hasPermission ? 'Test notifica' : 'Abilita notifiche'}
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={detectDuplicates}
                className="scale-hover"
                title="Rileva call duplicate"
              >
                <Copy className="h-4 w-4 mr-2" />
                Rileva Duplicati
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={detectExistingConflicts}
                className="scale-hover"
                title="Rileva conflitti di orario esistenti"
              >
                <Clock className="h-4 w-4 mr-2" />
                Rileva Conflitti
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExportType('calls');
                  setExportModalOpen(true);
                }}
                className="scale-hover"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta Call
              </Button>
            </div>
          </div>
          
          {/* Filtri e Ricerca */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                <Input
                  value={callSearchFilter}
                  onChange={(e) => setCallSearchFilter(e.target.value)}
                  placeholder="Cerca per nome, posizione, dipartimento o note..."
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

          {/* Conteggio call filtrate */}
          <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-blue-900">
                {filteredCalls.length === calls.length ? (
                  <>Visualizzando tutte le <span className="font-bold">{calls.length}</span> call</>
                ) : (
                  <>
                    Filtrate <span className="font-bold">{filteredCalls.length}</span> su <span className="font-bold">{calls.length}</span> call totali
                  </>
                )}
              </span>
              {(callSearchFilter || statusFilter !== 'all') && (
                <button 
                  onClick={() => {
                    setCallSearchFilter('');
                    setStatusFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Rimuovi filtri
                </button>
              )}
            </div>
            {filteredCalls.length > 0 && (
              <div className="text-xs text-blue-600">
                {statusFilter !== 'all' && (
                  <span className="bg-blue-100 px-2 py-1 rounded-full">
                    {statusFilter === 'scheduled' && '🟡 Programmate'}
                    {statusFilter === 'completed' && '🟢 Completate'}  
                    {statusFilter === 'cancelled' && '🔴 Annullate'}
                    {statusFilter === 'suspended' && '🟠 Sospese'}
                    {statusFilter === 'rescheduled' && '🔵 Riprogrammate'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Conflict Detection Results */}
          {showConflicts && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-red-800 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Conflitti di Orario Rilevati ({conflicts.length} gruppi)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConflicts(false)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {conflicts.length === 0 ? (
                <p className="text-red-700">✅ Nessun conflitto di orario rilevato</p>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ <strong>Attenzione:</strong> Le call seguenti hanno conflitti di orario (distanza minima 25 minuti non rispettata).
                      <br />È consigliabile riprogrammare alcune call per evitare sovrapposizioni.
                    </p>
                  </div>

                  {conflicts.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white border border-red-200 rounded-md p-3">
                      <h5 className="font-medium text-gray-800 mb-2">
                        Gruppo Conflitto {groupIndex + 1} ({group.length} call coinvolte)
                      </h5>
                      <div className="grid gap-2">
                        {group
                          .sort((a, b) => new Date(a.dataSchedulata).getTime() - new Date(b.dataSchedulata).getTime())
                          .map((call, callIndex) => {
                            const employee = employees.find(emp => emp.id === call.employeeId);
                            const callStart = new Date(call.dataSchedulata);
                            const callEnd = new Date(callStart.getTime() + 30 * 60 * 1000); // 30 min duration

                            return (
                              <div key={call.id} className="flex items-center justify-between bg-red-50 p-2 rounded text-sm border border-red-200">
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono text-xs bg-red-200 px-2 py-1 rounded">
                                    {callIndex + 1}
                                  </span>
                                  <span className="font-medium">
                                    {employee?.nome} {employee?.cognome}
                                  </span>
                                  <span className="text-red-700">
                                    {formatDateTime(call.dataSchedulata)}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${getCallStatusColor(call.status)}`}>
                                    {call.status}
                                  </span>
                                  {call.note && (
                                    <span className="text-gray-500 truncate max-w-[150px]">
                                      📝 {call.note}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Trova un orario alternativo per questa call
                                    const alternative = CallConflictDetector.suggestAlternativeTime(
                                      new Date(call.dataSchedulata),
                                      call.id
                                    );

                                    const message = `⏰ Orario attuale: ${callStart.toLocaleString()}\n` +
                                      `✅ Orario suggerito: ${alternative.suggestedTime.toLocaleString()}\n\n` +
                                      `Vuoi spostare la call all'orario suggerito?`;

                                    if (confirm(message)) {
                                      // Aggiorna la call con il nuovo orario
                                      LocalStorage.updateCall(call.id, {
                                        dataSchedulata: alternative.suggestedTime.toISOString(),
                                        note: call.note
                                          ? `${call.note} (Riprogrammata per risolvere conflitto di orario)`
                                          : 'Riprogrammata per risolvere conflitto di orario'
                                      });
                                      loadData();
                                      toast.success('Call riprogrammata con successo');

                                      // Rigenera l'analisi conflitti dopo la modifica
                                      setTimeout(() => detectExistingConflicts(), 500);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Risolvi conflitto - suggerisci orario alternativo"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Duplicate Detection Results */}
          {showDuplicates && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-yellow-800 flex items-center">
                  <Copy className="h-4 w-4 mr-2" />
                  Call Duplicate Rilevate ({duplicates.length} gruppi)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDuplicates(false)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {duplicates.length === 0 ? (
                <p className="text-yellow-700">✅ Nessun duplicato trovato</p>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white border border-yellow-200 rounded-md p-3">
                      <h5 className="font-medium text-gray-800 mb-2">
                        Gruppo {groupIndex + 1} - {employees.find(emp => emp.id === group[0].employeeId)?.nome || 'Unknown'} {employees.find(emp => emp.id === group[0].employeeId)?.cognome || ''}
                      </h5>
                      <div className="grid gap-2">
                        {group.map((call, callIndex) => (
                          <div key={call.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                                {callIndex + 1}
                              </span>
                              <span>{formatDateTime(call.dataSchedulata)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getCallStatusColor(call.status)}`}>
                                {call.status}
                              </span>
                              {call.note && (
                                <span className="text-gray-500 truncate max-w-[200px]">
                                  📝 {call.note}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDuplicateCall(call.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Elimina questa call duplicata"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                          {hasCallConflicts(call.id) && (
                            <span className="flex items-center bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3 mr-1" />
                              Conflitto Orario
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
                      {(() => {
                        const statusInfo = getEnhancedCallStatus(call);
                        return (
                          <div className="flex flex-col items-end">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.colorClass} ${statusInfo.hasRescheduleInfo ? 'cursor-help' : ''}`}
                              title={statusInfo.tooltip}
                            >
                              {statusInfo.label}
                            </span>
                            {statusInfo.hasRescheduleInfo && statusInfo.originalDate && (
                              <div className="mt-1 text-xs text-gray-500">
                                <div className="text-right">
                                  <span className="block">📅 Orig: {new Date(statusInfo.originalDate).toLocaleDateString('it-IT')}</span>
                                  <span className="block">🔄 Nuova: {new Date(statusInfo.currentDate).toLocaleDateString('it-IT')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {!bulkMode && call.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          onClick={() => openCompleteForm(call)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completa
                        </Button>
                      )}

                      {/* Quick Actions */}
                      {!bulkMode && (
                        <QuickActions
                          call={call}
                          employee={call.employee}
                          onActionComplete={loadData}
                        />
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

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={{
          calls: exportType === 'calls' || exportType === 'both' ? sortedCalls : undefined,
          employees: exportType === 'employees' || exportType === 'both' ? employees : undefined
        }}
        type={exportType}
        title={exportType === 'calls' ? 'Esporta Storico Call' : 
               exportType === 'employees' ? 'Esporta Dipendenti' : 
               'Esporta Dati Completi'}
      />

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[80vh] overflow-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Seleziona Template per la Chiamata</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateSelector(false)}
                >
                  ✕
                </Button>
              </div>
              
              <TemplateSelector
                onSelectTemplate={handleTemplateSelect}
                showCreateNew={false}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}