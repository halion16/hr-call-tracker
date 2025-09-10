'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, TrendingUp, AlertTriangle, Users, Calendar } from 'lucide-react';
import { PriorityDashboard } from '@/components/priority/priority-dashboard';
import { useRouter } from 'next/navigation';

export default function PrioritiesPage() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  const handleScheduleCall = (employeeId: string) => {
    // Navigate to calls page with employee pre-selected
    router.push(`/calls?scheduleFor=${employeeId}`);
  };

  const handleViewEmployee = (employeeId: string) => {
    // Navigate to employees page with employee highlighted
    router.push(`/employees?highlight=${employeeId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema Prioritizzazione Intelligente</h1>
          <p className="text-gray-600 mt-2">
            Algoritmi intelligenti per identificare i dipendenti che richiedono maggiore attenzione
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configura Regole
          </Button>
          
          <Button onClick={() => router.push('/calls')}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedula Chiamate
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Scoring Intelligente</h3>
                <p className="text-sm text-gray-600">
                  Algoritmo basato su 6 fattori chiave per determinare la priorità
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold">Alert Automatici</h3>
                <p className="text-sm text-gray-600">
                  Identificazione proattiva di situazioni che richiedono intervento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Azioni Consigliate</h3>
                <p className="text-sm text-gray-600">
                  Suggerimenti specifici per ogni dipendente basati sui dati
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Explanation */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Come Funziona l'Algoritmo di Prioritizzazione
            </CardTitle>
            <CardDescription>
              Il sistema analizza 6 fattori chiave per determinare automaticamente la priorità di ogni dipendente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Fattori Analizzati</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">25%</Badge>
                    <div>
                      <h5 className="font-medium">Performance Recente</h5>
                      <p className="text-sm text-gray-600">Rating delle ultime 5 chiamate completate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">20%</Badge>
                    <div>
                      <h5 className="font-medium">Chiamate in Ritardo</h5>
                      <p className="text-sm text-gray-600">Presenza di chiamate scadute o rimandate multiple volte</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">15%</Badge>
                    <div>
                      <h5 className="font-medium">Frequenza Interazioni</h5>
                      <p className="text-sm text-gray-600">Numero di chiamate negli ultimi 30 giorni</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Fattori Aggiuntivi</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">15%</Badge>
                    <div>
                      <h5 className="font-medium">Trend Performance</h5>
                      <p className="text-sm text-gray-600">Declino nelle valutazioni recenti</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">15%</Badge>
                    <div>
                      <h5 className="font-medium">Livello Engagement</h5>
                      <p className="text-sm text-gray-600">Partecipazione attiva e dettaglio nelle note</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">10%</Badge>
                    <div>
                      <h5 className="font-medium">Assenza Prolungata</h5>
                      <p className="text-sm text-gray-600">Lungo periodo senza chiamate programmate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Livelli di Priorità
              </h5>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <Badge className="bg-red-500 text-white mb-2">ALTA</Badge>
                  <p className="text-gray-600 dark:text-gray-300">Score 70-100</p>
                  <p className="text-xs text-gray-500">Richiede intervento immediato</p>
                </div>
                <div className="text-center">
                  <Badge className="bg-yellow-500 text-white mb-2">MEDIA</Badge>
                  <p className="text-gray-600 dark:text-gray-300">Score 40-69</p>
                  <p className="text-xs text-gray-500">Monitoraggio regolare</p>
                </div>
                <div className="text-center">
                  <Badge className="bg-green-500 text-white mb-2">BASSA</Badge>
                  <p className="text-gray-600 dark:text-gray-300">Score 0-39</p>
                  <p className="text-xs text-gray-500">Situazione stabile</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Dashboard */}
      <PriorityDashboard 
        onScheduleCall={handleScheduleCall}
        onViewEmployee={handleViewEmployee}
      />
    </div>
  );
}