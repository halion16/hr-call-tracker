'use client';

import { useState, useEffect } from 'react';
import { Settings, Database, Download, Upload, Trash2, RefreshCw, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocalStorage } from '@/lib/storage';
import { RealCompanyApiService } from '@/lib/real-company-api';

export default function SettingsPage() {
  const [apiSettings, setApiSettings] = useState({
    endpoint: 'https://ha.ecosagile.com',
    apiKey: 'your-api-key',
    version: 'v1',
    useMock: true,
    // Credenziali EcosAgile specifiche
    instanceCode: 'ee',
    userid: 'TUO_USERNAME',
    password: 'TUA_PASSWORD',
    clientId: '16383',
    // Token aziendali specifici
    ecosApiAuthToken: '039b969c-339d-4316-9c84-e4bfe1a77f3f',
    urlCalToken: '0AF0QFNRF5HPS5FJT6MMWF0DI',
    apiPassword: 'dG2ZhGyt!'
  });
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [stats, setStats] = useState({
    employees: 0,
    calls: 0,
    completedCalls: 0,
    lastSync: null as string | null
  });

  useEffect(() => {
    // Load stats on client side to avoid SSR localStorage issues
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    const completedCalls = calls.filter(call => call.status === 'completed');
    const lastSync = typeof window !== 'undefined' ? localStorage.getItem('hr-tracker-last-sync') : null;
    
    setStats({
      employees: employees.length,
      calls: calls.length,
      completedCalls: completedCalls.length,
      lastSync
    });

    // Load saved API settings
    const saved = localStorage.getItem('hr-tracker-api-settings');
    if (saved) {
      const savedSettings = JSON.parse(saved);
      setApiSettings(prev => ({ ...prev, ...savedSettings }));
    }
  }, []);

  const handleSaveApiSettings = () => {
    RealCompanyApiService.saveCredentials(apiSettings);
    alert('Impostazioni API salvate con successo!');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // Salva temporaneamente le impostazioni per il test
      RealCompanyApiService.saveCredentials(apiSettings);
      
      const result = await RealCompanyApiService.testConnection();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      alert(`❌ Errore durante il test: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const forceResetDefaults = () => {
    RealCompanyApiService.resetToCorrectDefaults();
    alert('Defaults corretti applicati! Ricarica la pagina.');
    window.location.reload();
  };

  const toggleMockMode = () => {
    const newUseMock = !apiSettings.useMock;
    const newSettings = {...apiSettings, useMock: newUseMock};
    setApiSettings(newSettings);
    
    // Salva automaticamente le impostazioni
    RealCompanyApiService.saveCredentials(newSettings);
    
    if (newUseMock) {
      alert('🔄 Modalità MOCK attivata - usando dati di test');
    } else {
      alert('🌐 Modalità EcosAgile REALE attivata - usando la tua API aziendale');
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const employees = LocalStorage.getEmployees();
      const calls = LocalStorage.getCalls();
      const user = LocalStorage.getUser();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          employees,
          calls,
          user,
          settings: JSON.parse(localStorage.getItem('hr-tracker-api-settings') || '{}')
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `hr-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      alert('Dati esportati con successo!');
    } catch (error) {
      alert('Errore durante l\'esportazione dei dati');
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.data) {
          if (importData.data.employees) {
            LocalStorage.setEmployees(importData.data.employees);
          }
          if (importData.data.calls) {
            LocalStorage.setCalls(importData.data.calls);
          }
          if (importData.data.user) {
            LocalStorage.setUser(importData.data.user);
          }
          if (importData.data.settings) {
            localStorage.setItem('hr-tracker-api-settings', JSON.stringify(importData.data.settings));
          }
        }
        
        alert('Dati importati con successo! Ricarica la pagina per vedere le modifiche.');
        window.location.reload();
      } catch (error) {
        alert('Errore durante l\'importazione: file non valido');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm('ATTENZIONE: Questa operazione cancellerà TUTTI i dati in modo permanente. Sei sicuro?')) {
      LocalStorage.clearAll();
      localStorage.removeItem('hr-tracker-api-settings');
      localStorage.removeItem('hr-tracker-last-sync');
      alert('Tutti i dati sono stati cancellati. La pagina verrà ricaricata.');
      window.location.reload();
    }
  };

  const handleResetToDemo = async () => {
    if (window.confirm('Vuoi ripristinare i dati demo? Questo cancellerà tutti i dati attuali.')) {
      try {
        LocalStorage.clearAll();
        
        // Ricarica i dati demo
        const demoEmployees = await RealCompanyApiService.syncEmployees();
        LocalStorage.setEmployees(demoEmployees);
        
        alert('Dati demo ripristinati con successo! La pagina verrà ricaricata.');
        window.location.reload();
      } catch (error) {
        alert('Errore durante il ripristino dei dati demo');
        console.error('Reset error:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-600">Configura l'applicazione e gestisci i dati</p>
      </div>

      {/* Statistiche sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Stato del Sistema
          </CardTitle>
          <CardDescription>
            Informazioni sui dati memorizzati localmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.employees}</div>
              <div className="text-sm text-gray-600">Dipendenti</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.calls}</div>
              <div className="text-sm text-gray-600">Call Totali</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.completedCalls}</div>
              <div className="text-sm text-gray-600">Completate</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Ultima Sync</div>
              <div className="text-xs text-gray-500">
                {stats.lastSync 
                  ? new Date(stats.lastSync).toLocaleDateString('it-IT')
                  : 'Mai'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurazione API */}
      <Card>
        <CardHeader>
          <CardTitle>Configurazione EcosAgile</CardTitle>
          <CardDescription>
            Imposta i parametri di connessione all'API EcosAgile per l'importazione dipendenti
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Endpoint API EcosAgile</label>
            <Input
              value={apiSettings.endpoint}
              onChange={(e) => setApiSettings({...apiSettings, endpoint: e.target.value})}
              placeholder="https://ha.ecosagile.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Codice Istanza</label>
            <Input
              value={apiSettings.instanceCode}
              onChange={(e) => setApiSettings({...apiSettings, instanceCode: e.target.value})}
              placeholder="ee"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username EcosAgile</label>
              <Input
                value={apiSettings.userid}
                onChange={(e) => setApiSettings({...apiSettings, userid: e.target.value})}
                placeholder="TUO_USERNAME"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password EcosAgile</label>
              <Input
                type="password"
                value={apiSettings.password}
                onChange={(e) => setApiSettings({...apiSettings, password: e.target.value})}
                placeholder="TUA_PASSWORD"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Client ID (Opzionale)</label>
            <Input
              value={apiSettings.clientId}
              onChange={(e) => setApiSettings({...apiSettings, clientId: e.target.value})}
              placeholder="16383"
            />
          </div>

          {/* Token Aziendali */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3">Token Aziendali</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">EcosApi AuthToken</label>
                <Input
                  type="password"
                  value={apiSettings.ecosApiAuthToken}
                  onChange={(e) => setApiSettings({...apiSettings, ecosApiAuthToken: e.target.value})}
                  placeholder="039b969c-339d-4316..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">URL Cal Token</label>
                <Input
                  type="password"
                  value={apiSettings.urlCalToken}
                  onChange={(e) => setApiSettings({...apiSettings, urlCalToken: e.target.value})}
                  placeholder="0AF0QFNRF5HPS5FJT6..."
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">API Password</label>
                <Input
                  type="password"
                  value={apiSettings.apiPassword}
                  onChange={(e) => setApiSettings({...apiSettings, apiPassword: e.target.value})}
                  placeholder="dG2ZhGyt!"
                />
              </div>
            </div>
          </div>

          {/* Modalità Mock/Reale */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Modalità API</h4>
                <p className="text-sm text-gray-600">
                  {apiSettings.useMock 
                    ? '🔄 Usando dati MOCK per testing' 
                    : '🌐 Usando API EcosAgile reale'
                  }
                </p>
              </div>
              <Button
                variant={apiSettings.useMock ? "outline" : "default"}
                size="sm"
                onClick={toggleMockMode}
              >
                {apiSettings.useMock ? 'Attiva API Reale' : 'Usa Mock'}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>• <strong>Mock:</strong> Usa 6 dipendenti demo per testing</p>
              <p>• <strong>EcosAgile Reale:</strong> Connessione alla tua API EcosAgile</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handleSaveApiSettings}>
              <Save className="mr-2 h-4 w-4" />
              Salva Configurazione
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testa Connessione'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gestione dati */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Dati</CardTitle>
          <CardDescription>
            Backup, importa/esporta i tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={exportLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportLoading ? 'Esportando...' : 'Esporta Dati'}
            </Button>
            
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                id="import-file"
              />
              <Button variant="outline" asChild>
                <label htmlFor="import-file" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Importa Dati
                </label>
              </Button>
            </div>
            
            <Button variant="outline" onClick={handleResetToDemo}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Ripristina Dati Demo
            </Button>
            
            <Button variant="outline" onClick={forceResetDefaults}>
              🔧 Reset Config API
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>• <strong>Esporta:</strong> Salva tutti i dati in un file JSON di backup</p>
            <p>• <strong>Importa:</strong> Carica i dati da un file di backup precedente</p>
            <p>• <strong>Demo:</strong> Ripristina i 6 dipendenti demo per test</p>
          </div>
        </CardContent>
      </Card>

      {/* Zona pericolosa */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Zona Pericolosa
          </CardTitle>
          <CardDescription>
            Operazioni irreversibili. Procedi con cautela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDangerZone ? (
            <Button 
              variant="outline" 
              onClick={() => setShowDangerZone(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Mostra Operazioni Pericolose
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Cancella Tutti i Dati</h4>
                <p className="text-sm text-red-600 mb-3">
                  Questa operazione cancellerà permanentemente tutti i dipendenti, le call e le impostazioni.
                  <strong> Non è possibile annullare questa operazione.</strong>
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleClearAllData}
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancella Tutto Definitivamente
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDangerZone(false)}
              >
                Nascondi Zona Pericolosa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}