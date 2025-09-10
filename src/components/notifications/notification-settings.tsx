'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, Mail, MessageSquare, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NotificationService, NotificationSettings, NotificationChannel } from '@/lib/notification-service';
import { DigestSettingsComponent } from './digest-settings';
import { toast } from 'sonner';

export function NotificationSettingsComponent() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    channels: ['browser'],
    remindersEnabled: true,
    reminderMinutes: 60,
    escalationEnabled: true,
    escalationHours: 48,
    digestEnabled: false,
    digestFrequency: 'daily',
    digestTime: '09:00',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  });

  const [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, failed: 0 });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
    checkPermission();
  }, []);

  const loadSettings = () => {
    const currentSettings = NotificationService.getSettings();
    setSettings(currentSettings);
  };

  const loadStats = () => {
    const currentStats = NotificationService.getStats();
    setStats(currentStats);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      NotificationService.saveSettings(settings);
      toast.success('Impostazioni salvate!', {
        description: 'Le modifiche sono state applicate correttamente.'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast.success('Notifiche abilitate!', {
          description: 'Ora riceverai i promemoria del browser.'
        });
      } else {
        toast.error('Notifiche negate', {
          description: 'Le notifiche del browser non sono disponibili.'
        });
      }
    }
  };

  const testNotification = () => {
    if (permissionStatus === 'granted') {
      const notification = new Notification('Test Notifica HR Call Tracker', {
        body: 'Questa è una notifica di test. Il sistema funziona correttamente!',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
      
      setTimeout(() => notification.close(), 5000);
      toast.success('Notifica di test inviata!');
    } else {
      toast.error('Abilita prima le notifiche del browser');
    }
  };

  const updateChannel = (channel: NotificationChannel, enabled: boolean) => {
    const newChannels = enabled 
      ? [...settings.channels, channel]
      : settings.channels.filter(c => c !== channel);
    
    setSettings({ ...settings, channels: [...new Set(newChannels)] });
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Abilitate';
      case 'denied': return 'Negate';
      default: return 'Non richieste';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni Notifiche</h1>
        <p className="text-gray-600">Configura promemoria e notifiche per le call HR</p>
      </div>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Stato Permessi Browser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Stato notifiche browser: <span className={getPermissionStatusColor()}>{getPermissionStatusText()}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Le notifiche browser sono necessarie per i promemoria automatici
              </p>
            </div>
            <div className="space-x-2">
              {permissionStatus !== 'granted' && (
                <Button onClick={requestPermission} size="sm">
                  Abilita Notifiche
                </Button>
              )}
              <Button onClick={testNotification} variant="outline" size="sm" disabled={permissionStatus !== 'granted'}>
                Test Notifica
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Statistiche Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Totali</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">In Attesa</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <div className="text-sm text-gray-600">Inviate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Fallite</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Impostazioni Generali</CardTitle>
            <CardDescription>
              Configura le impostazioni base delle notifiche
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Sistema notifiche attivo</Label>
                <p className="text-xs text-gray-600">Abilita/disabilita tutte le notifiche</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Canali di notifica</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm">Browser</span>
                  </div>
                  <Switch
                    checked={settings.channels.includes('browser')}
                    onCheckedChange={(enabled) => updateChannel('browser', enabled)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                    <span className="text-xs text-gray-500">(Coming soon)</span>
                  </div>
                  <Switch
                    checked={settings.channels.includes('email')}
                    onCheckedChange={(enabled) => updateChannel('email', enabled)}
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Slack</span>
                    <span className="text-xs text-gray-500">(Coming soon)</span>
                  </div>
                  <Switch
                    checked={settings.channels.includes('slack')}
                    onCheckedChange={(enabled) => updateChannel('slack', enabled)}
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Microsoft Teams</span>
                    <span className="text-xs text-gray-500">(Coming soon)</span>
                  </div>
                  <Switch
                    checked={settings.channels.includes('teams')}
                    onCheckedChange={(enabled) => updateChannel('teams', enabled)}
                    disabled
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Promemoria Call
            </CardTitle>
            <CardDescription>
              Configura i promemoria automatici prima delle call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Promemoria attivi</Label>
                <p className="text-xs text-gray-600">Ricevi notifiche prima delle call</p>
              </div>
              <Switch
                checked={settings.remindersEnabled}
                onCheckedChange={(remindersEnabled) => setSettings({ ...settings, remindersEnabled })}
              />
            </div>

            {settings.remindersEnabled && (
              <div className="space-y-2">
                <Label htmlFor="reminder-minutes" className="text-sm font-medium">
                  Anticipo promemoria (minuti)
                </Label>
                <Input
                  id="reminder-minutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.reminderMinutes}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    reminderMinutes: parseInt(e.target.value) || 60 
                  })}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Riceverai un promemoria {settings.reminderMinutes} minuti prima di ogni call
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Escalation automatica</Label>
                <p className="text-xs text-gray-600">Notifica per call non completate</p>
              </div>
              <Switch
                checked={settings.escalationEnabled}
                onCheckedChange={(escalationEnabled) => setSettings({ ...settings, escalationEnabled })}
              />
            </div>

            {settings.escalationEnabled && (
              <div className="space-y-2">
                <Label htmlFor="escalation-hours" className="text-sm font-medium">
                  Escalation dopo (ore)
                </Label>
                <Input
                  id="escalation-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.escalationHours}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    escalationHours: parseInt(e.target.value) || 48 
                  })}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Escalation dopo {settings.escalationHours} ore se la call non è completata
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Orari di Silenzio
            </CardTitle>
            <CardDescription>
              Disabilita le notifiche durante orari specifici
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Orari silenzio attivi</Label>
                <p className="text-xs text-gray-600">Non inviare notifiche in determinati orari</p>
              </div>
              <Switch
                checked={settings.quietHours.enabled}
                onCheckedChange={(enabled) => setSettings({ 
                  ...settings, 
                  quietHours: { ...settings.quietHours, enabled } 
                })}
              />
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start" className="text-sm font-medium">Inizio</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, start: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end" className="text-sm font-medium">Fine</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, end: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Digest Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Digest Periodici
            </CardTitle>
            <CardDescription>
              Ricevi riepiloghi delle attività (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Digest attivi</Label>
                <p className="text-xs text-gray-600">Ricevi riepiloghi periodici delle call</p>
              </div>
              <Switch
                checked={settings.digestEnabled}
                onCheckedChange={(digestEnabled) => setSettings({ ...settings, digestEnabled })}
                disabled
              />
            </div>

            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
              <p>I digest periodici saranno disponibili nella prossima versione e includeranno:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Riepilogo call completate</li>
                <li>Call in scadenza</li>
                <li>Performance del team</li>
                <li>Statistiche e trend</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={loadSettings}>
          Ripristina
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salva Impostazioni'}
        </Button>
      </div>

      {/* Digest Settings Section */}
      <div className="border-t pt-6 mt-6">
        <DigestSettingsComponent />
      </div>
    </div>
  );
}