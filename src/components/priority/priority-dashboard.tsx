'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  Phone, 
  Settings,
  ChevronDown,
  ChevronUp,
  Calendar,
  MessageSquare,
  Target,
  Activity
} from 'lucide-react';
import { priorityService, PriorityScore } from '@/lib/priority-scoring-service';
import { LocalStorage } from '@/lib/storage';
import { Employee } from '@/types';

interface PriorityDashboardProps {
  onScheduleCall?: (employeeId: string) => void;
  onViewEmployee?: (employeeId: string) => void;
}

export function PriorityDashboard({ onScheduleCall, onViewEmployee }: PriorityDashboardProps) {
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadPriorities();
  }, []);

  const loadPriorities = () => {
    setLoading(true);
    try {
      const allEmployees = LocalStorage.getEmployees();
      const allPriorities = priorityService.getAllEmployeePriorities();
      
      setEmployees(allEmployees);
      setPriorities(allPriorities);
    } catch (error) {
      console.error('Error loading priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = (employeeId: string): Employee | undefined => {
    return employees.find(emp => emp.id === employeeId);
  };

  const filteredPriorities = priorities.filter(priority => {
    if (filter === 'all') return true;
    return priority.priority === filter;
  });

  const stats = priorityService.getPriorityStats();

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      case 'low': return Target;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Priority Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
                <p className="text-sm text-gray-600">Alta Priorità</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
                <p className="text-sm text-gray-600">Media Priorità</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.low}</p>
                <p className="text-sm text-gray-600">Bassa Priorità</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.avgScore}</p>
                <p className="text-sm text-gray-600">Score Medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        {(['all', 'high', 'medium', 'low'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tutti' : 
             f === 'high' ? 'Alta Priorità' :
             f === 'medium' ? 'Media Priorità' : 'Bassa Priorità'}
          </Button>
        ))}
      </div>

      {/* Priority List */}
      <div className="space-y-4">
        {filteredPriorities.map((priority) => {
          const employee = getEmployee(priority.employeeId);
          if (!employee) return null;

          const Icon = getPriorityIcon(priority.priority);
          const isExpanded = expandedEmployee === priority.employeeId;

          return (
            <Card key={priority.employeeId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Priority Badge */}
                    <Badge className={getPriorityColor(priority.priority)}>
                      <Icon className="h-3 w-3 mr-1" />
                      {priority.priority.toUpperCase()}
                    </Badge>

                    {/* Employee Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {employee.nome} {employee.cognome}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {employee.posizione} • {employee.dipartimento}
                      </p>
                    </div>

                    {/* Priority Score */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {priority.totalScore}
                      </p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => onScheduleCall?.(employee.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Schedula
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedEmployee(isExpanded ? null : priority.employeeId)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Top Recommendations */}
                {priority.recommendations.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center space-x-2 text-sm text-amber-600">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">Raccomandazione:</span>
                      <span>{priority.recommendations[0]}</span>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 border-t pt-4 space-y-4">
                    {/* Factor Breakdown */}
                    <div>
                      <h4 className="font-medium mb-3">Analisi Fattori di Priorità</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Performance</span>
                              <span>{priority.factors.performanceScore}</span>
                            </div>
                            <Progress value={priority.factors.performanceScore} className="h-2" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Frequenza Interazione</span>
                              <span>{priority.factors.interactionFrequency}</span>
                            </div>
                            <Progress value={priority.factors.interactionFrequency} className="h-2" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Urgenza</span>
                              <span>{priority.factors.urgencyScore}</span>
                            </div>
                            <Progress value={priority.factors.urgencyScore} className="h-2" />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Rischio</span>
                              <span>{priority.factors.riskScore}</span>
                            </div>
                            <Progress value={priority.factors.riskScore} className="h-2" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Engagement</span>
                              <span>{priority.factors.engagementScore}</span>
                            </div>
                            <Progress value={priority.factors.engagementScore} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* All Recommendations */}
                    {priority.recommendations.length > 1 && (
                      <div>
                        <h4 className="font-medium mb-2">Tutte le Raccomandazioni</h4>
                        <ul className="space-y-1">
                          {priority.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <span className="text-amber-500 mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex space-x-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewEmployee?.(employee.id)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Vedi Profilo
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // TODO: Navigate to call history
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Storico Call
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPriorities.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Nessun dipendente trovato' 
                : `Nessun dipendente con priorità ${filter}`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadPriorities} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Aggiorna Priorità
        </Button>
      </div>
    </div>
  );
}