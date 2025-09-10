'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Phone, Calendar, Mail, User, Building2, Loader2, Users, X, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Download, PhoneCall, Settings, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';
import { NotificationService } from '@/lib/notification-service';
import { GoogleCalendarService } from '@/lib/google-calendar-service';
import { CalendarSyncService } from '@/lib/calendar-sync-service';
import { Employee, Call } from '@/types';
import { formatDate, generateId } from '@/lib/utils';
import { toast } from 'sonner';
import { PriorityConfigService } from '@/lib/priority-config';
import { useKeyboardShortcuts, useModalKeyboardNavigation, useFocusManagement } from '@/hooks/useKeyboardShortcuts';
import { useFormValidation, useTimeConflictDetection, commonValidationRules } from '@/hooks/useFormValidation';
import { ExportModal } from '@/components/ExportModal';
import { Autocomplete } from '@/components/ui/autocomplete';
import { autocompleteService } from '@/lib/autocomplete-service';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // Ordinamento
  const [sortField, setSortField] = useState<'name' | 'department' | 'hireDate' | 'position' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Loading states aggiuntivi
  const [schedulingCall, setSchedulingCall] = useState(false);
  
  // Bulk selection states
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Priority config modal
  const [showPriorityConfig, setShowPriorityConfig] = useState(false);
  
  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Refs per keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Form validation per single call modal
  const callFormValidation = useFormValidation({
    dataSchedulata: {
      value: '',
      rules: [commonValidationRules.dateTime]
    },
    note: {
      value: '',
      rules: [commonValidationRules.notes]
    }
  });

  // Form validation per bulk call modal  
  const bulkFormValidation = useFormValidation({
    dataSchedulata: {
      value: '',
      rules: [commonValidationRules.dateTime]
    },
    note: {
      value: '',
      rules: [commonValidationRules.notes]
    }
  });

  // Time conflict detection
  const { conflicts, checkTimeConflict } = useTimeConflictDetection();

  useEffect(() => {
    loadEmployees();
    
    const syncDate = localStorage.getItem('hr-tracker-last-sync');
    if (syncDate) {
      setLastSync(new Date(syncDate));
    }
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Simula un breve delay per mostrare il loading
      await new Promise(resolve => setTimeout(resolve, 300));
      const loadedEmployees = LocalStorage.getEmployees();
      setEmployees(loadedEmployees);
    } finally {
      setLoading(false);
    }
  };

  const syncEmployees = async () => {
    // Conferma per azione distruttiva
    const hasExistingData = employees.length > 0;
    if (hasExistingData) {
      const confirmMessage = `⚠️ La sincronizzazione sostituirà i dati attuali (${employees.length} dipendenti).\n\nVuoi procedere?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setSyncing(true);
    try {
      const companyEmployees = await RealCompanyApiService.syncEmployees();
      
      const existingEmployees = LocalStorage.getEmployees();
      let newCount = 0;
      let updatedCount = 0;
      let removedCount = 0;
      
      // Sostituisci completamente con solo i dipendenti attivi dall'API
      const updatedEmployees = companyEmployees.map(apiEmployee => {
        const existingEmployee = existingEmployees.find(emp => emp.id === apiEmployee.id);
        
        if (existingEmployee) {
          updatedCount++;
          return { ...existingEmployee, ...apiEmployee };
        } else {
          newCount++;
          return apiEmployee;
        }
      });
      
      // Conta i dipendenti rimossi (quelli che non sono più attivi)
      removedCount = existingEmployees.length - updatedEmployees.length + newCount;
      
      LocalStorage.setEmployees(updatedEmployees);
      setEmployees(updatedEmployees);
      
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('hr-tracker-last-sync', now.toISOString());
      
      toast.success('Sincronizzazione completata!', {
        description: `${newCount} nuovi dipendenti, ${updatedCount} aggiornamenti, ${removedCount} rimossi (inattivi)`
      });
    } catch (error) {
      toast.error('Errore durante la sincronizzazione', {
        description: 'Controlla la connessione e riprova'
      });
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const scheduleCall = (employee: Employee) => {
    setSelectedEmployee(employee);
    callFormValidation.resetForm();
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || schedulingCall) return;

    // Valida il form
    if (!callFormValidation.validateForm()) {
      toast.error('Correggi gli errori nel form prima di procedere');
      return;
    }

    // Check per conflitti orari
    const scheduledTime = new Date(callFormValidation.formState.dataSchedulata.value);
    const timeConflicts = await checkTimeConflict(selectedEmployee.id, scheduledTime);
    
    if (timeConflicts.length > 0) {
      const confirmMessage = `⚠️ Attenzione: ${timeConflicts.join(', ')}.\n\nVuoi comunque procedere?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setSchedulingCall(true);
    try {
      const newCall: Call = {
        id: generateId(),
        employeeId: selectedEmployee.id,
        dataSchedulata: callFormValidation.formState.dataSchedulata.value,
        note: callFormValidation.formState.note.value,
        status: 'scheduled'
      };

      // Save call to storage
      LocalStorage.addCall(newCall);
      
      // Create automatic notifications
      const reminder = await NotificationService.createCallReminder(newCall.id);
      const escalation = await NotificationService.createCallEscalation(newCall.id);
      
      // Create Google Calendar event if connected
      let calendarEvent = null;
      try {
        if (GoogleCalendarService.isConnected()) {
          calendarEvent = await GoogleCalendarService.createCallEvent({
            employeeName: `${selectedEmployee.nome} ${selectedEmployee.cognome}`,
            employeeEmail: selectedEmployee.email,
            scheduledDate: new Date(callFormValidation.formState.dataSchedulata.value),
            employeeData: selectedEmployee
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
      
      setShowScheduleModal(false);
      setSelectedEmployee(null);
      callFormValidation.resetForm();
      
      // Show success message with notification info
      let notificationMessage = `Call con ${selectedEmployee.nome} ${selectedEmployee.cognome} programmata`;
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
          label: 'Vai a Call',
          onClick: () => {
            window.location.href = `/calls?highlight=${newCall.id}`;
          }
        }
      });
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast.error('Errore durante la programmazione della call');
    } finally {
      setSchedulingCall(false);
    }
  };

  const closeModal = () => {
    // Se ci sono dati non salvati, chiedi conferma
    const hasUnsavedData = callFormValidation.formState.dataSchedulata.value || 
                          callFormValidation.formState.note.value;
    
    if (hasUnsavedData && !schedulingCall) {
      if (!confirm('Ci sono modifiche non salvate. Vuoi chiudere senza salvare?')) {
        return;
      }
    }

    setShowScheduleModal(false);
    setSelectedEmployee(null);
    callFormValidation.resetForm();
  };

  // Filtra e ordina i dipendenti
  const filteredAndSortedEmployees = employees
    .filter(employee => {
      if (!searchFilter) return true;
      const searchTerm = searchFilter.toLowerCase();
      return (
        employee.nome.toLowerCase().includes(searchTerm) ||
        employee.cognome.toLowerCase().includes(searchTerm) ||
        employee.email.toLowerCase().includes(searchTerm) ||
        employee.posizione.toLowerCase().includes(searchTerm) ||
        employee.dipartimento.toLowerCase().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue: string;
      let bValue: string;
      
      switch (sortField) {
        case 'name':
          aValue = `${a.nome} ${a.cognome}`.toLowerCase();
          bValue = `${b.nome} ${b.cognome}`.toLowerCase();
          break;
        case 'department':
          aValue = a.dipartimento.toLowerCase();
          bValue = b.dipartimento.toLowerCase();
          break;
        case 'position':
          aValue = a.posizione.toLowerCase();
          bValue = b.posizione.toLowerCase();
          break;
        case 'hireDate':
          aValue = a.dataAssunzione;
          bValue = b.dataAssunzione;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Logica paginazione
  const totalItems = filteredAndSortedEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredAndSortedEmployees.slice(startIndex, endIndex);

  // Reset alla prima pagina quando si cambia filtro o ordinamento
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, sortField, sortDirection]);

  // Bulk selection functions
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelection = new Set(selectedEmployees);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployees(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredAndSortedEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredAndSortedEmployees.map(emp => emp.id)));
    }
  };

  const clearSelection = () => {
    setSelectedEmployees(new Set());
  };

  const bulkScheduleCall = () => {
    setShowBulkModal(true);
  };

  const bulkExport = () => {
    const selectedData = employees.filter(emp => selectedEmployees.has(emp.id));
    const csvContent = [
      'Nome,Cognome,Email,Posizione,Dipartimento,Data Assunzione,Telefono',
      ...selectedData.map(emp => 
        `${emp.nome},${emp.cognome},${emp.email},${emp.posizione},${emp.dipartimento},${emp.dataAssunzione},${emp.telefono}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dipendenti_selezionati_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Esportati ${selectedData.length} dipendenti in CSV`);
  };

  const handleBulkScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valida il form
    if (!bulkFormValidation.validateForm()) {
      toast.error('Correggi gli errori nel form prima di procedere');
      return;
    }

    const selectedData = employees.filter(emp => selectedEmployees.has(emp.id));
    
    // Conferma per azione bulk
    const confirmMessage = `Vuoi davvero schedulare una call per ${selectedData.length} dipendenti alla stessa ora?\n\nQuesto creerà ${selectedData.length} call simultanee.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setSchedulingCall(true);
    try {
      const scheduledTime = bulkFormValidation.formState.dataSchedulata.value;
      
      // Check conflitti per tutti i dipendenti selezionati
      let hasConflicts = false;
      for (const employee of selectedData) {
        const conflicts = await checkTimeConflict(employee.id, new Date(scheduledTime));
        if (conflicts.length > 0) {
          hasConflicts = true;
          break;
        }
      }

      if (hasConflicts) {
        const proceedMessage = '⚠️ Alcuni dipendenti hanno conflitti orari. Vuoi procedere comunque?';
        if (!confirm(proceedMessage)) {
          setSchedulingCall(false);
          return;
        }
      }

      const createdCalls: Call[] = [];
      let calendarEventsCreated = 0;
      let notificationsCreated = 0;

      // Crea le call per ogni dipendente selezionato
      for (const employee of selectedData) {
        const newCall: Call = {
          id: generateId(),
          employeeId: employee.id,
          dataSchedulata: scheduledTime,
          note: bulkFormValidation.formState.note.value,
          status: 'scheduled'
        };

        // Save call to storage
        LocalStorage.addCall(newCall);
        createdCalls.push(newCall);
        
        // Create automatic notifications
        try {
          const reminder = await NotificationService.createCallReminder(newCall.id);
          const escalation = await NotificationService.createCallEscalation(newCall.id);
          if (reminder || escalation) notificationsCreated++;
        } catch (error) {
          console.warn('Failed to create notifications for call:', newCall.id, error);
        }
        
        // Create Google Calendar event if connected
        try {
          if (GoogleCalendarService.isConnected()) {
            const calendarEvent = await GoogleCalendarService.createCallEvent({
              employeeName: `${employee.nome} ${employee.cognome}`,
              employeeEmail: employee.email,
              scheduledDate: new Date(scheduledTime),
              employeeData: employee
            });

            // Update call with calendar event ID
            if (calendarEvent) {
              newCall.googleCalendarEventId = calendarEvent.id;
              newCall.lastSyncedAt = new Date().toISOString();
              LocalStorage.updateCall(newCall.id, newCall);
              calendarEventsCreated++;
            }
          }
        } catch (calendarError) {
          console.warn('Calendar event creation failed for employee:', employee.id, calendarError);
        }
      }

      setShowBulkModal(false);
      bulkFormValidation.resetForm();
      clearSelection();
      
      // Show comprehensive success message
      let successMessage = `Call schedulate per ${selectedData.length} dipendenti!`;
      if (notificationsCreated > 0) {
        successMessage += ` • ${notificationsCreated} notifiche attivate`;
      }
      if (calendarEventsCreated > 0) {
        successMessage += ` • ${calendarEventsCreated} eventi calendario creati`;
      }
      
      toast.success('Call Multiple Programmate!', {
        description: successMessage,
        action: {
          label: 'Vai a Call',
          onClick: () => {
            window.location.href = '/calls';
          }
        }
      });
    } catch (error) {
      console.error('Error in bulk schedule:', error);
      toast.error('Errore durante la programmazione delle call multiple');
    } finally {
      setSchedulingCall(false);
    }
  };

  const closeBulkModal = () => {
    if (!schedulingCall) {
      // Se ci sono dati non salvati, chiedi conferma
      const hasUnsavedData = bulkFormValidation.formState.dataSchedulata.value || 
                            bulkFormValidation.formState.note.value;
      
      if (hasUnsavedData) {
        if (!confirm('Ci sono modifiche non salvate. Vuoi chiudere senza salvare?')) {
          return;
        }
      }

      setShowBulkModal(false);
      bulkFormValidation.resetForm();
    }
  };

  // Funzione per gestire l'ordinamento
  const handleSort = (field: 'name' | 'department' | 'hireDate' | 'position') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Funzione per ottenere l'icona di ordinamento
  const getSortIcon = (field: 'name' | 'department' | 'hireDate' | 'position') => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Funzione per ottenere la valutazione completa della priorità di un dipendente
  const getEmployeePriorityInfo = (employee: Employee) => {
    return PriorityConfigService.evaluateEmployeePriority(employee);
  };

  // Funzione di compatibilità per ottenere solo il livello di priorità
  const getEmployeePriority = (employee: Employee): 'high' | 'medium' | 'low' => {
    return getEmployeePriorityInfo(employee).priority;
  };

  // Focus management
  const { focusFirstInput } = useFocusManagement([showScheduleModal, showBulkModal]);

  // Keyboard shortcuts globali
  useKeyboardShortcuts([
    {
      key: 'f',
      ctrl: true,
      handler: () => {
        searchInputRef.current?.focus();
      },
      description: 'Focus ricerca'
    },
    {
      key: 'n',
      ctrl: true,
      handler: () => {
        if (filteredAndSortedEmployees.length > 0) {
          scheduleCall(filteredAndSortedEmployees[0]);
        }
      },
      description: 'Nuova call per primo dipendente'
    },
    {
      key: 's',
      ctrl: true,
      handler: () => {
        syncEmployees();
      },
      description: 'Sincronizza dipendenti'
    },
    {
      key: 'F1',
      handler: () => {
        setShowKeyboardHelp(true);
      },
      description: 'Mostra help shortcuts',
      preventDefault: false
    }
  ], [filteredAndSortedEmployees]);

  // Navigation per la tabella dipendenti
  const handleEmployeeSelection = (index: number) => {
    setSelectedEmployeeIndex(index);
    // Highlight visualmente la riga selezionata
    const rowElement = document.querySelector(`[data-employee-index="${index}"]`);
    if (rowElement) {
      rowElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleEmployeeActivation = (index: number) => {
    const employee = paginatedEmployees[index];
    if (employee) {
      scheduleCall(employee);
    }
  };

  // Keyboard navigation per modal
  useModalKeyboardNavigation(
    showScheduleModal,
    closeModal,
    () => {
      const form = document.querySelector('form[data-schedule-form]') as HTMLFormElement;
      if (form) {
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton && !submitButton.disabled) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  );

  useModalKeyboardNavigation(
    showBulkModal,
    closeBulkModal,
    () => {
      const form = document.querySelector('form[data-bulk-form]') as HTMLFormElement;
      if (form) {
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton && !submitButton.disabled) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  );

  useModalKeyboardNavigation(showPriorityConfig, () => setShowPriorityConfig(false));
  useModalKeyboardNavigation(showKeyboardHelp, () => setShowKeyboardHelp(false));

  // Arrow keys navigation per la lista dipendenti
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (paginatedEmployees.length === 0) return;

      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      );

      if (isInputFocused || showScheduleModal || showBulkModal || showPriorityConfig) return;

      let newIndex = selectedEmployeeIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          newIndex = selectedEmployeeIndex < paginatedEmployees.length - 1 
            ? selectedEmployeeIndex + 1 
            : 0;
          break;
        case 'ArrowUp':
          event.preventDefault();
          newIndex = selectedEmployeeIndex > 0 
            ? selectedEmployeeIndex - 1 
            : paginatedEmployees.length - 1;
          break;
        case 'Enter':
          if (selectedEmployeeIndex >= 0) {
            event.preventDefault();
            handleEmployeeActivation(selectedEmployeeIndex);
          }
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = paginatedEmployees.length - 1;
          break;
        case ' ':
          if (selectedEmployeeIndex >= 0) {
            event.preventDefault();
            const employee = paginatedEmployees[selectedEmployeeIndex];
            toggleEmployeeSelection(employee.id);
          }
          break;
        default:
          return;
      }

      if (newIndex !== selectedEmployeeIndex && newIndex >= 0) {
        setSelectedEmployeeIndex(newIndex);
        handleEmployeeSelection(newIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [paginatedEmployees, selectedEmployeeIndex, showScheduleModal, showBulkModal, showPriorityConfig]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Dipendenti</h1>
          <p className="text-gray-600">
            Visualizza e gestisci i dipendenti aziendali
          </p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">
              Ultima sincronizzazione: {formatDate(lastSync)} alle {lastSync.toLocaleTimeString('it-IT')}
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setShowKeyboardHelp(true)}
            size="sm"
            title="Scorciatoie da tastiera (F1)"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPriorityConfig(true)}
            size="sm"
          >
            <Settings className="mr-2 h-4 w-4" />
            Priorità
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowExportModal(true)}
            disabled={employees.length === 0}
            size="sm"
            className="scale-hover"
          >
            <Download className="mr-2 h-4 w-4" />
            Esporta Dipendenti
          </Button>
          <Button 
            variant="outline" 
            onClick={syncEmployees}
            disabled={syncing}
            className={employees.some(emp => getEmployeePriority(emp) === 'high') ? 'pulse-notification' : ''}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizzando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizza API Aziendale
                {employees.some(emp => getEmployeePriority(emp) === 'high') && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="smooth-hover">
        <CardHeader>
          <CardTitle>Configurazione API Aziendale</CardTitle>
          <CardDescription>
            Connessione all'applicazione aziendale per importare dipendenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Endpoint:</span>
              <p className="text-gray-600">Configurabile nelle Impostazioni</p>
            </div>
            <div>
              <span className="font-medium">Versione API:</span>
              <p className="text-gray-600">v1</p>
            </div>
            <div>
              <span className="font-medium">Stato:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connesso
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="smooth-hover">
        <CardHeader>
          <CardTitle>Dipendenti ({filteredAndSortedEmployees.length} di {employees.length})</CardTitle>
          <CardDescription>
            Elenco dei dipendenti attivi importati dall'API aziendale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
              <p className="mt-2 text-sm text-gray-600">
                Caricamento dipendenti in corso...
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Nessun dipendente trovato. 
                <br />
                Clicca su "Sincronizza API Aziendale" per importare i dipendenti.
              </p>
            </div>
          ) : (
            <>
              {/* Barra di ricerca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                  <Autocomplete
                    value={searchFilter}
                    onChange={setSearchFilter}
                    options={autocompleteService.getSuggestions('employee-search')}
                    placeholder="Cerca per nome, cognome, email, posizione... (Ctrl+F)"
                    className="pl-10"
                    allowCustom={true}
                    showFrequency={false}
                    onSelect={(option) => {
                      autocompleteService.addSuggestion('employee-search', option.value, 'employee-filtering');
                    }}
                  />
                </div>
              </div>

              {/* Barra azioni bulk */}
              {selectedEmployees.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedEmployees.size} dipendente{selectedEmployees.size !== 1 ? 'i' : ''} selezionato{selectedEmployees.size !== 1 ? 'i' : ''}
                      </span>
                      <Button size="sm" variant="outline" onClick={clearSelection}>
                        Deseleziona tutto
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={bulkScheduleCall}>
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Schedula Call Multiple
                      </Button>
                      <Button size="sm" variant="outline" onClick={bulkExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Esporta CSV
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controllo selezione tutti */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {selectedEmployees.size === filteredAndSortedEmployees.length && filteredAndSortedEmployees.length > 0 ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Seleziona tutti ({filteredAndSortedEmployees.length})
                </button>
              </div>

              {/* Controlli ordinamento */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-medium text-gray-700">Ordina per:</span>
                <Button
                  variant={sortField === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1"
                >
                  Nome {getSortIcon('name')}
                </Button>
                <Button
                  variant={sortField === 'department' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('department')}
                  className="flex items-center gap-1"
                >
                  Dipartimento {getSortIcon('department')}
                </Button>
                <Button
                  variant={sortField === 'position' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('position')}
                  className="flex items-center gap-1"
                >
                  Posizione {getSortIcon('position')}
                </Button>
                <Button
                  variant={sortField === 'hireDate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('hireDate')}
                  className="flex items-center gap-1"
                >
                  Data Assunzione {getSortIcon('hireDate')}
                </Button>
              </div>

              {filteredAndSortedEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Nessun dipendente corrisponde ai criteri di ricerca.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {paginatedEmployees.map((employee, index) => (
                <div 
                  key={employee.id}
                  data-employee-index={index}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 smooth-hover fade-in priority-${getEmployeePriority(employee)} ${
                    selectedEmployeeIndex === index ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  tabIndex={0}
                  onFocus={() => setSelectedEmployeeIndex(index)}
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleEmployeeSelection(employee.id)}
                      className="flex items-center justify-center w-5 h-5 hover:bg-gray-100 rounded scale-hover"
                    >
                      {selectedEmployees.has(employee.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {employee.nome} {employee.cognome}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1" />
                          {employee.posizione} - {employee.dipartimento}
                        </span>
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {employee.email}
                        </span>
                        <span>
                          Assunto: {formatDate(employee.dataAssunzione)}
                        </span>
                        {(() => {
                          const priorityInfo = getEmployeePriorityInfo(employee);
                          return (
                            <span 
                              className="ml-2 px-2 py-0.5 rounded text-xs font-medium transition-all duration-200"
                              style={{
                                backgroundColor: priorityInfo.color.bg,
                                color: priorityInfo.color.text,
                                borderColor: priorityInfo.color.border
                              }}
                              title={`Regole applicate: ${priorityInfo.matchedRules.map(r => r.name).join(', ') || 'Nessuna'}`}
                            >
                              {priorityInfo.icon} {priorityInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}>
                      {employee.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => scheduleCall(employee)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Schedula Call
                    </Button>
                  </div>
                </div>
                  ))}
                </div>
              )}

              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostra {startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems} dipendenti
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Precedente
                    </Button>
                    
                    <span className="text-sm text-gray-600">
                      Pagina {currentPage} di {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Successivo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modale per schedulare call */}
      {showScheduleModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 scale-hover" role="dialog" aria-labelledby="schedule-modal-title">
            <div className="flex justify-between items-center mb-4">
              <h3 id="schedule-modal-title" className="text-lg font-semibold">
                Schedula Call con {selectedEmployee.nome} {selectedEmployee.cognome}
              </h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="space-y-4" data-schedule-form>
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  {...callFormValidation.getFieldProps('dataSchedulata')}
                  required
                  className={callFormValidation.getFieldProps('dataSchedulata').hasError ? 'border-red-500' : ''}
                />
                {callFormValidation.getFieldProps('dataSchedulata').error && (
                  <p className="text-red-500 text-xs mt-1">
                    {callFormValidation.getFieldProps('dataSchedulata').error}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  {...callFormValidation.getFieldProps('note')}
                  placeholder="Argomenti da discutere, obiettivi della call..."
                  rows={3}
                  className={callFormValidation.getFieldProps('note').hasError ? 'border-red-500' : ''}
                />
                {callFormValidation.getFieldProps('note').error && (
                  <p className="text-red-500 text-xs mt-1">
                    {callFormValidation.getFieldProps('note').error}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {callFormValidation.formState.note.value.length}/500 caratteri
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={schedulingCall || !callFormValidation.isValid}
                >
                  {schedulingCall ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Schedulando...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedula Call
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal} disabled={schedulingCall}>
                  Annulla
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale per azioni bulk */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 scale-hover" role="dialog" aria-labelledby="bulk-modal-title">
            <div className="flex justify-between items-center mb-4">
              <h3 id="bulk-modal-title" className="text-lg font-semibold">
                Schedula Call per {selectedEmployees.size} dipendenti
              </h3>
              <Button variant="ghost" size="sm" onClick={closeBulkModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Dipendenti selezionati:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {employees
                  .filter(emp => selectedEmployees.has(emp.id))
                  .map(emp => (
                    <div key={emp.id} className="text-sm text-gray-700">
                      • {emp.nome} {emp.cognome}
                    </div>
                  ))
                }
              </div>
            </div>
            
            <form onSubmit={handleBulkScheduleSubmit} className="space-y-4" data-bulk-form>
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  {...bulkFormValidation.getFieldProps('dataSchedulata')}
                  required
                  className={bulkFormValidation.getFieldProps('dataSchedulata').hasError ? 'border-red-500' : ''}
                />
                {bulkFormValidation.getFieldProps('dataSchedulata').error && (
                  <p className="text-red-500 text-xs mt-1">
                    {bulkFormValidation.getFieldProps('dataSchedulata').error}
                  </p>
                )}
                <p className="text-amber-600 text-xs mt-1">
                  ⚠️ Tutte le call verranno schedulate alla stessa ora
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  {...bulkFormValidation.getFieldProps('note')}
                  placeholder="Argomenti comuni da discutere con tutti i dipendenti..."
                  rows={3}
                  className={bulkFormValidation.getFieldProps('note').hasError ? 'border-red-500' : ''}
                />
                {bulkFormValidation.getFieldProps('note').error && (
                  <p className="text-red-500 text-xs mt-1">
                    {bulkFormValidation.getFieldProps('note').error}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {bulkFormValidation.formState.note.value.length}/500 caratteri
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={schedulingCall || !bulkFormValidation.isValid}
                >
                  {schedulingCall ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Schedulando...
                    </>
                  ) : (
                    <>
                      <PhoneCall className="mr-2 h-4 w-4" />
                      Schedula {selectedEmployees.size} Call
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={closeBulkModal} disabled={schedulingCall}>
                  Annulla
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal configurazione priorità */}
      {showPriorityConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto scale-hover">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Configurazione Priorità Dipendenti</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPriorityConfig(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Regole attive */}
              <div>
                <h4 className="text-lg font-medium mb-4">Regole Attive</h4>
                <div className="space-y-3">
                  {PriorityConfigService.getConfig().rules
                    .sort((a, b) => a.order - b.order)
                    .map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{rule.icon}</span>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-sm text-gray-600">{rule.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rule.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rule.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.priority === 'high' ? 'Alta' : rule.priority === 'medium' ? 'Media' : 'Bassa'}
                        </span>
                        <Button
                          size="sm"
                          variant={rule.enabled ? "default" : "outline"}
                          onClick={() => {
                            PriorityConfigService.toggleRule(rule.id);
                            // Force re-render per aggiornare i colori
                            setEmployees([...employees]);
                          }}
                        >
                          {rule.enabled ? 'Attiva' : 'Disattiva'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistiche attuali */}
              <div>
                <h4 className="text-lg font-medium mb-4">Statistiche Attuali</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['high', 'medium', 'low'].map(priority => {
                    const count = employees.filter(emp => getEmployeePriority(emp) === priority).length;
                    const percentage = employees.length ? Math.round((count / employees.length) * 100) : 0;
                    return (
                      <div key={priority} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {count}
                        </div>
                        <div className="text-sm text-gray-600">
                          {priority === 'high' ? '🔥 Alta' : priority === 'medium' ? '⚡ Media' : '📋 Standard'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Azioni */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const confirmMessage = '⚠️ ATTENZIONE: Ripristinare le impostazioni predefinite?\n\nQuesto cancellerà tutte le configurazioni personalizzate delle priorità.\n\nQuesta azione NON può essere annullata.';
                    if (confirm(confirmMessage)) {
                      PriorityConfigService.resetToDefaults();
                      setEmployees([...employees]); // Force re-render
                      toast.success('Impostazioni ripristinate ai valori predefiniti');
                    }
                  }}
                >
                  Ripristina Default
                </Button>
                <Button onClick={() => setShowPriorityConfig(false)}>
                  Chiudi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal help shortcuts */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 scale-hover" role="dialog" aria-labelledby="help-modal-title">
            <div className="flex justify-between items-center mb-6">
              <h3 id="help-modal-title" className="text-xl font-semibold">⌨️ Scorciatoie da Tastiera</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Shortcuts globali */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🌐 Scorciatoie Globali</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Focus ricerca</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Sincronizza dipendenti</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Nuova call (primo dipendente)</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Mostra questo help</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">F1</kbd>
                  </div>
                </div>
              </div>

              {/* Navigation lista */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📋 Navigazione Lista</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Seleziona dipendente precedente/successivo</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">↑</kbd>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">↓</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Apri call per dipendente selezionato</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Seleziona/deseleziona dipendente</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Primo/ultimo dipendente</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Home</kbd>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">End</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal shortcuts */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📝 Modal e Form</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Chiudi modal</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Escape</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Submit rapido</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                    <span>Naviga tra campi</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Tab</kbd>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Shift+Tab</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chiudi */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowKeyboardHelp(false)}>
                  <span className="mr-2">Chiudi</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={{ employees: employees }}
        type="employees"
        title="Esporta Elenco Dipendenti"
      />
    </div>
  );
}