'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationService } from '@/lib/notification-service';
import { indexedDBService } from '@/lib/indexed-db';
import { Bell, Database, TestTube, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export function NotificationTestComponent() {
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [indexedDBStatus, setIndexedDBStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  useEffect(() => {
    checkIndexedDBAvailability();
  }, []);

  const checkIndexedDBAvailability = async () => {
    try {
      if ('indexedDB' in window) {
        const testDB = await indexedDBService.initialize();
        setIndexedDBStatus(testDB ? 'available' : 'unavailable');
      } else {
        setIndexedDBStatus('unavailable');
      }
    } catch (error) {
      setIndexedDBStatus('unavailable');
    }
  };

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', message: string) => {
    setTestResults(prev => {
      const filtered = prev.filter(r => r.name !== name);
      return [...filtered, { name, status, message }];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: IndexedDB Initialization
    addTestResult('IndexedDB Init', 'pending', 'Inizializzazione IndexedDB...');
    try {
      const initialized = await indexedDBService.initialize();
      if (initialized) {
        addTestResult('IndexedDB Init', 'success', 'IndexedDB inizializzato correttamente');
      } else {
        addTestResult('IndexedDB Init', 'error', 'Fallback a localStorage');
      }
    } catch (error) {
      addTestResult('IndexedDB Init', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 2: NotificationService Initialization
    addTestResult('Service Init', 'pending', 'Inizializzazione NotificationService...');
    try {
      const serviceInit = await NotificationService.initialize();
      addTestResult('Service Init', serviceInit ? 'success' : 'error', 
        serviceInit ? 'NotificationService inizializzato' : 'Inizializzazione fallita');
    } catch (error) {
      addTestResult('Service Init', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 3: Create Test Notification
    addTestResult('Create Notification', 'pending', 'Creazione notifica di test...');
    try {
      const testNotification = await NotificationService.createNotification(
        'system',
        'Test Notification',
        'Questa è una notifica di test per verificare IndexedDB',
        new Date(Date.now() + 5000), // 5 seconds from now
        {
          priority: 'medium',
          metadata: { test: true, timestamp: new Date().toISOString() }
        }
      );
      
      if (testNotification) {
        addTestResult('Create Notification', 'success', `Notifica creata: ${testNotification.id}`);
      } else {
        addTestResult('Create Notification', 'error', 'Fallimento creazione notifica');
      }
    } catch (error) {
      addTestResult('Create Notification', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 4: Retrieve Notifications
    addTestResult('Retrieve Notifications', 'pending', 'Recupero notifiche...');
    try {
      const notifications = await NotificationService.getNotifications();
      addTestResult('Retrieve Notifications', 'success', `Recuperate ${notifications.length} notifiche`);
    } catch (error) {
      addTestResult('Retrieve Notifications', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 5: Get Statistics
    addTestResult('Get Stats', 'pending', 'Recupero statistiche...');
    try {
      const stats = await NotificationService.getStats();
      addTestResult('Get Stats', 'success', 
        `Stats: ${stats.total} totali, ${stats.pending} in attesa, ${stats.sent} inviate`);
    } catch (error) {
      addTestResult('Get Stats', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 6: IndexedDB Direct Test (if available)
    if (indexedDBStatus === 'available') {
      addTestResult('IndexedDB Direct', 'pending', 'Test diretto IndexedDB...');
      try {
        const testItem = {
          id: `test_${Date.now()}`,
          notification: {
            id: `test_${Date.now()}`,
            type: 'system' as const,
            priority: 'low' as const,
            title: 'Test Direct',
            message: 'Test diretto IndexedDB',
            scheduledFor: new Date(),
            createdAt: new Date(),
            status: 'pending' as const,
            channels: ['browser' as const]
          },
          retryCount: 0
        };

        await indexedDBService.storeNotification(testItem.notification);
        const retrieved = await indexedDBService.getAllNotifications();
        const testFound = retrieved.find(item => item.id === testItem.id);
        
        addTestResult('IndexedDB Direct', testFound ? 'success' : 'error', 
          testFound ? 'Test diretto IndexedDB completato' : 'Elemento test non trovato');
      } catch (error) {
        addTestResult('IndexedDB Direct', 'error', `Errore: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    setIsRunning(false);
  };

  const clearTestData = async () => {
    try {
      if (indexedDBStatus === 'available') {
        await indexedDBService.cleanup(0); // Remove all notifications
        addTestResult('Cleanup', 'success', 'Dati test puliti da IndexedDB');
      }
      
      // Also clear localStorage fallback
      localStorage.removeItem('hr-tracker-notifications');
      addTestResult('Cleanup', 'success', 'Dati test puliti da localStorage');
    } catch (error) {
      addTestResult('Cleanup', 'error', `Errore cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TestTube className="h-5 w-5 mr-2" />
          Test Sistema NotifIche IndexedDB
        </CardTitle>
        <CardDescription>
          Verifica il funzionamento del sistema di notifiche con persistenza IndexedDB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg border ${
            indexedDBStatus === 'available' 
              ? 'border-green-200 bg-green-50' 
              : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">IndexedDB Status:</span>
              <span className={
                indexedDBStatus === 'available' ? 'text-green-600' :
                indexedDBStatus === 'unavailable' ? 'text-red-600' : 'text-yellow-600'
              }>
                {indexedDBStatus === 'available' ? 'Disponibile' :
                 indexedDBStatus === 'unavailable' ? 'Non Disponibile' : 'Verifica...'}
              </span>
            </div>
          </div>
          
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium">Browser Notifications:</span>
              <span className={
                typeof window !== 'undefined' && 'Notification' in window
                  ? Notification.permission === 'granted' ? 'text-green-600' : 'text-yellow-600'
                  : 'text-red-600'
              }>
                {typeof window !== 'undefined' && 'Notification' in window
                  ? Notification.permission === 'granted' ? 'Abilitate' : 'Da abilitare'
                  : 'Non supportate'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex space-x-3">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Esecuzione Test...' : 'Esegui Test Completi'}
          </Button>
          <Button variant="outline" onClick={clearTestData} disabled={isRunning}>
            Pulisci Dati Test
          </Button>
          <Button variant="outline" onClick={checkIndexedDBAvailability} disabled={isRunning}>
            Ricontrolla IndexedDB
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Risultati Test:</h4>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.name}:</span>
                    <span className="flex-1">{result.message}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {!isRunning && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Risultato:</strong> {testResults.filter(r => r.status === 'success').length} / {testResults.length} test superati
                </p>
                {testResults.some(r => r.status === 'error') && (
                  <p className="text-sm text-blue-600 mt-1">
                    ⚠️ Alcuni test sono falliti ma il sistema dovrebbe funzionare con localStorage come fallback.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}