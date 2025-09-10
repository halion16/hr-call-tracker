'use client';

import { useState, useEffect } from 'react';
import { Calendar, ExternalLink, CheckCircle, AlertCircle, Settings, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GoogleCalendarService, CalendarSettings, CalendarConnection } from '@/lib/google-calendar-service';
import { CalendarSyncService, SyncStatus } from '@/lib/calendar-sync-service';
import { toast } from 'sonner';

export function CalendarConnectionComponent() {
  const [settings, setSettings] = useState<CalendarSettings>({
    enabled: false,
    autoCreateEvents: true,
    autoInviteEmployees: true,
    defaultDuration: 30,
    defaultLocation: 'Ufficio HR / Google Meet',
    meetingTemplate: {
      title: 'HR Call - {employeeName}',
      description: '',
      includeAgenda: true
    }
  });

  const [connection, setConnection] = useState<CalendarConnection>({
    isConnected: false
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isEnabled: false,
    autoSyncInterval: 30
  });

  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
    checkConnection();
    loadSyncStatus();
  }, []);

  const loadSettings = () => {
    const currentSettings = GoogleCalendarService.getSettings();
    setSettings(currentSettings);
  };

  const loadSyncStatus = () => {
    const currentSyncStatus = CalendarSyncService.getSyncStatus();
    setSyncStatus(currentSyncStatus);
  };

  const checkConnection = async () => {
    try {
      const status = await GoogleCalendarService.initializeConnection();
      setConnection(status);
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnection({
        isConnected: false,
        error: 'Errore controllo connessione'
      });
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    
    try {
      // Validate environment
      const envCheck = GoogleCalendarService.validateEnvironment();
      if (!envCheck.isValid) {
        toast.error('Configurazione Google API mancante', {
          description: `Variabili mancanti: ${envCheck.missing.join(', ')}`
        });
        return;
      }

      // Sign in to Google
      const success = await GoogleCalendarService.signIn();
      
      if (success) {
        toast.success('Connessione Google riuscita!');
        // Refresh connection status
        await checkConnection();
      } else {
        toast.error('Connessione fallita', {
          description: 'Riprova o controlla le impostazioni'
        });
      }
      
    } catch (error) {
      console.error('Connect failed:', error);
      toast.error('Errore durante la connessione');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    GoogleCalendarService.disconnect();
    setConnection({ isConnected: false });
    setSettings({ ...settings, enabled: false });
    toast.success('Account Google disconnesso');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      GoogleCalendarService.saveSettings(settings);
      toast.success('Impostazioni calendario salvate!');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      const status = await GoogleCalendarService.initializeConnection();
      if (status.isConnected) {
        toast.success('Connessione Google Calendar OK!', {
          description: `Account: ${status.accountEmail}`
        });
        setConnection(status);
      } else {
        toast.error('Test connessione fallito', {
          description: status.error
        });
      }
    } catch (error) {
      toast.error('Errore test connessione');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await CalendarSyncService.triggerManualSync();
      
      if (result.success) {
        toast.success('Sincronizzazione completata!', {
          description: `Creati: ${result.created}, Aggiornati: ${result.updated}${result.deleted > 0 ? `, Cancellati: ${result.deleted}` : ''}`
        });
      } else {
        toast.error('Sincronizzazione parzialmente fallita', {
          description: `${result.errors.length} errori riscontrati`
        });
      }
      
      loadSyncStatus();
    } catch (error) {
      toast.error('Errore durante la sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    CalendarSyncService.toggleSync(enabled);
    setSyncStatus({ ...syncStatus, isEnabled: enabled });
    
    toast.success(enabled ? 'Sincronizzazione automatica attivata' : 'Sincronizzazione automatica disattivata');
  };

  const handleSyncIntervalChange = (interval: number) => {
    CalendarSyncService.updateSyncStatus({ autoSyncInterval: interval });
    setSyncStatus({ ...syncStatus, autoSyncInterval: interval });
    
    // Restart auto sync with new interval
    if (syncStatus.isEnabled) {
      CalendarSyncService.stopAutoSync();
      CalendarSyncService.startAutoSync();
    }
  };

  const getConnectionStatusColor = () => {
    if (connection.isConnected) return 'text-green-600';
    if (connection.error) return 'text-red-600';
    return 'text-gray-500';
  };

  const getConnectionStatusText = () => {
    if (connection.isConnected) return 'Connesso';
    if (connection.error) return 'Errore';
    return 'Non connesso';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Google Calendar Integration</h2>
        <p className="text-gray-600">Sincronizza automaticamente le call con Google Calendar</p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Stato Connessione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                {connection.isConnected ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
              
              {connection.accountEmail && (
                <p className="text-xs text-gray-600 mt-1">
                  Account: {connection.accountEmail}
                </p>
              )}
              
              {connection.error && (
                <p className="text-xs text-red-600 mt-1">
                  {connection.error}
                </p>
              )}
            </div>

            <div className="space-x-2">
              {!connection.isConnected ? (
                <Button onClick={handleConnect} disabled={connecting} size="sm">
                  {connecting ? 'Connettendo...' : 'Connetti Google'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={testConnection} size="sm">
                    Test Connessione
                  </Button>
                  <Button variant="outline" onClick={handleDisconnect} size="sm">
                    Disconnetti
                  </Button>
                </>
              )}
            </div>
          </div>

          {connection.calendars && connection.calendars.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Calendari Disponibili:</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {connection.calendars.map(cal => (
                  <Badge key={cal.id} variant={cal.primary ? 'default' : 'secondary'} className="text-xs">
                    {cal.name} {cal.primary && '(Principale)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      {connection.isConnected && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
              <CardDescription>
                Configura il comportamento dell'integrazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Integrazione attiva</Label>
                  <p className="text-xs text-gray-600">Abilita creazione automatica eventi</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Crea eventi automaticamente</Label>
                  <p className="text-xs text-gray-600">Quando programmi una call</p>
                </div>
                <Switch
                  checked={settings.autoCreateEvents}
                  onCheckedChange={(autoCreateEvents) => setSettings({ ...settings, autoCreateEvents })}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Invita dipendenti automaticamente</Label>
                  <p className="text-xs text-gray-600">Aggiungi dipendente come partecipante</p>
                </div>
                <Switch
                  checked={settings.autoInviteEmployees}
                  onCheckedChange={(autoInviteEmployees) => setSettings({ ...settings, autoInviteEmployees })}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Durata default (min)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="240"
                    value={settings.defaultDuration}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      defaultDuration: parseInt(e.target.value) || 30 
                    })}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Luogo default
                  </Label>
                  <Input
                    id="location"
                    value={settings.defaultLocation}
                    onChange={(e) => setSettings({ ...settings, defaultLocation: e.target.value })}
                    placeholder="Ufficio HR / Google Meet"
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Template */}
          <Card>
            <CardHeader>
              <CardTitle>Template Evento</CardTitle>
              <CardDescription>
                Personalizza titolo e descrizione degli eventi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-title" className="text-sm font-medium">
                  Titolo evento
                </Label>
                <Input
                  id="event-title"
                  value={settings.meetingTemplate.title}
                  onChange={(e) => setSettings({
                    ...settings,
                    meetingTemplate: { ...settings.meetingTemplate, title: e.target.value }
                  })}
                  placeholder="HR Call - {employeeName}"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-500">
                  Variabili: {'{employeeName}'}, {'{employeeDepartment}'}, {'{employeePosition}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description" className="text-sm font-medium">
                  Descrizione evento
                </Label>
                <Textarea
                  id="event-description"
                  value={settings.meetingTemplate.description}
                  onChange={(e) => setSettings({
                    ...settings,
                    meetingTemplate: { ...settings.meetingTemplate, description: e.target.value }
                  })}
                  placeholder="Descrizione della call HR..."
                  rows={6}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Includi agenda standard</Label>
                  <p className="text-xs text-gray-600">Aggiungi punti agenda predefiniti</p>
                </div>
                <Switch
                  checked={settings.meetingTemplate.includeAgenda}
                  onCheckedChange={(includeAgenda) => setSettings({
                    ...settings,
                    meetingTemplate: { ...settings.meetingTemplate, includeAgenda }
                  })}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="p-3 bg-blue-50 rounded border text-xs text-blue-700">
                <p><strong>Preview titolo:</strong></p>
                <p>{GoogleCalendarService.processTemplate(
                  settings.meetingTemplate.title, 
                  'Mario Rossi'
                )}</p>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Synchronization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Sincronizzazione Calendario
              </CardTitle>
              <CardDescription>
                Gestisci la sincronizzazione bidirezionale con Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Sincronizzazione automatica</Label>
                  <p className="text-xs text-gray-600">Mantieni allineate le call tra HR Tracker e Google Calendar</p>
                </div>
                <Switch
                  checked={syncStatus.isEnabled}
                  onCheckedChange={handleToggleAutoSync}
                  disabled={!settings.enabled}
                />
              </div>

              {syncStatus.isEnabled && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sync-interval" className="text-sm font-medium">
                        Intervallo sincronizzazione (min)
                      </Label>
                      <select
                        id="sync-interval"
                        value={syncStatus.autoSyncInterval}
                        onChange={(e) => handleSyncIntervalChange(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value={15}>15 minuti</option>
                        <option value={30}>30 minuti</option>
                        <option value={60}>1 ora</option>
                        <option value={120}>2 ore</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Stato sincronizzazione</Label>
                      <div className="text-sm text-gray-600">
                        {syncStatus.lastSyncAt ? (
                          <>
                            <p>Ultima sync: {syncStatus.lastSyncAt.toLocaleString()}</p>
                            {syncStatus.nextSyncAt && (
                              <p>Prossima sync: {syncStatus.nextSyncAt.toLocaleTimeString()}</p>
                            )}
                          </>
                        ) : (
                          <p>Mai sincronizzato</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleManualSync}
                  disabled={syncing || !settings.enabled}
                  size="sm"
                >
                  {syncing ? 'Sincronizzando...' : 'Sincronizza Ora'}
                </Button>
                
                <div className="text-xs text-gray-500 flex items-center">
                  Sincronizza manualmente tutte le call con Google Calendar
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Environment Warning */}
      {(() => {
        const envCheck = GoogleCalendarService.validateEnvironment();
        if (!envCheck.isValid) {
          return (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Configurazione Google API Mancante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p>Per utilizzare l'integrazione Google Calendar, è necessario configurare:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {envCheck.missing.map(key => (
                      <li key={key}><code>{key}</code></li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    <strong>Setup:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Vai su <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="underline">Google Cloud Console</a></li>
                    <li>Abilita Google Calendar API</li>
                    <li>Crea credenziali OAuth 2.0</li>
                    <li>Configura redirect URI: <code>http://localhost:3004/auth/google/callback</code></li>
                    <li>Aggiungi le credenziali nel file <code>.env.local</code></li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          );
        }
      })()}

      {/* Save Button */}
      {connection.isConnected && (
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={loadSettings}>
            Ripristina
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salva Impostazioni'}
          </Button>
        </div>
      )}
    </div>
  );
}