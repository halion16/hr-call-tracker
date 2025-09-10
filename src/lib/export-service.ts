import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Call, Employee } from '@/types';
import { formatDateTime } from '@/lib/utils';

export interface ExportOptions {
  includeFilters?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  format?: 'pdf' | 'excel';
  orientation?: 'portrait' | 'landscape';
  includeStats?: boolean;
}

interface ExportData {
  title: string;
  data: any[];
  columns: { key: string; label: string; width?: number }[];
  filters?: Record<string, any>;
  stats?: Record<string, any>;
}

export class ExportService {
  private static formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('it-IT');
  }

  private static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': 'Programmata',
      'completed': 'Completata',
      'cancelled': 'Annullata',
      'suspended': 'Sospesa',
      'rescheduled': 'Riprogrammata'
    };
    return statusMap[status] || status;
  }

  // Esportazione Call in PDF
  static async exportCallsToPDF(calls: Call[], employees: Employee[], options: ExportOptions = {}): Promise<void> {
    const pdf = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Setup PDF
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Report Call HR', margin, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, margin, yPosition);
    
    yPosition += 8;
    pdf.text(`Totale Call: ${calls.length}`, margin, yPosition);

    // Stats se richieste
    if (options.includeStats) {
      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Statistiche:', margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const completedCalls = calls.filter(c => c.status === 'completed').length;
      const scheduledCalls = calls.filter(c => c.status === 'scheduled').length;
      const suspendedCalls = calls.filter(c => c.status === 'suspended').length;
      
      pdf.text(`• Call Completate: ${completedCalls} (${((completedCalls/calls.length)*100).toFixed(1)}%)`, margin, yPosition);
      yPosition += 5;
      pdf.text(`• Call Programmate: ${scheduledCalls} (${((scheduledCalls/calls.length)*100).toFixed(1)}%)`, margin, yPosition);
      yPosition += 5;
      pdf.text(`• Call Sospese: ${suspendedCalls} (${((suspendedCalls/calls.length)*100).toFixed(1)}%)`, margin, yPosition);
    }

    // Tabella Call
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Elenco Call:', margin, yPosition);

    yPosition += 10;
    
    // Header tabella
    const colWidths = [45, 30, 35, 25, 30, 50];
    const headers = ['Dipendente', 'Data/Ora', 'Stato', 'Durata', 'Valutazione', 'Note'];
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    let xPosition = margin;
    headers.forEach((header, i) => {
      pdf.text(header, xPosition, yPosition);
      xPosition += colWidths[i];
    });

    // Linea sotto header
    yPosition += 2;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Dati call
    pdf.setFont('helvetica', 'normal');
    
    calls.forEach((call) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      const employee = employees.find(e => e.id === call.employeeId);
      const employeeName = employee ? `${employee.nome} ${employee.cognome}` : 'N/A';
      
      xPosition = margin;
      
      // Dipendente
      const truncatedName = employeeName.length > 20 ? employeeName.substring(0, 17) + '...' : employeeName;
      pdf.text(truncatedName, xPosition, yPosition);
      xPosition += colWidths[0];
      
      // Data/Ora
      pdf.text(this.formatDate(call.dataSchedulata), xPosition, yPosition);
      xPosition += colWidths[1];
      
      // Stato
      pdf.text(this.formatStatus(call.status), xPosition, yPosition);
      xPosition += colWidths[2];
      
      // Durata (se completata)
      const durata = call.status === 'completed' ? '45 min' : '-'; // Placeholder
      pdf.text(durata, xPosition, yPosition);
      xPosition += colWidths[3];
      
      // Valutazione (se completata)
      const valutazione = call.status === 'completed' ? '★★★★☆' : '-'; // Placeholder
      pdf.text(valutazione, xPosition, yPosition);
      xPosition += colWidths[4];
      
      // Note
      const notes = call.note ? (call.note.length > 25 ? call.note.substring(0, 22) + '...' : call.note) : '-';
      pdf.text(notes, xPosition, yPosition);
      
      yPosition += 6;
    });

    // Footer
    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Pagina ${i} di ${totalPages} - HR Call Tracker Report`,
        pageWidth - 60,
        pageHeight - 10
      );
    }

    // Download
    const filename = `report-call-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  }

  // Esportazione Dipendenti in PDF
  static async exportEmployeesToPDF(employees: Employee[], options: ExportOptions = {}): Promise<void> {
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Elenco Dipendenti', margin, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, margin, yPosition);
    
    yPosition += 8;
    pdf.text(`Totale Dipendenti: ${employees.length}`, margin, yPosition);

    // Stats per dipartimento
    if (options.includeStats) {
      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Distribuzione per Dipartimento:', margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const deptStats = employees.reduce((acc, emp) => {
        acc[emp.dipartimento] = (acc[emp.dipartimento] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(deptStats).forEach(([dept, count]) => {
        pdf.text(`• ${dept}: ${count} dipendenti`, margin, yPosition);
        yPosition += 5;
      });
    }

    // Lista dipendenti
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Elenco Completo:', margin, yPosition);

    yPosition += 10;

    employees.forEach((employee) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      // Box per ogni dipendente
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${employee.nome} ${employee.cognome}`, margin, yPosition);
      
      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Posizione: ${employee.posizione}`, margin + 5, yPosition);
      
      yPosition += 5;
      pdf.text(`Dipartimento: ${employee.dipartimento}`, margin + 5, yPosition);
      
      yPosition += 5;
      pdf.text(`Email: ${employee.email}`, margin + 5, yPosition);
      
      yPosition += 5;
      pdf.text(`Telefono: ${employee.telefono || 'N/A'}`, margin + 5, yPosition);
      
      yPosition += 10;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    });

    // Download
    const filename = `elenco-dipendenti-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  }

  // Esportazione Call in Excel
  static exportCallsToExcel(calls: Call[], employees: Employee[], options: ExportOptions = {}): void {
    const workbook = XLSX.utils.book_new();

    // Foglio 1: Dati Call
    const callsData = calls.map(call => {
      const employee = employees.find(e => e.id === call.employeeId);
      return {
        'ID Call': call.id,
        'Dipendente': employee ? `${employee.nome} ${employee.cognome}` : 'N/A',
        'Email Dipendente': employee?.email || 'N/A',
        'Dipartimento': employee?.dipartimento || 'N/A',
        'Posizione': employee?.posizione || 'N/A',
        'Data Programmata': this.formatDate(call.dataSchedulata),
        'Stato': this.formatStatus(call.status),
        'Note': call.note || '',
        'Data Creazione': this.formatDate(call.createdAt || ''),
        'Data Ultima Modifica': this.formatDate(call.updatedAt || '')
      };
    });

    const wsCall = XLSX.utils.json_to_sheet(callsData);
    
    // Impostiamo larghezza colonne
    const colWidths = [
      { wch: 15 }, // ID Call
      { wch: 25 }, // Dipendente
      { wch: 30 }, // Email
      { wch: 20 }, // Dipartimento
      { wch: 20 }, // Posizione
      { wch: 15 }, // Data
      { wch: 15 }, // Stato
      { wch: 30 }, // Note
      { wch: 15 }, // Creazione
      { wch: 15 }  // Modifica
    ];
    wsCall['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, wsCall, 'Call');

    // Foglio 2: Statistiche
    if (options.includeStats) {
      const statsData = [
        { Metrica: 'Totale Call', Valore: calls.length },
        { Metrica: 'Call Completate', Valore: calls.filter(c => c.status === 'completed').length },
        { Metrica: 'Call Programmate', Valore: calls.filter(c => c.status === 'scheduled').length },
        { Metrica: 'Call Sospese', Valore: calls.filter(c => c.status === 'suspended').length },
        { Metrica: 'Call Annullate', Valore: calls.filter(c => c.status === 'cancelled').length }
      ];

      const wsStats = XLSX.utils.json_to_sheet(statsData);
      wsStats['!cols'] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsStats, 'Statistiche');
    }

    // Foglio 3: Dipendenti
    const employeesData = employees.map(emp => ({
      'ID': emp.id,
      'Nome': emp.nome,
      'Cognome': emp.cognome,
      'Email': emp.email,
      'Telefono': emp.telefono || '',
      'Posizione': emp.posizione,
      'Dipartimento': emp.dipartimento,
      'Data Assunzione': emp.dataAssunzione ? this.formatDate(emp.dataAssunzione) : '',
      'Call Totali': calls.filter(c => c.employeeId === emp.id).length,
      'Call Completate': calls.filter(c => c.employeeId === emp.id && c.status === 'completed').length
    }));

    const wsEmp = XLSX.utils.json_to_sheet(employeesData);
    wsEmp['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsEmp, 'Dipendenti');

    // Download
    const filename = `report-completo-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  // Esportazione Dipendenti in Excel
  static exportEmployeesToExcel(employees: Employee[], options: ExportOptions = {}): void {
    const workbook = XLSX.utils.book_new();

    // Dati dipendenti
    const employeesData = employees.map(emp => ({
      'ID': emp.id,
      'Nome Completo': `${emp.nome} ${emp.cognome}`,
      'Nome': emp.nome,
      'Cognome': emp.cognome,
      'Email': emp.email,
      'Telefono': emp.telefono || '',
      'Posizione': emp.posizione,
      'Dipartimento': emp.dipartimento,
      'Data Assunzione': emp.dataAssunzione ? this.formatDate(emp.dataAssunzione) : '',
      'Stato': 'Attivo' // Default
    }));

    const ws = XLSX.utils.json_to_sheet(employeesData);
    
    // Larghezza colonne
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(workbook, ws, 'Dipendenti');

    // Statistiche per dipartimento
    if (options.includeStats) {
      const deptStats = employees.reduce((acc, emp) => {
        acc[emp.dipartimento] = (acc[emp.dipartimento] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statsData = Object.entries(deptStats).map(([dept, count]) => ({
        Dipartimento: dept,
        'Numero Dipendenti': count,
        'Percentuale': `${((count / employees.length) * 100).toFixed(1)}%`
      }));

      const wsStats = XLSX.utils.json_to_sheet(statsData);
      wsStats['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsStats, 'Statistiche Dipartimenti');
    }

    // Download
    const filename = `dipendenti-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }
}