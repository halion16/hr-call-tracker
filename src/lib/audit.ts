import { LocalStorage } from './storage';
import { AuditLog, Call, Employee, CallTemplate } from '@/types';

// User identifier - in una vera app sarebbe dall'autenticazione
const getCurrentUserId = (): string => {
  const user = LocalStorage.getUser();
  return user?.id || 'hr_user_default';
};

export class AuditLogger {
  static logEmployeeSync(count: number, newCount: number, updatedCount: number): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'employee_sync',
      entity: 'employee',
      details: `Sincronizzazione dipendenti completata: ${count} totali, ${newCount} nuovi, ${updatedCount} aggiornati`,
      metadata: { total: count, new: newCount, updated: updatedCount }
    });
  }

  static logCallScheduled(call: Call, employee: Employee, templateId?: string): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'call_scheduled',
      entity: 'call',
      entityId: call.id,
      details: `Chiamata schedulata con ${employee.nome} ${employee.cognome} per ${new Date(call.dataSchedulata).toLocaleString('it-IT')}`,
      metadata: { 
        employeeId: employee.id, 
        employeeName: `${employee.nome} ${employee.cognome}`,
        templateId,
        scheduledDate: call.dataSchedulata 
      }
    });
  }

  static logCallCompleted(call: Call, employee: Employee): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'call_completed',
      entity: 'call',
      entityId: call.id,
      details: `Chiamata completata con ${employee.nome} ${employee.cognome}. Outcome: ${call.outcome || 'Non specificato'}. Rating: ${call.rating || 'N/A'}/5`,
      metadata: { 
        employeeId: employee.id,
        employeeName: `${employee.nome} ${employee.cognome}`,
        outcome: call.outcome,
        rating: call.rating,
        duration: call.durata 
      }
    });
  }

  static logCallCancelled(callId: string, employee: Employee, reason?: string): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'call_cancelled',
      entity: 'call',
      entityId: callId,
      details: `Chiamata cancellata con ${employee.nome} ${employee.cognome}${reason ? `. Motivo: ${reason}` : ''}`,
      metadata: { 
        employeeId: employee.id,
        employeeName: `${employee.nome} ${employee.cognome}`,
        reason 
      }
    });
  }

  static logBulkCallScheduling(employeeIds: string[], count: number): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'bulk_call_scheduled',
      entity: 'call',
      details: `Chiamate di massa schedulate per ${count} dipendenti`,
      metadata: { employeeIds, count }
    });
  }

  static logTemplateUsed(templateId: string, templateName: string): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'template_used',
      entity: 'template',
      entityId: templateId,
      details: `Utilizzato template: ${templateName}`,
      metadata: { templateId, templateName }
    });
  }

  static logSettingsChange(setting: string, oldValue: any, newValue: any): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'settings_changed',
      entity: 'settings',
      details: `Impostazione "${setting}" cambiata`,
      metadata: { setting, oldValue, newValue }
    });
  }

  static logUserLogin(): void {
    LocalStorage.addAuditLog({
      userId: getCurrentUserId(),
      action: 'user_login',
      entity: 'employee',
      details: 'Utente ha effettuato l\'accesso al sistema',
      metadata: { loginTime: new Date().toISOString() }
    });
  }
}

export class FollowUpManager {
  static suggestFollowUp(call: Call, template?: CallTemplate): { date: Date; note: string } | null {
    if (!call.outcome || !template?.followUpRecommendations) {
      return null;
    }

    const recommendation = template.followUpRecommendations[call.outcome];
    if (!recommendation) return null;

    const followUpDate = new Date(call.dataCompletata || call.dataSchedulata);
    followUpDate.setDate(followUpDate.getDate() + recommendation.days);

    return {
      date: followUpDate,
      note: recommendation.note
    };
  }

  static getUpcomingFollowUps(): Array<{
    call: Call;
    employee: Employee;
    template?: CallTemplate;
    suggestedDate: Date;
    suggestedNote: string;
    daysUntil: number;
  }> {
    const calls = LocalStorage.getCalls().filter(c => c.status === 'completed' && c.outcome);
    const employees = LocalStorage.getEmployees();
    const templates = LocalStorage.getCallTemplates();
    const now = new Date();
    
    const suggestions: Array<{
      call: Call;
      employee: Employee;
      template?: CallTemplate;
      suggestedDate: Date;
      suggestedNote: string;
      daysUntil: number;
    }> = [];

    calls.forEach(call => {
      const employee = employees.find(e => e.id === call.employeeId);
      if (!employee) return;

      // Cerca se esiste già una call programmata per questo dipendente
      const hasScheduledCall = calls.some(c => 
        c.employeeId === call.employeeId && 
        c.status === 'scheduled' && 
        new Date(c.dataSchedulata) > new Date(call.dataCompletata || call.dataSchedulata)
      );

      if (hasScheduledCall) return; // Skip se c'è già una call programmata

      // Trova template utilizzato (se disponibile nei metadata)
      const template = templates.find(t => t.id === (call as any).templateId);
      
      if (template && call.outcome) {
        const followUp = this.suggestFollowUp(call, template);
        if (followUp) {
          const daysUntil = Math.ceil((followUp.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Solo suggerimenti per i prossimi 30 giorni
          if (daysUntil >= -7 && daysUntil <= 30) {
            suggestions.push({
              call,
              employee,
              template,
              suggestedDate: followUp.date,
              suggestedNote: followUp.note,
              daysUntil
            });
          }
        }
      }
    });

    return suggestions.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  static createFollowUpCall(originalCall: Call, employee: Employee, template?: CallTemplate): Call | null {
    const followUp = this.suggestFollowUp(originalCall, template);
    if (!followUp) return null;

    const newCall: Call = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: employee.id,
      dataSchedulata: followUp.date.toISOString(),
      note: `Follow-up: ${followUp.note}\n\nCall precedente: ${new Date(originalCall.dataSchedulata).toLocaleDateString('it-IT')} - Outcome: ${originalCall.outcome}`,
      status: 'scheduled',
      outcome: undefined,
      outcomeNotes: undefined,
      tags: ['follow-up'],
      createdBy: getCurrentUserId(),
      updatedAt: new Date().toISOString()
    };

    return newCall;
  }
}

export class CalendarIntegration {
  // Genera URL per Google Calendar
  static generateGoogleCalendarUrl(call: Call, employee: Employee, template?: CallTemplate): string {
    const startDate = new Date(call.dataSchedulata);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (template?.defaultDuration || 30));

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Call HR - ${employee.nome} ${employee.cognome}${template ? ` (${template.name})` : ''}`,
      dates: `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      details: [
        `Chiamata HR con ${employee.nome} ${employee.cognome}`,
        `Email: ${employee.email}`,
        `Posizione: ${employee.posizione}`,
        `Dipartimento: ${employee.dipartimento}`,
        template ? `\nTemplate: ${template.name}` : '',
        template ? `Descrizione: ${template.description}` : '',
        call.note ? `\nNote: ${call.note}` : '',
        template?.suggestedQuestions.length ? `\nDomande suggerite:\n${template.suggestedQuestions.map(q => `• ${q}`).join('\n')}` : ''
      ].filter(Boolean).join('\n'),
      location: 'Chiamata telefonica'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // Genera file ICS per Outlook
  static generateICSFile(call: Call, employee: Employee, template?: CallTemplate): string {
    const startDate = new Date(call.dataSchedulata);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (template?.defaultDuration || 30));

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const description = [
      `Chiamata HR con ${employee.nome} ${employee.cognome}`,
      `Email: ${employee.email}`,
      `Posizione: ${employee.posizione}`,
      `Dipartimento: ${employee.dipartimento}`,
      template ? `\\n\\nTemplate: ${template.name}` : '',
      template ? `Descrizione: ${template.description}` : '',
      call.note ? `\\n\\nNote: ${call.note}` : '',
      template?.suggestedQuestions.length ? `\\n\\nDomande suggerite:\\n${template.suggestedQuestions.map(q => `• ${q}`).join('\\n')}` : ''
    ].filter(Boolean).join('\\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HR Call Tracker//HR Call Tracker//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:hr-call-${call.id}@hr-tracker.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Call HR - ${employee.nome} ${employee.cognome}${template ? ` (${template.name})` : ''}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Chiamata telefonica',
      `DTSTAMP:${formatDate(new Date())}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\\r\\n');

    return ics;
  }

  // Scarica file ICS
  static downloadICSFile(call: Call, employee: Employee, template?: CallTemplate): void {
    const icsContent = this.generateICSFile(call, employee, template);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `call-hr-${employee.nome}-${employee.cognome}-${new Date(call.dataSchedulata).toISOString().split('T')[0]}.ics`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }
}