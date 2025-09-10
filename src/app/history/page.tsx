'use client';

import { useEffect, useState } from 'react';
import { Calendar, Phone, Clock, User, Search, Filter, CheckCircle, XCircle, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDate } from '@/lib/utils';

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [calls, searchFilter, statusFilter, outcomeFilter, dateRange]);

  const loadData = () => {
    const loadedCalls = LocalStorage.getCalls();
    const loadedEmployees = LocalStorage.getEmployees();
    setCalls(loadedCalls);
    setEmployees(loadedEmployees);
  };

  const getEmployeeById = (id: string) => {
    return employees.find(emp => emp.id === id);
  };

  const applyFilters = () => {
    let filtered = [...calls];

    // Filtro per ricerca
    if (searchFilter) {
      const searchTerm = searchFilter.toLowerCase();
      filtered = filtered.filter(call => {
        const employee = getEmployeeById(call.employeeId);
        if (!employee) return false;
        
        const employeeName = `${employee.nome} ${employee.cognome}`.toLowerCase();
        return employeeName.includes(searchTerm) ||
               employee.email.toLowerCase().includes(searchTerm) ||
               employee.dipartimento.toLowerCase().includes(searchTerm) ||
               call.note?.toLowerCase().includes(searchTerm) ||
               call.outcomeNotes?.toLowerCase().includes(searchTerm);
      });
    }

    // Filtro per status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    // Filtro per outcome
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter(call => call.outcome === outcomeFilter);
    }

    // Filtro per data
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(call => {
        const callDate = new Date(call.dataSchedulata);
        return callDate >= filterDate;
      });
    }

    // Ordina per data più recente
    filtered.sort((a, b) => new Date(b.dataSchedulata).getTime() - new Date(a.dataSchedulata).getTime());
    
    setFilteredCalls(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'missed': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'cancelled': return 'Annullata';
      case 'missed': return 'Persa';
      case 'scheduled': return 'Programmata';
      default: return status;
    }
  };

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case 'positive': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'negative': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'follow-up-needed': return <ArrowUpCircle className="w-4 h-4 text-orange-600" />;
      case 'neutral': return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getOutcomeLabel = (outcome?: string) => {
    switch (outcome) {
      case 'positive': return 'Positivo';
      case 'negative': return 'Negativo';
      case 'follow-up-needed': return 'Follow-up';
      case 'neutral': return 'Neutro';
      default: return '';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storico Chiamate</h1>
          <p className="text-gray-600">
            Visualizza e analizza lo storico completo delle chiamate HR
          </p>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
          <CardDescription>
            Filtra le chiamate per trovare rapidamente quello che cerchi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca dipendenti, note..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="scheduled">Programmate</SelectItem>
                <SelectItem value="completed">Completate</SelectItem>
                <SelectItem value="cancelled">Annullate</SelectItem>
                <SelectItem value="missed">Perse</SelectItem>
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Esito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli esiti</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
                <SelectItem value="follow-up-needed">Follow-up</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutto il periodo</SelectItem>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="week">Ultima settimana</SelectItem>
                <SelectItem value="month">Ultimo mese</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchFilter('');
                setStatusFilter('all');
                setOutcomeFilter('all');
                setDateRange('all');
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Reset Filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totali</p>
                <p className="text-2xl font-bold text-gray-900">{filteredCalls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredCalls.filter(c => c.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Programmate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredCalls.filter(c => c.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ArrowUpCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Follow-up</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredCalls.filter(c => c.outcome === 'follow-up-needed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Chiamate */}
      <Card>
        <CardHeader>
          <CardTitle>
            Chiamate ({filteredCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {calls.length === 0 
                  ? 'Nessuna chiamata trovata. Inizia programmando le tue prime chiamate.'
                  : 'Nessuna chiamata corrisponde ai filtri selezionati.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCalls.map((call) => {
                const employee = getEmployeeById(call.employeeId);
                if (!employee) return null;

                return (
                  <div 
                    key={call.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {employee.nome} {employee.cognome}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {employee.dipartimento}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(call.dataSchedulata)}
                            {call.dataSchedulata.includes('T') && (
                              <span className="ml-1">
                                alle {new Date(call.dataSchedulata).toLocaleTimeString('it-IT', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                          </span>
                          
                          {call.durata && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDuration(call.durata)}
                            </span>
                          )}
                        </div>
                        
                        {call.note && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Note:</strong> {call.note}
                          </p>
                        )}
                        
                        {call.outcomeNotes && (
                          <p className="text-sm text-gray-700">
                            <strong>Esito:</strong> {call.outcomeNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(call.status)}
                        <Badge 
                          variant={call.status === 'completed' ? 'default' : 
                                  call.status === 'cancelled' ? 'destructive' : 
                                  call.status === 'missed' ? 'destructive' : 'secondary'}
                        >
                          {getStatusLabel(call.status)}
                        </Badge>
                      </div>
                      
                      {call.outcome && (
                        <div className="flex items-center space-x-1">
                          {getOutcomeIcon(call.outcome)}
                          <Badge 
                            variant={call.outcome === 'positive' ? 'default' : 
                                    call.outcome === 'negative' ? 'destructive' : 
                                    call.outcome === 'follow-up-needed' ? 'destructive' : 'secondary'}
                          >
                            {getOutcomeLabel(call.outcome)}
                          </Badge>
                        </div>
                      )}
                      
                      {call.rating && (
                        <div className="text-sm text-gray-600">
                          ⭐ {call.rating}/5
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}