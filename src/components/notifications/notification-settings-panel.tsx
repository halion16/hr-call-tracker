'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Settings, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  callReminders: boolean;
  overdueAlerts: boolean;
  method: 'email' | 'sms' | 'both';
  reminderHours: number;
}

interface ServiceStatus {
  email_configured: boolean;
  sms_configured: boolean;
  smtp_host: string;
  twilio_configured: boolean;
}

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    smsEnabled: false,
    callReminders: true,
    overdueAlerts: true,
    method: 'email',
    reminderHours: 24
  });

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    checkServiceStatus();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    setLoading(false);
  };

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
    toast.success('Impostazioni notifiche salvate');
  };

  const checkServiceStatus = async () => {
    try {
      const response = await fetch('/api/notifications/send?test=config');
      const status = await response.json();
      setServiceStatus(status);
    } catch (error) {
      console.error('Failed to check service status:', error);
    }
  };

  const sendTestNotification = async (type: 'email' | 'sms') => {
    setTesting(true);
    
    const testData = {
      type: 'call_reminder',
      employeeName: 'Test User',
      employeeEmail: testEmail || 'test@company.com',
      employeePhone: testPhone || '+393331234567',
      callDate: new Date().toLocaleDateString('it-IT'),
      callTime: '14:30',
      method: type
    };

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Test ${type === 'email' ? 'email' : 'SMS'} inviato con successo!`);
      } else {
        toast.error(`Errore invio ${type === 'email' ? 'email' : 'SMS'}: ${result.results?.[0]?.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(`Errore di rete: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (configured: boolean, label: string) => (
    <Badge variant={configured ? "default" : "secondary"} className="ml-2">
      {configured ? (
        <>
          <CheckCircle className="w-3 h-3 mr-1" />
          {label} OK
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 mr-1" />
          {label} Non Configurato
        </>
      )}
    </Badge>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento impostazioni...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stato Servizi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Stato Servizi di Notifica
          </CardTitle>
          <CardDescription>
            Configurazione dei servizi email e SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-blue-500" />
                  <div>
                    <p className="font-medium">Servizio Email</p>
                    <p className="text-sm text-gray-600">{serviceStatus.smtp_host}</p>
                  </div>
                </div>
                {getStatusBadge(serviceStatus.email_configured, 'Email')}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-green-500" />
                  <div>
                    <p className="font-medium">Servizio SMS</p>
                    <p className="text-sm text-gray-600">Twilio</p>
                  </div>
                </div>
                {getStatusBadge(serviceStatus.sms_configured, 'SMS')}
              </div>

              {!serviceStatus.email_configured && !serviceStatus.sms_configured && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Configurazione Richiesta</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Per abilitare le notifiche, configura le credenziali nel file .env.local 
                        seguendo l'esempio in .env.local.example
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Verifica stato servizi...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impostazioni Notifiche */}
      <Card>
        <CardHeader>
          <CardTitle>Impostazioni Notifiche</CardTitle>
          <CardDescription>
            Configura quando e come ricevere le notifiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-enabled">Notifiche Email</Label>
                <p className="text-sm text-gray-600">Ricevi notifiche via email</p>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.emailEnabled}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, emailEnabled: checked })
                }
                disabled={!serviceStatus?.email_configured}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-enabled">Notifiche SMS</Label>
                <p className="text-sm text-gray-600">Ricevi notifiche via SMS</p>
              </div>
              <Switch
                id="sms-enabled"
                checked={settings.smsEnabled}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, smsEnabled: checked })
                }
                disabled={!serviceStatus?.sms_configured}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reminders">Promemoria Call</Label>
                <p className="text-sm text-gray-600">Notifiche per call programmate</p>
              </div>
              <Switch
                id="reminders"
                checked={settings.callReminders}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, callReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="overdue">Avvisi Ritardo</Label>
                <p className="text-sm text-gray-600">Notifiche per call in ritardo</p>
              </div>
              <Switch
                id="overdue"
                checked={settings.overdueAlerts}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, overdueAlerts: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Notifiche */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifiche</CardTitle>
          <CardDescription>
            Testa l'invio di notifiche per verificare la configurazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-email">Email per Test</Label>
              <input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@company.com"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Label htmlFor="test-phone">Telefono per Test</Label>
              <input
                id="test-phone"
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+393331234567"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => sendTestNotification('email')}
              disabled={testing || !serviceStatus?.email_configured}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {testing ? 'Invio...' : 'Test Email'}
            </Button>
            <Button
              onClick={() => sendTestNotification('sms')}
              disabled={testing || !serviceStatus?.sms_configured}
              variant="outline"
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {testing ? 'Invio...' : 'Test SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}