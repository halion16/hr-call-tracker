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
import { CalendarIcon, Plus, Save, Trash2, Star, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { PerformanceData, PerformanceReview, Employee, SkillAssessment, PerformanceGoal } from '@/types';
import { employeeLifecycleCRUD } from '@/lib/employee-lifecycle-crud';
import { LocalStorage } from '@/lib/storage';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  performanceData?: PerformanceData | null;
  employee?: Employee;
  mode: 'create' | 'edit' | 'view';
}

export function PerformanceModal({
  isOpen,
  onClose,
  performanceData,
  employee,
  mode
}: PerformanceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: performanceData?.employeeId || employee?.id || '',
    currentScore: performanceData?.currentScore || 0,
    previousScore: performanceData?.previousScore || 0,
    lastReviewDate: performanceData?.lastReviewDate || '',
    nextReviewDate: performanceData?.nextReviewDate || '',
    notes: performanceData?.notes || ''
  });

  const [reviews, setReviews] = useState<PerformanceReview[]>(performanceData?.reviews || []);
  const [skillAssessments, setSkillAssessments] = useState<SkillAssessment[]>(performanceData?.skillAssessments || []);
  const [goals, setGoals] = useState<PerformanceGoal[]>(performanceData?.goals || []);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'skills' | 'goals'>('overview');

  // New forms
  const [showNewReviewForm, setShowNewReviewForm] = useState(false);
  const [showNewSkillForm, setShowNewSkillForm] = useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);

  const [newReview, setNewReview] = useState({
    type: 'quarterly' as const,
    reviewerId: '',
    period: '',
    overallRating: 0,
    strengths: '',
    areasForImprovement: '',
    goals: '',
    comments: ''
  });

  const [newSkill, setNewSkill] = useState({
    skillName: '',
    category: '',
    currentLevel: 1,
    targetLevel: 5,
    assessedBy: '',
    notes: ''
  });

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'performance' as const,
    targetValue: '',
    currentValue: '',
    dueDate: '',
    priority: 'medium' as const
  });

  useEffect(() => {
    setEmployees(LocalStorage.getEmployees());
  }, []);

  useEffect(() => {
    if (performanceData) {
      setFormData({
        employeeId: performanceData.employeeId,
        currentScore: performanceData.currentScore,
        previousScore: performanceData.previousScore || 0,
        lastReviewDate: performanceData.lastReviewDate || '',
        nextReviewDate: performanceData.nextReviewDate || '',
        notes: performanceData.notes || ''
      });
      setReviews(performanceData.reviews || []);
      setSkillAssessments(performanceData.skillAssessments || []);
      setGoals(performanceData.goals || []);
    }
  }, [performanceData]);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const data = {
        ...formData,
        reviews,
        skillAssessments,
        goals,
        feedback: []
      };

      if (mode === 'create') {
        employeeLifecycleCRUD.createPerformanceData(data);
        toast.success('Dati performance creati con successo!');
      } else if (mode === 'edit' && performanceData) {
        employeeLifecycleCRUD.updatePerformanceData(performanceData.id, data);
        toast.success('Dati performance aggiornati!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving performance data:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!performanceData) return;
    
    setIsLoading(true);
    
    try {
      employeeLifecycleCRUD.deletePerformanceData(performanceData.id);
      toast.success('Dati performance eliminati!');
      onClose();
    } catch (error) {
      console.error('Error deleting performance data:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReview = () => {
    if (!newReview.reviewerId || !newReview.period) {
      toast.error('Reviewer e periodo sono obbligatori');
      return;
    }

    const review: PerformanceReview = {
      id: `review_${Date.now()}`,
      employeeId: formData.employeeId,
      reviewerId: newReview.reviewerId,
      type: newReview.type,
      period: newReview.period,
      status: 'completed',
      overallRating: newReview.overallRating,
      strengths: newReview.strengths.split('\n').filter(s => s.trim()),
      areasForImprovement: newReview.areasForImprovement.split('\n').filter(a => a.trim()),
      goals: newReview.goals.split('\n').filter(g => g.trim()),
      comments: newReview.comments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReviews([...reviews, review]);
    setNewReview({
      type: 'quarterly',
      reviewerId: '',
      period: '',
      overallRating: 0,
      strengths: '',
      areasForImprovement: '',
      goals: '',
      comments: ''
    });
    setShowNewReviewForm(false);
  };

  const handleAddSkill = () => {
    if (!newSkill.skillName || !newSkill.category) {
      toast.error('Nome skill e categoria sono obbligatori');
      return;
    }

    const skill: SkillAssessment = {
      id: `skill_${Date.now()}`,
      skillName: newSkill.skillName,
      category: newSkill.category,
      currentLevel: newSkill.currentLevel,
      targetLevel: newSkill.targetLevel,
      assessedBy: newSkill.assessedBy,
      assessmentDate: new Date().toISOString(),
      notes: newSkill.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSkillAssessments([...skillAssessments, skill]);
    setNewSkill({
      skillName: '',
      category: '',
      currentLevel: 1,
      targetLevel: 5,
      assessedBy: '',
      notes: ''
    });
    setShowNewSkillForm(false);
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.description) {
      toast.error('Titolo e descrizione sono obbligatori');
      return;
    }

    const goal: PerformanceGoal = {
      id: `goal_${Date.now()}`,
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      targetValue: newGoal.targetValue,
      currentValue: newGoal.currentValue,
      unit: '',
      dueDate: newGoal.dueDate,
      status: 'active',
      priority: newGoal.priority,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setGoals([...goals, goal]);
    setNewGoal({
      title: '',
      description: '',
      category: 'performance',
      targetValue: '',
      currentValue: '',
      dueDate: '',
      priority: 'medium'
    });
    setShowNewGoalForm(false);
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nuovo Tracking Performance'}
            {mode === 'edit' && 'Modifica Performance Data'}
            {mode === 'view' && 'Dettagli Performance'}
            {selectedEmployee && (
              <span className="text-muted-foreground text-base font-normal">
                - {selectedEmployee.nome} {selectedEmployee.cognome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {['overview', 'reviews', 'skills', 'goals'].map(tab => (
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
              {tab === 'reviews' && `Review (${reviews.length})`}
              {tab === 'skills' && `Skills (${skillAssessments.length})`}
              {tab === 'goals' && `Obiettivi (${goals.length})`}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentScore">Score Attuale</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.currentScore}
                      onChange={(e) => setFormData({...formData, currentScore: Number(e.target.value)})}
                      disabled={mode === 'view'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="previousScore">Score Precedente</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.previousScore}
                      onChange={(e) => setFormData({...formData, previousScore: Number(e.target.value)})}
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
                <h3 className="text-lg font-semibold">Statistiche Rapide</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Performance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formData.currentScore}/10</div>
                      <Progress value={formData.currentScore * 10} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Review Completate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reviews.length}</div>
                      <p className="text-xs text-muted-foreground">Totali</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Skills Valutate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{skillAssessments.length}</div>
                      <p className="text-xs text-muted-foreground">Competenze</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Obiettivi Attivi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {goals.filter(g => g.status === 'active').length}
                      </div>
                      <p className="text-xs text-muted-foreground">In corso</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Performance Reviews</h3>
                {mode !== 'view' && (
                  <Button
                    onClick={() => setShowNewReviewForm(true)}
                    disabled={showNewReviewForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Review
                  </Button>
                )}
              </div>

              {showNewReviewForm && (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reviewer</Label>
                      <Select value={newReview.reviewerId} onValueChange={(value) => setNewReview({...newReview, reviewerId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona reviewer" />
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
                      <Label>Periodo</Label>
                      <Input
                        value={newReview.period}
                        onChange={(e) => setNewReview({...newReview, period: e.target.value})}
                        placeholder="es. Q1 2024"
                      />
                    </div>
                    <div>
                      <Label>Tipo Review</Label>
                      <Select value={newReview.type} onValueChange={(value: any) => setNewReview({...newReview, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annuale</SelectItem>
                          <SelectItem value="semi_annual">Semestrale</SelectItem>
                          <SelectItem value="quarterly">Trimestrale</SelectItem>
                          <SelectItem value="probation">Prova</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rating Generale (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={newReview.overallRating}
                        onChange={(e) => setNewReview({...newReview, overallRating: Number(e.target.value)})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Punti di Forza</Label>
                      <Textarea
                        value={newReview.strengths}
                        onChange={(e) => setNewReview({...newReview, strengths: e.target.value})}
                        placeholder="Un punto per riga..."
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Aree di Miglioramento</Label>
                      <Textarea
                        value={newReview.areasForImprovement}
                        onChange={(e) => setNewReview({...newReview, areasForImprovement: e.target.value})}
                        placeholder="Un'area per riga..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setShowNewReviewForm(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddReview}>
                      Aggiungi Review
                    </Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {reviews.map(review => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            Review {review.type} - {review.period}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Reviewer: {employees.find(e => e.id === review.reviewerId)?.nome} {employees.find(e => e.id === review.reviewerId)?.cognome}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={cn(
                                'h-4 w-4',
                                star <= review.overallRating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                          <span className="ml-2 text-sm font-medium">
                            {review.overallRating}/5
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {review.strengths.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-green-700 mb-2">Punti di Forza:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {review.strengths.map((strength, index) => (
                              <li key={index} className="text-sm">{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {review.areasForImprovement.length > 0 && (
                        <div>
                          <h4 className="font-medium text-orange-700 mb-2">Aree di Miglioramento:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {review.areasForImprovement.map((area, index) => (
                              <li key={index} className="text-sm">{area}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Skill Assessment</h3>
                {mode !== 'view' && (
                  <Button
                    onClick={() => setShowNewSkillForm(true)}
                    disabled={showNewSkillForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Skill
                  </Button>
                )}
              </div>

              {showNewSkillForm && (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Skill</Label>
                      <Input
                        value={newSkill.skillName}
                        onChange={(e) => setNewSkill({...newSkill, skillName: e.target.value})}
                        placeholder="es. JavaScript, Leadership..."
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input
                        value={newSkill.category}
                        onChange={(e) => setNewSkill({...newSkill, category: e.target.value})}
                        placeholder="es. Tecnico, Soft Skills..."
                      />
                    </div>
                    <div>
                      <Label>Livello Attuale (1-10)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={newSkill.currentLevel}
                        onChange={(e) => setNewSkill({...newSkill, currentLevel: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Livello Target (1-10)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={newSkill.targetLevel}
                        onChange={(e) => setNewSkill({...newSkill, targetLevel: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setShowNewSkillForm(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddSkill}>
                      Aggiungi Skill
                    </Button>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillAssessments.map(skill => (
                  <Card key={skill.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{skill.skillName}</CardTitle>
                      <Badge variant="outline">{skill.category}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Livello Attuale</span>
                          <span>{skill.currentLevel}/10</span>
                        </div>
                        <Progress value={skill.currentLevel * 10} />
                        <div className="flex justify-between text-sm">
                          <span>Target</span>
                          <span>{skill.targetLevel}/10</span>
                        </div>
                        <Progress value={skill.targetLevel * 10} className="opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Obiettivi Performance</h3>
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
                        placeholder="es. Migliorare customer satisfaction..."
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={newGoal.category} onValueChange={(value: any) => setNewGoal({...newGoal, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="development">Sviluppo</SelectItem>
                          <SelectItem value="behavioral">Comportamentale</SelectItem>
                          <SelectItem value="technical">Tecnico</SelectItem>
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
                      <Label>Valore Target</Label>
                      <Input
                        value={newGoal.targetValue}
                        onChange={(e) => setNewGoal({...newGoal, targetValue: e.target.value})}
                        placeholder="es. 95%, 100 ore..."
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
                {goals.map(goal => (
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
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} />
                        {goal.targetValue && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Target: {goal.targetValue}</span>
                            {goal.dueDate && (
                              <span>Scadenza: {format(new Date(goal.dueDate), 'dd/MM/yyyy')}</span>
                            )}
                          </div>
                        )}
                      </div>
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
                Elimina Performance Data
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