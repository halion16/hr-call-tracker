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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Save, Trash2, Target, BookOpen, Users, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { DevelopmentPlan, CareerGoal, DevelopmentActivity, Employee } from '@/types';
import { employeeLifecycleCRUD } from '@/lib/employee-lifecycle-crud';
import { LocalStorage } from '@/lib/storage';

interface DevelopmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  developmentPlan?: DevelopmentPlan | null;
  employee?: Employee;
  mode: 'create' | 'edit' | 'view';
}

export function DevelopmentModal({
  isOpen,
  onClose,
  developmentPlan,
  employee,
  mode
}: DevelopmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: developmentPlan?.employeeId || employee?.id || '',
    status: developmentPlan?.status || 'active' as const,
    startDate: developmentPlan?.startDate || new Date().toISOString(),
    endDate: developmentPlan?.endDate || '',
    totalBudget: developmentPlan?.totalBudget || 0,
    usedBudget: developmentPlan?.usedBudget || 0,
    mentorId: developmentPlan?.mentorId || '',
    notes: developmentPlan?.notes || ''
  });

  const [careerGoals, setCareerGoals] = useState<CareerGoal[]>(developmentPlan?.careerGoals || []);
  const [activities, setActivities] = useState<DevelopmentActivity[]>(developmentPlan?.activities || []);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'activities'>('overview');

  // New forms
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [showNewActivityForm, setShowNewActivityForm] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'technical' as const,
    priority: 'medium' as const,
    targetDate: '',
    milestones: [] as string[],
    requiredSkills: [] as string[]
  });

  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    type: 'course' as const,
    provider: '',
    duration: 0,
    cost: 0,
    startDate: '',
    endDate: '',
    status: 'planned' as const
  });

  const [currentMilestone, setCurrentMilestone] = useState('');
  const [currentSkill, setCurrentSkill] = useState('');

  useEffect(() => {
    setEmployees(LocalStorage.getEmployees());
  }, []);

  useEffect(() => {
    if (developmentPlan) {
      setFormData({
        employeeId: developmentPlan.employeeId,
        status: developmentPlan.status,
        startDate: developmentPlan.startDate,
        endDate: developmentPlan.endDate || '',
        totalBudget: developmentPlan.totalBudget,
        usedBudget: developmentPlan.usedBudget,
        mentorId: developmentPlan.mentorId || '',
        notes: developmentPlan.notes || ''
      });
      setCareerGoals(developmentPlan.careerGoals || []);
      setActivities(developmentPlan.activities || []);
    }
  }, [developmentPlan]);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const planData = {
        ...formData,
        careerGoals,
        activities,
        skillAssessments: []
      };

      if (mode === 'create') {
        employeeLifecycleCRUD.createDevelopmentPlan(planData);
        toast.success('Piano di sviluppo creato con successo!');
      } else if (mode === 'edit' && developmentPlan) {
        employeeLifecycleCRUD.updateDevelopmentPlan(developmentPlan.id, planData);
        toast.success('Piano di sviluppo aggiornato!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving development plan:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!developmentPlan) return;
    
    setIsLoading(true);
    
    try {
      employeeLifecycleCRUD.deleteDevelopmentPlan(developmentPlan.id);
      toast.success('Piano di sviluppo eliminato!');
      onClose();
    } catch (error) {
      console.error('Error deleting development plan:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim() || !newGoal.description.trim()) {
      toast.error('Titolo e descrizione sono obbligatori');
      return;
    }

    const goal: CareerGoal = {
      id: `goal_${Date.now()}`,
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      priority: newGoal.priority,
      status: 'active',
      progress: 0,
      targetDate: newGoal.targetDate || undefined,
      milestones: newGoal.milestones,
      requiredSkills: newGoal.requiredSkills,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCareerGoals([...careerGoals, goal]);
    setNewGoal({
      title: '',
      description: '',
      category: 'technical',
      priority: 'medium',
      targetDate: '',
      milestones: [],
      requiredSkills: []
    });
    setShowNewGoalForm(false);
  };

  const handleAddActivity = () => {
    if (!newActivity.title.trim() || !newActivity.description.trim()) {
      toast.error('Titolo e descrizione sono obbligatori');
      return;
    }

    const activity: DevelopmentActivity = {
      id: `activity_${Date.now()}`,
      title: newActivity.title,
      description: newActivity.description,
      type: newActivity.type,
      provider: newActivity.provider,
      duration: newActivity.duration,
      cost: newActivity.cost,
      startDate: newActivity.startDate || undefined,
      endDate: newActivity.endDate || undefined,
      status: newActivity.status,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setActivities([...activities, activity]);
    setFormData({
      ...formData,
      usedBudget: formData.usedBudget + newActivity.cost
    });
    
    setNewActivity({
      title: '',
      description: '',
      type: 'course',
      provider: '',
      duration: 0,
      cost: 0,
      startDate: '',
      endDate: '',
      status: 'planned'
    });
    setShowNewActivityForm(false);
  };

  const handleUpdateGoal = (goalId: string, updates: Partial<CareerGoal>) => {
    setCareerGoals(careerGoals.map(goal => 
      goal.id === goalId 
        ? { ...goal, ...updates, updatedAt: new Date().toISOString() }
        : goal
    ));
  };

  const handleUpdateActivity = (activityId: string, updates: Partial<DevelopmentActivity>) => {
    setActivities(activities.map(activity => 
      activity.id === activityId 
        ? { ...activity, ...updates, updatedAt: new Date().toISOString() }
        : activity
    ));
  };

  const addMilestone = () => {
    if (currentMilestone.trim()) {
      setNewGoal({
        ...newGoal,
        milestones: [...newGoal.milestones, currentMilestone.trim()]
      });
      setCurrentMilestone('');
    }
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setNewGoal({
        ...newGoal,
        requiredSkills: [...newGoal.requiredSkills, currentSkill.trim()]
      });
      setCurrentSkill('');
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
  const budgetProgress = formData.totalBudget > 0 ? (formData.usedBudget / formData.totalBudget) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nuovo Piano di Sviluppo'}
            {mode === 'edit' && 'Modifica Piano di Sviluppo'}
            {mode === 'view' && 'Dettagli Piano di Sviluppo'}
            {selectedEmployee && (
              <span className="text-muted-foreground text-base font-normal">
                - {selectedEmployee.nome} {selectedEmployee.cognome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {['overview', 'goals', 'activities'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                'px-4 py-2 font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'overview' && 'Panoramica'}
              {tab === 'goals' && `Obiettivi (${careerGoals.length})`}
              {tab === 'activities' && `Attività (${activities.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
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
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="completed">Completato</SelectItem>
                      <SelectItem value="on_hold">In Pausa</SelectItem>
                      <SelectItem value="cancelled">Annullato</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalBudget">Budget Totale (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.totalBudget}
                      onChange={(e) => setFormData({...formData, totalBudget: Number(e.target.value)})}
                      disabled={mode === 'view'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="usedBudget">Budget Utilizzato (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.usedBudget}
                      onChange={(e) => setFormData({...formData, usedBudget: Number(e.target.value)})}
                      disabled={mode === 'view'}
                    />
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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Statistiche</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Budget Utilizzato</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>€{formData.usedBudget} / €{formData.totalBudget}</span>
                          <span>{budgetProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={budgetProgress} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Obiettivi di Carriera
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{careerGoals.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {careerGoals.filter(g => g.status === 'active').length} attivi
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Attività di Sviluppo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activities.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {activities.filter(a => a.status === 'in_progress').length} in corso
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Progresso Medio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {careerGoals.length > 0 
                          ? Math.round(careerGoals.reduce((sum, g) => sum + g.progress, 0) / careerGoals.length)
                          : 0
                        }%
                      </div>
                      <p className="text-xs text-muted-foreground">Obiettivi</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Obiettivi di Carriera</h3>
                {mode !== 'view' && (
                  <Button
                    onClick={() => setShowNewGoalForm(true)}
                    disabled={showNewGoalForm}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Nuovo Obiettivo
                  </Button>
                )}
              </div>

              {showNewGoalForm && (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Titolo Obiettivo</Label>
                      <Input
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        placeholder="es. Diventare Team Leader..."
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={newGoal.category} onValueChange={(value: any) => setNewGoal({...newGoal, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Tecnico</SelectItem>
                          <SelectItem value="leadership">Leadership</SelectItem>
                          <SelectItem value="soft_skills">Soft Skills</SelectItem>
                          <SelectItem value="certification">Certificazione</SelectItem>
                          <SelectItem value="promotion">Promozione</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Descrizione</Label>
                      <Textarea
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                        placeholder="Descrizione dettagliata dell'obiettivo..."
                      />
                    </div>
                    <div>
                      <Label>Priorità</Label>
                      <Select value={newGoal.priority} onValueChange={(value: any) => setNewGoal({...newGoal, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Bassa</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="critical">Critica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data Target</Label>
                      <Input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Milestones</Label>
                      <div className="flex space-x-2 mb-2">
                        <Input
                          value={currentMilestone}
                          onChange={(e) => setCurrentMilestone(e.target.value)}
                          placeholder="Aggiungi milestone..."
                          onKeyPress={(e) => e.key === 'Enter' && addMilestone()}
                        />
                        <Button type="button" size="sm" onClick={addMilestone}>
                          Aggiungi
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newGoal.milestones.map((milestone, index) => (
                          <Badge key={index} variant="secondary">
                            {milestone}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>Skills Richieste</Label>
                      <div className="flex space-x-2 mb-2">
                        <Input
                          value={currentSkill}
                          onChange={(e) => setCurrentSkill(e.target.value)}
                          placeholder="Aggiungi skill richiesta..."
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        />
                        <Button type="button" size="sm" onClick={addSkill}>
                          Aggiungi
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newGoal.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setShowNewGoalForm(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddGoal}>
                      Aggiungi Obiettivo
                    </Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {careerGoals.map(goal => (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{goal.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              goal.priority === 'critical' ? 'destructive' :
                              goal.priority === 'high' ? 'default' :
                              'secondary'
                            }
                          >
                            {goal.priority}
                          </Badge>
                          <Badge variant="outline">{goal.category}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} />
                        </div>
                        
                        {goal.milestones.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Milestones:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {goal.milestones.map((milestone, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {milestone}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {goal.requiredSkills.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Skills Richieste:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {goal.requiredSkills.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {goal.targetDate && (
                          <p className="text-sm text-muted-foreground">
                            Target: {format(new Date(goal.targetDate), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      
                      {mode !== 'view' && (
                        <div className="mt-4 flex space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={goal.progress}
                            onChange={(e) => handleUpdateGoal(goal.id, { progress: Number(e.target.value) })}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground self-center">% completato</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Attività di Sviluppo</h3>
                {mode !== 'view' && (
                  <Button
                    onClick={() => setShowNewActivityForm(true)}
                    disabled={showNewActivityForm}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Nuova Attività
                  </Button>
                )}
              </div>

              {showNewActivityForm && (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Titolo Attività</Label>
                      <Input
                        value={newActivity.title}
                        onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                        placeholder="es. Corso di Leadership..."
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={newActivity.type} onValueChange={(value: any) => setNewActivity({...newActivity, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course">Corso</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="mentoring">Mentoring</SelectItem>
                          <SelectItem value="conference">Conferenza</SelectItem>
                          <SelectItem value="certification">Certificazione</SelectItem>
                          <SelectItem value="reading">Lettura</SelectItem>
                          <SelectItem value="project">Progetto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Descrizione</Label>
                      <Textarea
                        value={newActivity.description}
                        onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                        placeholder="Descrizione dell'attività..."
                      />
                    </div>
                    <div>
                      <Label>Provider</Label>
                      <Input
                        value={newActivity.provider}
                        onChange={(e) => setNewActivity({...newActivity, provider: e.target.value})}
                        placeholder="es. Coursera, interno..."
                      />
                    </div>
                    <div>
                      <Label>Durata (ore)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newActivity.duration}
                        onChange={(e) => setNewActivity({...newActivity, duration: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Costo (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newActivity.cost}
                        onChange={(e) => setNewActivity({...newActivity, cost: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Stato</Label>
                      <Select value={newActivity.status} onValueChange={(value: any) => setNewActivity({...newActivity, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Pianificato</SelectItem>
                          <SelectItem value="in_progress">In Corso</SelectItem>
                          <SelectItem value="completed">Completato</SelectItem>
                          <SelectItem value="cancelled">Annullato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setShowNewActivityForm(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddActivity}>
                      Aggiungi Attività
                    </Button>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map(activity => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{activity.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {activity.provider} • {activity.duration}h
                          </p>
                        </div>
                        <Badge 
                          variant={
                            activity.status === 'completed' ? 'default' :
                            activity.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {activity.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{activity.progress}%</span>
                        </div>
                        <Progress value={activity.progress} />
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 text-sm">
                        <span className="font-medium">€{activity.cost}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                      
                      {mode !== 'view' && (
                        <div className="mt-4 flex space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={activity.progress}
                            onChange={(e) => handleUpdateActivity(activity.id, { progress: Number(e.target.value) })}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground self-center">% completato</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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
                Elimina Piano
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