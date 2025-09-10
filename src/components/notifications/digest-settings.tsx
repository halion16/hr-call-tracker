'use client';

import { useState, useEffect } from 'react';
import { Mail, Clock, Users, BarChart3, TrendingUp, Calendar, Send, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DigestService, DigestSettings } from '@/lib/digest-service';
import { toast } from 'sonner';

export function DigestSettingsComponent() {
  const [settings, setSettings] = useState<DigestSettings>({
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    recipients: [],
    includeStats: true,
    includeTopEmployees: true,
    includeAlerts: true,
    includeUpcoming: true,
    includeTrends: false
  });

  const [newRecipient, setNewRecipient] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const currentSettings = DigestService.getSettings();
    setSettings(currentSettings);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      DigestService.saveSettings(settings);
      toast.success('Impostazioni digest salvate!', {
        description: settings.enabled ? 
          `Digest ${settings.frequency} programmato alle ${settings.time}` :
          'Digest disabilitati'
      });
    } catch (error) {
      console.error('Error saving digest settings:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (!newRecipient.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipient)) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }

    if (settings.recipients.includes(newRecipient)) {
      toast.error('Email già presente nella lista');
      return;
    }

    setSettings({
      ...settings,
      recipients: [...settings.recipients, newRecipient]
    });
    setNewRecipient('');
  };

  const removeRecipient = (email: string) => {
    setSettings({
      ...settings,
      recipients: settings.recipients.filter(r => r !== email)
    });
  };

  const sendTestDigest = async (type: 'daily' | 'weekly') => {
    setSendingTest(true);
    try {
      const digestData = await DigestService.sendTestDigest(type);
      toast.success(`Test digest ${type} inviato!`, {
        description: 'Controlla le notifiche per vedere il risultato',
        action: {
          label: 'Anteprima',
          onClick: () => {
            setPreviewData(digestData);
            setShowPreview(true);
          }
        }
      });
    } catch (error) {
      console.error('Error sending test digest:', error);
      toast.error('Errore durante l\'invio del test digest');
    } finally {
      setSendingTest(false);
    }
  };

  const generatePreview = async () => {
    try {
      const digestData = settings.frequency === 'daily' ? 
        DigestService.generateDailyDigest() : 
        DigestService.generateWeeklyDigest();
      
      setPreviewData(digestData);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Errore durante la generazione dell\'anteprima');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Digest Periodici</h2>
          <p className="text-gray-600">Configura riepiloghi automatici per i manager</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={generatePreview} size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Anteprima
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Salvando...' : 'Salva Impostazioni'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Configurazione Base
            </CardTitle>
            <CardDescription>
              Impostazioni generali per i digest periodici
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Digest attivi</Label>
                <p className="text-xs text-gray-600">
                  {settings.enabled ? 
                    `Digest ${settings.frequency} alle ${settings.time}` : 
                    'Digest disabilitati'
                  }
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
            </div>

            {settings.enabled && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Frequenza</Label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSettings({ ...settings, frequency: 'daily' })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        settings.frequency === 'daily'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Clock className="h-4 w-4 mx-auto mb-1" />
                      Giornaliero
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, frequency: 'weekly' })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        settings.frequency === 'weekly'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Calendar className="h-4 w-4 mx-auto mb-1" />
                      Settimanale
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digest-time" className="text-sm font-medium">
                    Orario invio
                  </Label>
                  <Input
                    id="digest-time"
                    type="time"
                    value={settings.time}
                    onChange={(e) => setSettings({ ...settings, time: e.target.value })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-600">
                    I digest saranno inviati ogni {settings.frequency === 'daily' ? 'giorno' : 'lunedì'} alle {settings.time}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Destinatari
            </CardTitle>
            <CardDescription>
              Manager che riceveranno i digest (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600">
                📧 <strong>Invio Email in sviluppo</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Al momento i digest vengono mostrati come notifiche browser. 
                L'invio via email sarà disponibile nella prossima versione.
              </p>
            </div>

            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="manager@azienda.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                disabled
              />
              <Button onClick={addRecipient} size="sm" disabled>
                Aggiungi
              </Button>
            </div>

            {settings.recipients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Destinatari configurati:</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs">
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Contenuto Digest
            </CardTitle>
            <CardDescription>
              Seleziona le informazioni da includere
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">📊 Statistiche</Label>
                  <p className="text-xs text-gray-600">Call completate, tasso successo, ecc.</p>
                </div>
                <Switch
                  checked={settings.includeStats}
                  onCheckedChange={(includeStats) => setSettings({ ...settings, includeStats })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">🏆 Top Dipendenti</Label>
                  <p className="text-xs text-gray-600">I 5 dipendenti più attivi</p>
                </div>
                <Switch
                  checked={settings.includeTopEmployees}
                  onCheckedChange={(includeTopEmployees) => setSettings({ ...settings, includeTopEmployees })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">⚠️ Alert</Label>
                  <p className="text-xs text-gray-600">Call in ritardo e problemi</p>
                </div>
                <Switch
                  checked={settings.includeAlerts}
                  onCheckedChange={(includeAlerts) => setSettings({ ...settings, includeAlerts })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">📅 Prossime Call</Label>
                  <p className="text-xs text-gray-600">Call programmate nei prossimi 7 giorni</p>
                </div>
                <Switch
                  checked={settings.includeUpcoming}
                  onCheckedChange={(includeUpcoming) => setSettings({ ...settings, includeUpcoming })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">📈 Trend</Label>
                  <p className="text-xs text-gray-600">Analisi trend e previsioni (Coming soon)</p>
                </div>
                <Switch
                  checked={settings.includeTrends}
                  onCheckedChange={(includeTrends) => setSettings({ ...settings, includeTrends })}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test & Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Test e Anteprima
            </CardTitle>
            <CardDescription>
              Testa i digest prima dell'attivazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => sendTestDigest('daily')}
                disabled={sendingTest}
                className="h-auto py-3 px-4"
              >
                <div className="text-center w-full">
                  <Clock className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs">Test Giornaliero</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => sendTestDigest('weekly')}
                disabled={sendingTest}
                className="h-auto py-3 px-4"
              >
                <div className="text-center w-full">
                  <Calendar className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs">Test Settimanale</div>
                </div>
              </Button>
            </div>

            <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded">
              <p><strong>Come testare:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Clicca "Test Giornaliero/Settimanale"</li>
                <li>Verrà creata una notifica browser</li>
                <li>Controlla il contenuto del digest</li>
                <li>Regola le impostazioni se necessario</li>
              </ul>
            </div>

            {settings.enabled && (
              <div className="text-xs text-green-600 p-3 bg-green-50 rounded border border-green-200">
                <p><strong>✅ Digest Attivi</strong></p>
                <p>
                  Prossimo digest {settings.frequency}: {' '}
                  {settings.frequency === 'daily' ? 'domani' : 'lunedì'} alle {settings.time}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal/Card */}
      {showPreview && previewData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Anteprima Digest - {previewData.period}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPreview(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.includeStats && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">📊 Statistiche</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded">
                      <div className="font-semibold">{previewData.stats.totalCalls}</div>
                      <div className="text-gray-600">Call Totali</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="font-semibold text-green-600">{previewData.stats.completedCalls}</div>
                      <div className="text-gray-600">Completate</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="font-semibold text-yellow-600">{previewData.stats.pendingCalls}</div>
                      <div className="text-gray-600">Pendenti</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="font-semibold text-red-600">{previewData.stats.overdueCalls}</div>
                      <div className="text-gray-600">In Ritardo</div>
                    </div>
                  </div>
                </div>
              )}

              {settings.includeTopEmployees && previewData.topEmployees.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">🏆 Top Dipendenti</h4>
                  <div className="space-y-1">
                    {previewData.topEmployees.slice(0, 3).map((emp: any, idx: number) => (
                      <div key={emp.employee.id} className="flex justify-between bg-white p-2 rounded text-xs">
                        <span>{idx + 1}. {emp.employee.nome} {emp.employee.cognome}</span>
                        <span>{emp.callsCount} call ({emp.completionRate}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.includeAlerts && previewData.alerts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">⚠️ Alert</h4>
                  <div className="space-y-1">
                    {previewData.alerts.map((alert: any, idx: number) => (
                      <div key={idx} className="bg-red-50 p-2 rounded text-xs text-red-700">
                        {alert.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.includeUpcoming && previewData.upcomingCalls.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">📅 Prossime Call</h4>
                  <div className="space-y-1">
                    {previewData.upcomingCalls.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between bg-white p-2 rounded text-xs">
                        <span>{item.employee.nome} {item.employee.cognome}</span>
                        <span>tra {Math.floor(item.hoursUntil / 24)}g {item.hoursUntil % 24}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}