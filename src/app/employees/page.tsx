'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Phone, Calendar, Mail, User, Building2, Loader2, Users, X, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Download, PhoneCall } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';
import { Employee, Call } from '@/types';
import { formatDate, generateId } from '@/lib/utils';
import { toast } from 'sonner';

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
  
  const [formData, setFormData] = useState({
    dataSchedulata: '',
    note: ''
  });

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
    setFormData({
      dataSchedulata: '',
      note: ''
    });
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !formData.dataSchedulata || schedulingCall) return;

    setSchedulingCall(true);
    try {
      // Simula un breve delay per mostrare il loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newCall: Call = {
        id: generateId(),
        employeeId: selectedEmployee.id,
        dataSchedulata: formData.dataSchedulata,
        note: formData.note,
        status: 'scheduled'
      };

      LocalStorage.addCall(newCall);
      
      setShowScheduleModal(false);
      setSelectedEmployee(null);
      setFormData({ dataSchedulata: '', note: '' });
      
      toast.success('Call schedulata!', {
        description: `Call con ${selectedEmployee.nome} ${selectedEmployee.cognome} programmata`
      });
    } finally {
      setSchedulingCall(false);
    }
  };

  const closeModal = () => {
    setShowScheduleModal(false);
    setSelectedEmployee(null);
    setFormData({ dataSchedulata: '', note: '' });
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
    setSchedulingCall(true);

    // Simula salvataggio per ogni dipendente selezionato
    const selectedData = employees.filter(emp => selectedEmployees.has(emp.id));
    
    for (const employee of selectedData) {
      const newCall: Call = {
        id: generateId(),
        dipendente: employee,
        dataSchedulata: new Date(formData.dataSchedulata),
        note: formData.note,
        stato: 'programmata',
        dataCreazione: new Date()
      };

      const existingCalls = LocalStorage.getCalls();
      LocalStorage.saveCalls([...existingCalls, newCall]);
    }

    // Simula delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setSchedulingCall(false);
    setShowBulkModal(false);
    setFormData({ dataSchedulata: '', note: '' });
    clearSelection();
    
    toast.success(`Call schedulata per ${selectedData.length} dipendenti!`);
  };

  const closeBulkModal = () => {
    if (!schedulingCall) {
      setShowBulkModal(false);
      setFormData({ dataSchedulata: '', note: '' });
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
            variant="outline" 
            onClick={syncEmployees}
            disabled={syncing}
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
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
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

      <Card>
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
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cerca per nome, cognome, email, posizione..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Barra azioni bulk */}
              {selectedEmployees.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                  {paginatedEmployees.map((employee) => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleEmployeeSelection(employee.id)}
                      className="flex items-center justify-center w-5 h-5 hover:bg-gray-100 rounded"
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Schedula Call con {selectedEmployee.nome} {selectedEmployee.cognome}
              </h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  value={formData.dataSchedulata}
                  onChange={(e) => setFormData({...formData, dataSchedulata: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Argomenti da discutere, obiettivi della call..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={schedulingCall}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
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
            
            <form onSubmit={handleBulkScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data e Ora</label>
                <Input
                  type="datetime-local"
                  value={formData.dataSchedulata}
                  onChange={(e) => setFormData({...formData, dataSchedulata: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Argomenti comuni da discutere con tutti i dipendenti..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={schedulingCall}>
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
    </div>
  );
}