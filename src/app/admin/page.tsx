'use client';

import { useEffect, useState } from 'react';
import { Shield, FileText, Activity, Clock, Eye, Download, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocalStorage } from '@/lib/storage';
import { CalendarIntegration } from '@/lib/audit';
import { CallTemplate, AuditLog, Call, Employee } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const [templates, setTemplates] = useState<CallTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'audit'>('templates');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTemplates(LocalStorage.getCallTemplates());
    setAuditLogs(LocalStorage.getAuditLogs(50));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'onboarding': 'bg-green-100 text-green-800',
      'performance': 'bg-blue-100 text-blue-800',
      'feedback': 'bg-purple-100 text-purple-800',
      'development': 'bg-indigo-100 text-indigo-800',
      'exit': 'bg-red-100 text-red-800',
      'check-in': 'bg-yellow-100 text-yellow-800',
      'disciplinary': 'bg-orange-100 text-orange-800',
      'promotion': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'onboarding': 'Onboarding',
      'performance': 'Performance',
      'feedback': 'Feedback',
      'development': 'Sviluppo',
      'exit': 'Uscita',
      'check-in': 'Check-in',
      'disciplinary': 'Disciplinare',
      'promotion': 'Promozione'
    };
    return labels[category] || category;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'call_scheduled': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'call_completed': return <FileText className="w-4 h-4 text-green-600" />;
      case 'call_cancelled': return <Activity className="w-4 h-4 text-red-600" />;
      case 'employee_sync': return <Activity className="w-4 h-4 text-purple-600" />;
      case 'template_used': return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'bulk_call_scheduled': return <Calendar className="w-4 h-4 text-orange-600" />;
      case 'settings_changed': return <Activity className="w-4 h-4 text-gray-600" />;
      case 'user_login': return <Shield className="w-4 h-4 text-green-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'call_scheduled': 'Call Programmata',
      'call_completed': 'Call Completata', 
      'call_cancelled': 'Call Cancellata',
      'employee_sync': 'Sync Dipendenti',
      'template_used': 'Template Utilizzato',
      'bulk_call_scheduled': 'Call di Massa',
      'settings_changed': 'Impostazioni',
      'user_login': 'Login Utente'
    };
    return labels[action] || action;
  };

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Utente', 'Azione', 'Entità', 'Dettagli'],
      ...auditLogs.map(log => [
        new Date(log.timestamp).toLocaleString('it-IT'),
        log.userId,
        getActionLabel(log.action),
        log.entity,
        log.details
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Amministrazione</h1>
          <p className="text-gray-600">
            Gestione template chiamate e audit log del sistema
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            Template Chiamate
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-4 h-4 inline-block mr-2" />
            Audit Log
          </button>
        </nav>
      </div>

      {/* Template Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Template Chiamate</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryLabel(template.category)}
                        </Badge>
                        {template.isActive ? (
                          <Badge variant="default">Attivo</Badge>
                        ) : (
                          <Badge variant="secondary">Disattivo</Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Durata: {template.defaultDuration} min</div>
                      <div>Creato: {formatDate(template.createdAt)}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Domande Suggerite */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Domande Suggerite:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {template.suggestedQuestions.slice(0, 3).map((question, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {question}
                          </li>
                        ))}
                        {template.suggestedQuestions.length > 3 && (
                          <li className="text-gray-400 italic">
                            ... e altre {template.suggestedQuestions.length - 3} domande
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Follow-up Recommendations */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Raccomandazioni Follow-up:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="bg-green-50 p-2 rounded">
                          <div className="font-medium text-green-800">Positivo</div>
                          <div className="text-green-600">{template.followUpRecommendations.positive.days} giorni</div>
                        </div>
                        <div className="bg-yellow-50 p-2 rounded">
                          <div className="font-medium text-yellow-800">Neutro</div>
                          <div className="text-yellow-600">{template.followUpRecommendations.neutral.days} giorni</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <div className="font-medium text-red-800">Negativo</div>
                          <div className="text-red-600">{template.followUpRecommendations.negative.days} giorni</div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded">
                          <div className="font-medium text-orange-800">Follow-up</div>
                          <div className="text-orange-600">{template.followUpRecommendations.followUpNeeded.days} giorni</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-2 border-t">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizza
                      </Button>
                      <Button variant="outline" size="sm">
                        Modifica
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Audit Log</h2>
            <Button onClick={exportAuditLog}>
              <Download className="w-4 h-4 mr-2" />
              Esporta CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azione
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dettagli
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {new Date(log.timestamp).toLocaleDateString('it-IT')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString('it-IT')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getActionIcon(log.action)}
                            <span className="ml-2 text-sm text-gray-900">
                              {getActionLabel(log.action)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={log.details}>
                            {log.details}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Badge variant="outline">{log.userId}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {auditLogs.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Nessun log di audit trovato.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}