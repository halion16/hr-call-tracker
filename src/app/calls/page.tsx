'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, Calendar, Clock, Star, User, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { Call, Employee } from '@/types';
import { formatDateTime, getCallStatusColor, generateId } from '@/lib/utils';

interface CallWithEmployee extends Call {
  employee: Employee;
}

export default function CallsPage() {
  const searchParams = useSearchParams();
  const highlightCallId = searchParams.get('highlight');
  
  const [calls, setCalls] = useState<CallWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    dataSchedulata: '',
    note: '',
    durata: '',
    rating: '5',
    nextCallDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedEmployees = LocalStorage.getEmployees();
    const loadedCalls = LocalStorage.getCalls();
    
    setEmployees(loadedEmployees);
    
    const callsWithEmployees = loadedCalls
      .map(call => {
        const employee = loadedEmployees.find(emp => emp.id === call.employeeId);
        return employee ? { ...call, employee } : null;
      })
      .filter(Boolean) as CallWithEmployee[];
    
    setCalls(callsWithEmployees.sort((a, b) => 
      new Date(b.dataSchedulata).getTime() - new Date(a.dataSchedulata).getTime()
    ));
  };

  const scheduleCall = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      alert('Per favore seleziona un dipendente');
      return;
    }
    
    if (!formData.dataSchedulata) {
      alert('Per favore seleziona data e ora');
      return;
    }
    
    const selectedDate = new Date(formData.dataSchedulata);
    const now = new Date();
    
    if (selectedDate < now) {
      alert('Non puoi schedulare una call nel passato');
      return;
    }
    
    const newCall: Call = {
      id: generateId(),
      employeeId: formData.employeeId,
      dataSchedulata: formData.dataSchedulata,
      note: formData.note,
      status: 'scheduled'
    };
    
    LocalStorage.addCall(newCall);
    loadData();
    resetForm();
  };

  const completeCall = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCall) {
      alert('Errore: nessuna call selezionata');
      return;
    }
    
    if (!formData.durata) {
      alert('Per favore inserisci la durata della call');
      return;
    }
    
    const duration = parseInt(formData.durata);
    if (isNaN(duration) || duration <= 0) {
      alert('La durata deve essere un numero positivo');
      return;
    }
    
    if (duration > 480) {
      alert('La durata non può superare 8 ore (480 minuti)');
      return;
    }
    
    if (!formData.rating) {
      alert('Per favore seleziona una valutazione');
      return;
    }
    
    if (formData.nextCallDate) {
      const nextCallDate = new Date(formData.nextCallDate);
      const now = new Date();
      
      if (nextCallDate <= now) {
        alert('La data della prossima call deve essere nel futuro');
        return;
      }
    }
    
    const updatedCall: Partial<Call> = {
      status: 'completed',
      dataCompletata: new Date().toISOString(),
      durata: parseInt(formData.durata),
      note: formData.note,
      rating: parseInt(formData.rating),
      nextCallDate: formData.nextCallDate || undefined
    };
    
    LocalStorage.updateCall(selectedCall.id, updatedCall);
    
    if (formData.nextCallDate) {
      const nextCall: Call = {
        id: generateId(),
        employeeId: selectedCall.employeeId,
        dataSchedulata: formData.nextCallDate,
        note: `Follow-up della call del ${formatDateTime(selectedCall.dataSchedulata)}`,
        status: 'scheduled'
      };
      LocalStorage.addCall(nextCall);
    }
    
    loadData();
    resetCompleteForm();
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      dataSchedulata: '',
      note: '',
      durata: '',
      rating: '5',
      nextCallDate: ''
    });
    setShowScheduleForm(false);
  };

  const resetCompleteForm = () => {
    setFormData({
      employeeId: '',
      dataSchedulata: '',
      note: '',
      durata: '',
      rating: '5',
      nextCallDate: ''
    });
    setShowCompleteForm(false);
    setSelectedCall(null);
  };

  const openCompleteForm = (call: Call) => {
    setSelectedCall(call);
    setFormData({
      ...formData,
      note: call.note || '',
      rating: '5'
    });
    setShowCompleteForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Call</h1>
          <p className="text-gray-600">Pianifica e traccia le call di recap con i dipendenti</p>
        </div>
        
        <Button onClick={() => setShowScheduleForm(true)}>
          <Phone className="mr-2 h-4 w-4" />
          Pianifica Nuova Call
        </Button>
      </div>

      {showScheduleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Pianifica Nuova Call</CardTitle>
            <CardDescription>Schedula una call di recap con un dipendente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={scheduleCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dipendente</label>
                <select 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Seleziona dipendente</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome} {emp.cognome} - {emp.posizione}
                    </option>
                  ))}
                </select>
              </div>
              
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
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Pianifica Call</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCompleteForm && selectedCall && (
        <Card>
          <CardHeader>
            <CardTitle>Completa Call</CardTitle>
            <CardDescription>
              Registra i dettagli della call con {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.nome} {' '}
              {calls.find(c => c.id === selectedCall.id)?.employee.cognome}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={completeCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Durata (minuti)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.durata}
                  onChange={(e) => setFormData({...formData, durata: e.target.value})}
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valutazione (1-5)</label>
                <select 
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="5">5 - Eccellente</option>
                  <option value="4">4 - Buona</option>
                  <option value="3">3 - Sufficiente</option>
                  <option value="2">2 - Scarsa</option>
                  <option value="1">1 - Pessima</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Note della call</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Riassunto della discussione, punti salienti, feedback..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Prossima Call (opzionale)</label>
                <Input
                  type="datetime-local"
                  value={formData.nextCallDate}
                  onChange={(e) => setFormData({...formData, nextCallDate: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Completa Call</Button>
                <Button type="button" variant="outline" onClick={resetCompleteForm}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Storico Call ({calls.length})</CardTitle>
          <CardDescription>Tutte le call pianificate e completate</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Nessuna call trovata. Pianifica la tua prima call!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div 
                  key={call.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${
                    highlightCallId === call.id ? 'bg-yellow-50 border-yellow-300' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {call.employee.nome} {call.employee.cognome}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDateTime(call.dataSchedulata)}
                        </span>
                        {call.durata && (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {call.durata} min
                          </span>
                        )}
                        {call.rating && (
                          <span className="flex items-center">
                            <Star className="w-4 h-4 mr-1 fill-current text-yellow-500" />
                            {call.rating}/5
                          </span>
                        )}
                      </div>
                      {call.note && (
                        <p className="text-sm text-gray-600 mt-1 max-w-md truncate">
                          {call.note}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCallStatusColor(call.status)}`}>
                      {call.status === 'scheduled' && 'Programmata'}
                      {call.status === 'completed' && 'Completata'}
                      {call.status === 'cancelled' && 'Annullata'}
                    </span>
                    
                    {call.status === 'scheduled' && (
                      <Button 
                        size="sm" 
                        onClick={() => openCompleteForm(call)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completa
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}