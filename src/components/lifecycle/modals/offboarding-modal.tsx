'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Save, Trash2, FileText, Users, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { OffboardingProcess, OffboardingChecklist, Employee, KnowledgeTransferItem } from '@/types';
import { employeeLifecycleCRUD } from '@/lib/employee-lifecycle-crud';
import { LocalStorage } from '@/lib/storage';

interface OffboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  offboardingProcess?: OffboardingProcess | null;
  employee?: Employee;
  mode: 'create' | 'edit' | 'view';
}

export function OffboardingModal({
  isOpen,
  onClose,
  offboardingProcess,
  employee,
  mode
}: OffboardingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: offboardingProcess?.employeeId || employee?.id || '',
    reason: offboardingProcess?.reason || 'resignation' as const,
    lastWorkingDay: offboardingProcess?.lastWorkingDay || '',
    initiatedBy: offboardingProcess?.initiatedBy || '',
    handoverTo: offboardingProcess?.handoverTo || '',
    status: offboardingProcess?.status || 'initiated' as const,
    exitInterviewDate: offboardingProcess?.exitInterviewDate || '',
    exitInterviewNotes: offboardingProcess?.exitInterviewNotes || '',
    finalNotes: offboardingProcess?.finalNotes || ''
  });

  const [checklist, setChecklist] = useState<OffboardingChecklist[]>(offboardingProcess?.checklist || []);
  const [knowledgeTransfer, setKnowledgeTransfer] = useState<KnowledgeTransferItem[]>(offboardingProcess?.knowledgeTransfer || []);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'knowledge' | 'interview'>('overview');

  // New forms
  const [showNewChecklistForm, setShowNewChecklistForm] = useState(false);
  const [showNewKnowledgeForm, setShowNewKnowledgeForm] = useState(false);

  const [newChecklistItem, setNewChecklistItem] = useState({
    title: '',
    description: '',
    category: 'administrative' as const,
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as const
  });

  const [newKnowledgeItem, setNewKnowledgeItem] = useState({
    title: '',
    description: '',
    type: 'document' as const,
    location: '',
    transferredTo: '',
    status: 'pending' as const
  });

  useEffect(() => {
    setEmployees(LocalStorage.getEmployees());
  }, []);

  useEffect(() => {
    if (offboardingProcess) {
      setFormData({
        employeeId: offboardingProcess.employeeId,
        reason: offboardingProcess.reason,
        lastWorkingDay: offboardingProcess.lastWorkingDay,
        initiatedBy: offboardingProcess.initiatedBy,
        handoverTo: offboardingProcess.handoverTo || '',
        status: offboardingProcess.status,
        exitInterviewDate: offboardingProcess.exitInterviewDate || '',
        exitInterviewNotes: offboardingProcess.exitInterviewNotes || '',
        finalNotes: offboardingProcess.finalNotes || ''
      });
      setChecklist(offboardingProcess.checklist || []);
      setKnowledgeTransfer(offboardingProcess.knowledgeTransfer || []);
    }
  }, [offboardingProcess]);

  useEffect(() => {
    // Generate default checklist for new processes
    if (mode === 'create' && checklist.length === 0) {
      const defaultChecklist: OffboardingChecklist[] = [
        {
          id: `check_${Date.now()}_1`,
          title: 'Restituzione equipment aziendale',
          description: 'Laptop, telefono, badge, chiavi, etc.',
          category: 'administrative',
          status: 'pending',
          priority: 'high',
          dueDate: formData.lastWorkingDay,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `check_${Date.now()}_2`,
          title: 'Disattivazione accessi IT',
          description: 'Email, sistemi interni, VPN, etc.',
          category: 'it_access',
          status: 'pending',
          priority: 'high',
          dueDate: formData.lastWorkingDay,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `check_${Date.now()}_3`,
          title: 'Trasferimento progetti',
          description: 'Handover progetti in corso',
          category: 'handover',
          status: 'pending',
          priority: 'high',
          dueDate: formData.lastWorkingDay,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `check_${Date.now()}_4`,
          title: 'Exit interview',
          description: 'Colloquio finale con HR',
          category: 'hr',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `check_${Date.now()}_5`,
          title: 'Calcolo TFR e cedolino finale',
          description: 'Elaborazione finale busta paga',
          category: 'payroll',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setChecklist(defaultChecklist);
    }
  }, [mode, formData.lastWorkingDay]);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const processData = {
        ...formData,
        checklist,
        knowledgeTransfer,
        progress: checklist.length > 0 ? Math.round((checklist.filter(c => c.status === 'completed').length / checklist.length) * 100) : 0
      };

      if (mode === 'create') {
        employeeLifecycleCRUD.createOffboardingProcess(processData);
        toast.success('Processo di offboarding creato con successo!');
      } else if (mode === 'edit' && offboardingProcess) {
        employeeLifecycleCRUD.updateOffboardingProcess(offboardingProcess.id, processData);
        toast.success('Processo di offboarding aggiornato!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving offboarding process:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!offboardingProcess) return;
    
    setIsLoading(true);
    
    try {
      employeeLifecycleCRUD.deleteOffboardingProcess(offboardingProcess.id);
      toast.success('Processo di offboarding eliminato!');
      onClose();
    } catch (error) {
      console.error('Error deleting offboarding process:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nuovo Processo di Offboarding'}
            {mode === 'edit' && 'Modifica Processo di Offboarding'}
            {mode === 'view' && 'Dettagli Processo di Offboarding'}
            {selectedEmployee && (
              <span className="text-muted-foreground text-base font-normal">
                - {selectedEmployee.nome} {selectedEmployee.cognome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informazioni Base</h3>
            
            <div>
              <Label htmlFor="employeeId">Dipendente</Label>
              <Select 
                value={formData.employeeId} 
                onValueChange={(value) => setFormData({...formData, employeeId: value})}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dipendente" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome} {emp.cognome} - {emp.posizione}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Select 
                  value={formData.reason} 
                  onValueChange={(value: any) => setFormData({...formData, reason: value})}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">Dimissioni</SelectItem>
                    <SelectItem value="termination">Licenziamento</SelectItem>
                    <SelectItem value="retirement">Pensionamento</SelectItem>
                    <SelectItem value="end_of_contract">Fine contratto</SelectItem>
                    <SelectItem value="redundancy">Ridondanza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Stato</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData({...formData, status: value})}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initiated">Iniziato</SelectItem>
                    <SelectItem value="in_progress">In Corso</SelectItem>
                    <SelectItem value="completed">Completato</SelectItem>
                    <SelectItem value="cancelled">Annullato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="lastWorkingDay">Ultimo Giorno di Lavoro</Label>
              <Input
                type="date"
                value={formData.lastWorkingDay}
                onChange={(e) => setFormData({...formData, lastWorkingDay: e.target.value})}
                disabled={mode === 'view'}
              />
            </div>

            <div>
              <Label htmlFor="initiatedBy">Iniziato da</Label>
              <Select 
                value={formData.initiatedBy} 
                onValueChange={(value) => setFormData({...formData, initiatedBy: value})}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona chi ha iniziato il processo" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome} {emp.cognome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="finalNotes">Note Finali</Label>
              <Textarea
                value={formData.finalNotes}
                onChange={(e) => setFormData({...formData, finalNotes: e.target.value})}
                placeholder="Note generali del processo..."
                disabled={mode === 'view'}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Statistiche Rapide</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Progresso Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{checklist.filter(c => c.status === 'completed').length} / {checklist.length} completati</span>
                      <span>{checklist.length > 0 ? Math.round((checklist.filter(c => c.status === 'completed').length / checklist.length) * 100) : 0}%</span>
                    </div>
                    <Progress value={checklist.length > 0 ? (checklist.filter(c => c.status === 'completed').length / checklist.length) * 100 : 0} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Giorni Rimanenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formData.lastWorkingDay 
                      ? Math.max(0, Math.ceil((new Date(formData.lastWorkingDay).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      : '-'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">All'ultimo giorno</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Items Priorità Alta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {checklist.filter(item => item.priority === 'high' && item.status !== 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Da completare</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {mode === 'edit' && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Processo
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Chiudi' : 'Annulla'}
            </Button>
            {mode !== 'view' && (
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}