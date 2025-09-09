'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Phone, Calendar, Mail, User, Building2, Loader2, Users, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';
import { Employee, Call } from '@/types';
import { formatDate, generateId } from '@/lib/utils';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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

  const loadEmployees = () => {
    const loadedEmployees = LocalStorage.getEmployees();
    setEmployees(loadedEmployees);
  };

  const syncEmployees = async () => {
    setSyncing(true);
    try {
      const companyEmployees = await RealCompanyApiService.syncEmployees();
      
      const existingEmployees = LocalStorage.getEmployees();
      const updatedEmployees = [...existingEmployees];
      
      let newCount = 0;
      let updatedCount = 0;
      
      companyEmployees.forEach(apiEmployee => {
        const existingIndex = updatedEmployees.findIndex(emp => emp.id === apiEmployee.id);
        
        if (existingIndex >= 0) {
          updatedEmployees[existingIndex] = { ...updatedEmployees[existingIndex], ...apiEmployee };
          updatedCount++;
        } else {
          updatedEmployees.push(apiEmployee);
          newCount++;
        }
      });
      
      LocalStorage.setEmployees(updatedEmployees);
      setEmployees(updatedEmployees);
      
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('hr-tracker-last-sync', now.toISOString());
      
      alert(`Sincronizzazione completata:\n- ${newCount} nuovi dipendenti\n- ${updatedCount} aggiornamenti`);
    } catch (error) {
      alert('Errore durante la sincronizzazione');
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

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !formData.dataSchedulata) return;

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
    
    alert(`Call schedulata per ${selectedEmployee.nome} ${selectedEmployee.cognome}`);
  };

  const closeModal = () => {
    setShowScheduleModal(false);
    setSelectedEmployee(null);
    setFormData({ dataSchedulata: '', note: '' });
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
          <CardTitle>Dipendenti ({employees.length})</CardTitle>
          <CardDescription>
            Elenco dei dipendenti attivi importati dall'API aziendale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Nessun dipendente trovato. 
                <br />
                Clicca su "Sincronizza API Aziendale" per importare i dipendenti.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {employees.map((employee) => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
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
                <Button type="submit" className="flex-1">
                  Schedula Call
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
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