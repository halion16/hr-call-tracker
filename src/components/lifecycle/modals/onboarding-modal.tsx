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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { OnboardingWorkflow, OnboardingTask, Employee } from '@/types';
import { employeeLifecycleCRUD } from '@/lib/employee-lifecycle-crud';
import { LocalStorage } from '@/lib/storage';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow?: OnboardingWorkflow | null;
  employee?: Employee;
  mode: 'create' | 'edit' | 'view';
}

export function OnboardingModal({
  isOpen,
  onClose,
  workflow,
  employee,
  mode
}: OnboardingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: workflow?.employeeId || employee?.id || '',
    status: workflow?.status || 'not_started' as const,
    startDate: workflow?.startDate || new Date().toISOString(),
    expectedEndDate: workflow?.expectedEndDate || '',
    actualEndDate: workflow?.actualEndDate || '',
    mentorId: workflow?.mentorId || '',
    progress: workflow?.progress || 0,
    notes: workflow?.notes || '',
    customFields: workflow?.customFields || {}
  });

  const [tasks, setTasks] = useState<OnboardingTask[]>(workflow?.tasks || []);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'documentation' as const,
    priority: 'medium' as const,
    dueDate: '',
    assignedTo: ''
  });
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  useEffect(() => {
    setEmployees(LocalStorage.getEmployees());
  }, []);

  useEffect(() => {
    if (workflow) {
      setFormData({
        employeeId: workflow.employeeId,
        status: workflow.status,
        startDate: workflow.startDate,
        expectedEndDate: workflow.expectedEndDate || '',
        actualEndDate: workflow.actualEndDate || '',
        mentorId: workflow.mentorId || '',
        progress: workflow.progress,
        notes: workflow.notes || '',
        customFields: workflow.customFields || {}
      });
      setTasks(workflow.tasks || []);
    }
  }, [workflow]);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const workflowData = {
        ...formData,
        tasks: tasks,
        progress: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
      };

      if (mode === 'create') {
        const newWorkflow = employeeLifecycleCRUD.createOnboardingWorkflow(workflowData);
        toast.success('Workflow di onboarding creato con successo!');
      } else if (mode === 'edit' && workflow) {
        employeeLifecycleCRUD.updateOnboardingWorkflow(workflow.id, workflowData);
        toast.success('Workflow di onboarding aggiornato!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving onboarding workflow:', error);
      toast.error('Errore durante il salvataggio del workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!workflow) return;
    
    setIsLoading(true);
    
    try {
      employeeLifecycleCRUD.deleteOnboardingWorkflow(workflow.id);
      toast.success('Workflow di onboarding eliminato!');
      onClose();
    } catch (error) {
      console.error('Error deleting onboarding workflow:', error);
      toast.error('Errore durante l\'eliminazione del workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Il titolo del task è obbligatorio');
      return;
    }

    const task: OnboardingTask = {
      id: `task_${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      category: newTask.category,
      priority: newTask.priority,
      status: 'pending',
      dueDate: newTask.dueDate || undefined,
      assignedTo: newTask.assignedTo || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTasks([...tasks, task]);
    setNewTask({
      title: '',
      description: '',
      category: 'documentation',
      priority: 'medium',
      dueDate: '',
      assignedTo: ''
    });
    setShowNewTaskForm(false);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<OnboardingTask>) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nuovo Workflow di Onboarding'}
            {mode === 'edit' && 'Modifica Workflow di Onboarding'}
            {mode === 'view' && 'Dettagli Workflow di Onboarding'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informazioni Base */}
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
                  <SelectItem value="not_started">Non Iniziato</SelectItem>
                  <SelectItem value="in_progress">In Corso</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                  <SelectItem value="on_hold">In Pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mentorId">Mentor</Label>
              <Select 
                value={formData.mentorId} 
                onValueChange={(value) => setFormData({...formData, mentorId: value})}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona mentor (opzionale)" />
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
              <Label htmlFor="progress">Progresso (%)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({...formData, progress: Number(e.target.value)})}
                  disabled={mode === 'view'}
                />
                <Badge variant="outline">{formData.progress}%</Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Note</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Note aggiuntive..."
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Tasks ({tasks.length})</h3>
              {mode !== 'view' && (
                <Button
                  size="sm"
                  onClick={() => setShowNewTaskForm(true)}
                  disabled={showNewTaskForm}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi Task
                </Button>
              )}
            </div>

            {/* Nuovo Task Form */}
            {showNewTaskForm && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div>
                  <Label>Titolo Task</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Titolo del task..."
                  />
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Descrizione del task..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={newTask.category} onValueChange={(value: any) => setNewTask({...newTask, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documentation">Documentazione</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="setup">Setup</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="admin">Amministrativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priorità</Label>
                    <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({...newTask, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Bassa</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setShowNewTaskForm(false)}>
                    Annulla
                  </Button>
                  <Button size="sm" onClick={handleAddTask}>
                    Aggiungi
                  </Button>
                </div>
              </div>
            )}

            {/* Lista Tasks */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.map(task => (
                <div key={task.id} className="p-3 border rounded-lg bg-background">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {mode !== 'view' && (
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={(checked) => 
                              handleUpdateTask(task.id, { 
                                status: checked ? 'completed' : 'pending' 
                              })
                            }
                          />
                        )}
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge 
                          variant={
                            task.priority === 'urgent' ? 'destructive' :
                            task.priority === 'high' ? 'default' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>Categoria: {task.category}</span>
                        {task.dueDate && (
                          <span>Scadenza: {format(new Date(task.dueDate), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </div>
                    {mode !== 'view' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <div>
            {mode === 'edit' && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Workflow
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