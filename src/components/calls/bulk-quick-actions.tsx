'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Copy, 
  Calendar, 
  Clock, 
  Users, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { Call, Employee } from '@/types';
import { LocalStorage } from '@/lib/storage';
import { generateId, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { CallTrackingService } from '@/lib/call-tracking-service';
import { NotificationService } from '@/lib/notification-service';

interface BulkQuickActionsProps {
  selectedCalls: Call[];
  onActionComplete?: () => void;
}

interface BulkDuplicateOptions {
  offsetDays: number;
  preserveNotes: boolean;
  targetDate?: string;
}

export function BulkQuickActions({ selectedCalls, onActionComplete }: BulkQuickActionsProps) {
  const [showBulkDuplicateModal, setShowBulkDuplicateModal] = useState(false);
  const [showBulkRescheduleModal, setShowBulkRescheduleModal] = useState(false);
  
  const [bulkDuplicateOptions, setBulkDuplicateOptions] = useState<BulkDuplicateOptions>({
    offsetDays: 7,
    preserveNotes: true
  });
  
  const [bulkRescheduleOffset, setBulkRescheduleOffset] = useState(1);
  const [bulkRescheduleDate, setBulkRescheduleDate] = useState('');

  const employees = LocalStorage.getEmployees();

  const handleBulkDuplicate = async () => {
    try {
      const createdCalls: Call[] = [];

      for (const call of selectedCalls) {
        const targetDate = bulkDuplicateOptions.targetDate || 
          new Date(new Date(call.dataSchedulata).getTime() + bulkDuplicateOptions.offsetDays * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 16);

        const newCall: Call = {
          id: generateId(),
          employeeId: call.employeeId,
          dataSchedulata: targetDate,
          note: bulkDuplicateOptions.preserveNotes ? 
            call.note : 
            `Duplicata della call del ${formatDateTime(call.dataSchedulata)}`,
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
        description: `Tutte programmate con offset di ${bulkDuplicateOptions.offsetDays} giorni`
      });

      setShowBulkDuplicateModal(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error bulk duplicating calls:', error);
      toast.error('Errore durante la duplicazione multipla');
    }
  };

  const handleBulkReschedule = async () => {
    try {
      const updatedCount = selectedCalls.filter(call => 
        call.status === 'scheduled' || call.status === 'suspended'
      ).length;

      if (updatedCount === 0) {
        toast.error('Nessuna call da riprogrammare nelle selezioni');
        return;
      }

      for (const call of selectedCalls) {
        if (call.status !== 'scheduled' && call.status !== 'suspended') continue;

        const newDate = bulkRescheduleDate || 
          new Date(new Date(call.dataSchedulata).getTime() + bulkRescheduleOffset * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 16);

        const updatedCall = {
          dataSchedulata: newDate,
          status: 'scheduled' as const,
          lastSyncedAt: new Date().toISOString()
        };

        LocalStorage.updateCall(call.id, updatedCall);
        CallTrackingService.trackModification(call.id, 'rescheduled', call, updatedCall);

        // Re-create notifications
        await NotificationService.createCallReminder(call.id);
        await NotificationService.createCallEscalation(call.id);
      }

      toast.success(`${updatedCount} call riprogrammate`, {
        description: bulkRescheduleDate ? 
          `Nuova data: ${formatDateTime(bulkRescheduleDate)}` :
          `Spostate di ${bulkRescheduleOffset} giorni`
      });

      setShowBulkRescheduleModal(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error bulk rescheduling calls:', error);
      toast.error('Errore durante la riprogrammazione multipla');
    }
  };

  const handleBulkQuickReschedule = async (daysOffset: number) => {
    try {
      const updatedCount = selectedCalls.filter(call => 
        call.status === 'scheduled' || call.status === 'suspended'
      ).length;

      if (updatedCount === 0) {
        toast.error('Nessuna call da riprogrammare nelle selezioni');
        return;
      }

      for (const call of selectedCalls) {
        if (call.status !== 'scheduled' && call.status !== 'suspended') continue;

        const newDate = new Date(new Date(call.dataSchedulata).getTime() + daysOffset * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 16);

        const updatedCall = {
          dataSchedulata: newDate,
          status: 'scheduled' as const,
          lastSyncedAt: new Date().toISOString()
        };

        LocalStorage.updateCall(call.id, updatedCall);
        CallTrackingService.trackModification(call.id, 'rescheduled', call, updatedCall);

        // Re-create notifications
        await NotificationService.createCallReminder(call.id);
        await NotificationService.createCallEscalation(call.id);
      }

      toast.success(`${updatedCount} call riprogrammate`, {
        description: `Spostate di ${daysOffset} giorni`
      });

      onActionComplete?.();
    } catch (error) {
      console.error('Error bulk quick rescheduling calls:', error);
      toast.error('Errore durante la riprogrammazione rapida');
    }
  };

  if (selectedCalls.length === 0) return null;

  return (
    <div className="flex items-center space-x-2">
      {/* Quick Reschedule Buttons */}
      {selectedCalls.some(call => call.status === 'scheduled' || call.status === 'suspended') && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkQuickReschedule(1)}
            className="text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            +1 giorno
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkQuickReschedule(7)}
            className="text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            +1 settimana
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkRescheduleModal(true)}
            className="text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Data personalizzata
          </Button>
        </>
      )}

      {/* Bulk Duplicate */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowBulkDuplicateModal(true)}
        className="text-xs"
      >
        <Copy className="h-3 w-3 mr-1" />
        Duplica tutte
      </Button>

      {/* Bulk Duplicate Modal */}
      {showBulkDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Duplica {selectedCalls.length} Call</CardTitle>
              <CardDescription>
                Crea copie di tutte le call selezionate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Options */}
              <div>
                <Label>Opzioni data</Label>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="bulk-duplicate-date" className="text-sm">Data specifica</Label>
                    <Input
                      id="bulk-duplicate-date"
                      type="datetime-local"
                      value={bulkDuplicateOptions.targetDate || ''}
                      onChange={(e) => setBulkDuplicateOptions({
                        ...bulkDuplicateOptions,
                        targetDate: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Oppure sposta di giorni</Label>
                    <div className="flex space-x-2 mt-1">
                      {[1, 3, 7, 14, 30].map(days => (
                        <Button
                          key={days}
                          size="sm"
                          variant={bulkDuplicateOptions.offsetDays === days ? "default" : "outline"}
                          onClick={() => setBulkDuplicateOptions({
                            ...bulkDuplicateOptions,
                            offsetDays: days,
                            targetDate: ''
                          })}
                          className="text-xs"
                        >
                          +{days}g
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulkDuplicateOptions.preserveNotes}
                    onChange={(e) => setBulkDuplicateOptions({
                      ...bulkDuplicateOptions,
                      preserveNotes: e.target.checked
                    })}
                  />
                  <span>Mantieni le note originali</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDuplicateModal(false)}
                >
                  Annulla
                </Button>
                <Button onClick={handleBulkDuplicate}>
                  Duplica {selectedCalls.length} call
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Reschedule Modal */}
      {showBulkRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Riprogramma Call</CardTitle>
              <CardDescription>
                Riprogramma {selectedCalls.filter(call => 
                  call.status === 'scheduled' || call.status === 'suspended'
                ).length} call selezionate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Options */}
              <div>
                <Label>Opzioni riprogrammazione</Label>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="bulk-reschedule-date" className="text-sm">Data specifica</Label>
                    <Input
                      id="bulk-reschedule-date"
                      type="datetime-local"
                      value={bulkRescheduleDate}
                      onChange={(e) => setBulkRescheduleDate(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Tutte le call verranno spostate a questa data
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Oppure sposta di giorni</Label>
                    <div className="flex space-x-2 mt-1">
                      {[1, 2, 3, 7, 14].map(days => (
                        <Button
                          key={days}
                          size="sm"
                          variant={bulkRescheduleOffset === days ? "default" : "outline"}
                          onClick={() => {
                            setBulkRescheduleOffset(days);
                            setBulkRescheduleDate('');
                          }}
                          className="text-xs"
                        >
                          +{days}g
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkRescheduleModal(false)}
                >
                  Annulla
                </Button>
                <Button onClick={handleBulkReschedule}>
                  Riprogramma
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}