'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Copy, 
  Calendar, 
  Clock, 
  Users, 
  MoreHorizontal,
  ChevronDown,
  X,
  Check,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Call, Employee } from '@/types';
import { LocalStorage } from '@/lib/storage';
import { generateId, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { CallTrackingService } from '@/lib/call-tracking-service';
import { NotificationService } from '@/lib/notification-service';

interface QuickActionsProps {
  call: Call;
  employee: Employee;
  onActionComplete?: () => void;
}

interface DuplicateOptions {
  employees: string[];
  date: string;
  preserveNotes: boolean;
  offsetDays: number;
}

export function QuickActions({ call, employee, onActionComplete }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showQuickRescheduleModal, setShowQuickRescheduleModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [duplicateOptions, setDuplicateOptions] = useState<DuplicateOptions>({
    employees: [call.employeeId],
    date: '',
    preserveNotes: true,
    offsetDays: 7
  });
  
  const [rescheduleDate, setRescheduleDate] = useState(call.dataSchedulata);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  const employees = LocalStorage.getEmployees();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleDuplicateCall = async () => {
    try {
      const targetDate = duplicateOptions.date || 
        new Date(Date.now() + duplicateOptions.offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

      const createdCalls: Call[] = [];

      for (const employeeId of duplicateOptions.employees) {
        const targetEmployee = employees.find(emp => emp.id === employeeId);
        if (!targetEmployee) continue;

        const newCall: Call = {
          id: generateId(),
          employeeId,
          dataSchedulata: targetDate,
          note: duplicateOptions.preserveNotes ? call.note : `Duplicata della call del ${formatDateTime(call.dataSchedulata)}`,
          status: 'scheduled'
        };

        LocalStorage.addCall(newCall);
        createdCalls.push(newCall);

        // Track duplication
        CallTrackingService.trackModification(newCall.id, 'created', undefined, newCall);

        // Create notifications
        try {
          await NotificationService.createCallReminder(newCall.id);
          await NotificationService.createCallEscalation(newCall.id);
        } catch (error) {
          console.warn('Failed to create notifications for duplicated call:', error);
        }
      }

      toast.success(`${createdCalls.length} call duplicate create`, {
        description: `Programmate per ${formatDateTime(targetDate)}`
      });

      setShowDuplicateModal(false);
      setIsOpen(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error duplicating call:', error);
      toast.error('Errore durante la duplicazione della call');
    }
  };

  const handleQuickReschedule = async (daysOffset: number) => {
    try {
      const newDate = new Date(new Date(call.dataSchedulata).getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const newDateString = newDate.toISOString().slice(0, 16);

      const updatedCall = {
        dataSchedulata: newDateString,
        status: 'scheduled' as const,
        lastSyncedAt: new Date().toISOString()
      };

      LocalStorage.updateCall(call.id, updatedCall);
      CallTrackingService.trackModification(call.id, 'rescheduled', call, updatedCall);

      // Re-create notifications
      await NotificationService.createCallReminder(call.id);
      await NotificationService.createCallEscalation(call.id);

      toast.success('Call riprogrammata rapidamente', {
        description: `Nuova data: ${formatDateTime(newDateString)}`
      });

      setIsOpen(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error quick rescheduling:', error);
      toast.error('Errore durante la riprogrammazione rapida');
    }
  };

  const handleCustomReschedule = async () => {
    try {
      if (!rescheduleDate) {
        toast.error('Seleziona una data per la riprogrammazione');
        return;
      }

      const selectedDate = new Date(rescheduleDate);
      const now = new Date();

      if (selectedDate < now) {
        toast.error('Non puoi riprogrammare una call nel passato');
        return;
      }

      const updatedCall = {
        dataSchedulata: rescheduleDate,
        status: 'scheduled' as const,
        lastSyncedAt: new Date().toISOString()
      };

      LocalStorage.updateCall(call.id, updatedCall);
      CallTrackingService.trackModification(call.id, 'rescheduled', call, updatedCall);

      // Re-create notifications
      await NotificationService.createCallReminder(call.id);
      await NotificationService.createCallEscalation(call.id);

      toast.success('Call riprogrammata', {
        description: `Nuova data: ${formatDateTime(rescheduleDate)}`
      });

      setShowQuickRescheduleModal(false);
      setIsOpen(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error custom rescheduling:', error);
      toast.error('Errore durante la riprogrammazione');
    }
  };

  const handleCreateFollowUp = async () => {
    try {
      if (!followUpDate) {
        toast.error('Seleziona data per il follow-up');
        return;
      }

      const followUpCall: Call = {
        id: generateId(),
        employeeId: call.employeeId,
        dataSchedulata: followUpDate,
        note: followUpNote || `Follow-up della call del ${formatDateTime(call.dataSchedulata)}`,
        status: 'scheduled'
      };

      LocalStorage.addCall(followUpCall);
      CallTrackingService.trackModification(followUpCall.id, 'created', undefined, followUpCall);

      // Create notifications
      await NotificationService.createCallReminder(followUpCall.id);
      await NotificationService.createCallEscalation(followUpCall.id);

      // Update original call to reference follow-up
      const updatedCall = { nextCallDate: followUpDate };
      LocalStorage.updateCall(call.id, updatedCall);

      toast.success('Follow-up creato', {
        description: `Programmato per ${formatDateTime(followUpDate)}`
      });

      setShowFollowUpModal(false);
      setIsOpen(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error creating follow-up:', error);
      toast.error('Errore durante la creazione del follow-up');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-8 w-8 p-0"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-10 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-40 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Azioni Rapide</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {employee.nome} {employee.cognome}
            </p>
          </div>

          <div className="p-2 space-y-1">
            {/* Quick Reschedule */}
            {call.status === 'scheduled' && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-600 px-2 py-1">
                  Riprogramma velocemente
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickReschedule(1)}
                  className="w-full justify-start text-xs"
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  Domani
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickReschedule(7)}
                  className="w-full justify-start text-xs"
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  +1 settimana
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQuickRescheduleModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full justify-start text-xs"
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  Data personalizzata
                </Button>
              </div>
            )}

            {/* Duplicate */}
            <div className="border-t border-gray-100 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowDuplicateModal(true);
                  setIsOpen(false);
                }}
                className="w-full justify-start text-xs"
              >
                <Copy className="h-3 w-3 mr-2" />
                Duplica call
              </Button>
            </div>

            {/* Follow-up */}
            {call.status === 'completed' && !call.nextCallDate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowFollowUpModal(true);
                  setIsOpen(false);
                }}
                className="w-full justify-start text-xs"
              >
                <ArrowRight className="h-3 w-3 mr-2" />
                Crea follow-up
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <Card className="w-96 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Duplica Call</CardTitle>
              <CardDescription>
                Crea copie di questa call per altri dipendenti o date
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div>
                <Label htmlFor="duplicate-date">Data e ora</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    id="duplicate-date"
                    type="datetime-local"
                    value={duplicateOptions.date}
                    onChange={(e) => setDuplicateOptions({
                      ...duplicateOptions,
                      date: e.target.value
                    })}
                  />
                  <div className="text-xs text-gray-500">
                    Se vuoto, userà +{duplicateOptions.offsetDays} giorni dalla data originale
                  </div>
                  <div className="flex space-x-2">
                    {[1, 3, 7, 14].map(days => (
                      <Button
                        key={days}
                        size="sm"
                        variant="outline"
                        onClick={() => setDuplicateOptions({
                          ...duplicateOptions,
                          offsetDays: days,
                          date: ''
                        })}
                        className="text-xs"
                      >
                        +{days}g
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <Label>Dipendenti</Label>
                <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {employees.map(emp => (
                    <label
                      key={emp.id}
                      className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={duplicateOptions.employees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDuplicateOptions({
                              ...duplicateOptions,
                              employees: [...duplicateOptions.employees, emp.id]
                            });
                          } else {
                            setDuplicateOptions({
                              ...duplicateOptions,
                              employees: duplicateOptions.employees.filter(id => id !== emp.id)
                            });
                          }
                        }}
                      />
                      <span>{emp.nome} {emp.cognome}</span>
                      <span className="text-xs text-gray-500">({emp.dipartimento})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={duplicateOptions.preserveNotes}
                    onChange={(e) => setDuplicateOptions({
                      ...duplicateOptions,
                      preserveNotes: e.target.checked
                    })}
                  />
                  <span>Mantieni le note originali</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDuplicateModal(false)}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleDuplicateCall}
                  disabled={duplicateOptions.employees.length === 0}
                >
                  Duplica {duplicateOptions.employees.length > 1 ? 
                    `(${duplicateOptions.employees.length} call)` : ''}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Reschedule Modal */}
      {showQuickRescheduleModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickRescheduleModal(false);
          }}
        >
          <Card
            className="w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Riprogramma Call</CardTitle>
              <CardDescription>
                Seleziona nuova data e ora per {employee.nome} {employee.cognome}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reschedule-date">Nuova data e ora</Label>
                <Input
                  id="reschedule-date"
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQuickRescheduleModal(false)}
                >
                  Annulla
                </Button>
                <Button onClick={handleCustomReschedule}>
                  Riprogramma
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Crea Follow-up</CardTitle>
              <CardDescription>
                Programma una call di seguito con {employee.nome} {employee.cognome}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="followup-date">Data e ora</Label>
                <Input
                  id="followup-date"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="followup-note">Note (opzionale)</Label>
                <Input
                  id="followup-note"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Punti da discutere nel follow-up..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFollowUpModal(false)}
                >
                  Annulla
                </Button>
                <Button onClick={handleCreateFollowUp}>
                  Crea Follow-up
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}