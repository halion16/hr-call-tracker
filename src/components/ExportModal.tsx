'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ExportService, ExportOptions } from '@/lib/export-service';
import { Call, Employee } from '@/types';
import { callToasts } from '@/lib/toast';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  Calendar,
  BarChart3,
  X,
  CheckCircle
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    calls?: Call[];
    employees?: Employee[];
  };
  type: 'calls' | 'employees' | 'both';
  title?: string;
}

export function ExportModal({ isOpen, onClose, data, type, title }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');
  const [includeStats, setIncludeStats] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: selectedFormat,
        orientation,
        includeStats
      };

      if (type === 'calls' && data.calls && data.employees) {
        if (selectedFormat === 'pdf') {
          await ExportService.exportCallsToPDF(data.calls, data.employees, options);
        } else {
          ExportService.exportCallsToExcel(data.calls, data.employees, options);
        }
        
        callToasts.info(
          'Export completato!',
          `${data.calls.length} call esportate in formato ${selectedFormat.toUpperCase()}`
        );
      } 
      else if (type === 'employees' && data.employees) {
        if (selectedFormat === 'pdf') {
          await ExportService.exportEmployeesToPDF(data.employees, options);
        } else {
          ExportService.exportEmployeesToExcel(data.employees, options);
        }
        
        callToasts.info(
          'Export completato!',
          `${data.employees.length} dipendenti esportati in formato ${selectedFormat.toUpperCase()}`
        );
      }
      else if (type === 'both' && data.calls && data.employees) {
        // Export completo - solo Excel supporta fogli multipli facilmente
        if (selectedFormat === 'excel') {
          ExportService.exportCallsToExcel(data.calls, data.employees, options);
        } else {
          // Per PDF, creiamo due file separati
          await ExportService.exportCallsToPDF(data.calls, data.employees, options);
          await ExportService.exportEmployeesToPDF(data.employees, options);
        }
        
        callToasts.info(
          'Export completo completato!',
          `Dati completi esportati in formato ${selectedFormat.toUpperCase()}`
        );
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Errore durante export:', error);
      callToasts.error(
        'Errore durante l\'export',
        'Si è verificato un errore durante l\'esportazione dei dati'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getDataCount = () => {
    if (type === 'calls') return data.calls?.length || 0;
    if (type === 'employees') return data.employees?.length || 0;
    return (data.calls?.length || 0) + (data.employees?.length || 0);
  };

  const getDataLabel = () => {
    if (type === 'calls') return 'call';
    if (type === 'employees') return 'dipendenti';
    return 'record totali';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 fade-in">
      <Card className="w-full max-w-2xl mx-4 modal-content">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {title || 'Esporta Dati'}
              </CardTitle>
              <CardDescription>
                Esporta {getDataCount()} {getDataLabel()} in formato PDF o Excel
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {exportSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Export completato con successo!
              </h3>
              <p className="text-sm text-gray-600">
                Il file è stato scaricato automaticamente
              </p>
            </div>
          ) : (
            <>
              {/* Formato Export */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Formato di Export</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedFormat('pdf')}
                    className={`p-4 border rounded-lg text-left transition-all hover:border-blue-300 ${
                      selectedFormat === 'pdf' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div>
                        <div className="font-medium">PDF</div>
                        <div className="text-xs text-gray-500">
                          Formato stampabile
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedFormat('excel')}
                    className={`p-4 border rounded-lg text-left transition-all hover:border-blue-300 ${
                      selectedFormat === 'excel' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-500" />
                      <div>
                        <div className="font-medium">Excel</div>
                        <div className="text-xs text-gray-500">
                          Dati modificabili
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Opzioni PDF */}
              {selectedFormat === 'pdf' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Orientamento Pagina</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        orientation === 'portrait' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">Verticale</div>
                      <div className="text-xs text-gray-500 mt-1">Più colonne per riga</div>
                    </button>
                    
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        orientation === 'landscape' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">Orizzontale</div>
                      <div className="text-xs text-gray-500 mt-1">Raccomandato per tabelle</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Opzioni Contenuto */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Contenuto Export</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStats}
                      onChange={(e) => setIncludeStats(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Includi statistiche e metriche</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info Anteprima */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Anteprima Export:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Formato: {selectedFormat.toUpperCase()}</div>
                  {selectedFormat === 'pdf' && (
                    <div>• Orientamento: {orientation === 'portrait' ? 'Verticale' : 'Orizzontale'}</div>
                  )}
                  <div>• Record da esportare: {getDataCount()}</div>
                  <div>• Statistiche: {includeStats ? 'Incluse' : 'Non incluse'}</div>
                  {type === 'both' && selectedFormat === 'excel' && (
                    <div>• Fogli Excel: Calls, Dipendenti, Statistiche</div>
                  )}
                </div>
              </div>

              {/* Azioni */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isExporting}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting || getDataCount() === 0}
                  className="btn-primary scale-hover"
                >
                  {isExporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Esportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Esporta {selectedFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}