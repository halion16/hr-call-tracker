import { Call, CallModification } from '@/types';
import { LocalStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export class CallTrackingService {
  /**
   * Tracks a modification to a call
   */
  static trackModification(
    callId: string,
    action: CallModification['action'],
    previousData?: Partial<Call>,
    newData?: Partial<Call>,
    reason?: string
  ): void {
    const modification: CallModification = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      previousData,
      newData,
      reason,
      userId: LocalStorage.getUser()?.id
    };

    // Get current call
    const calls = LocalStorage.getCalls();
    const callIndex = calls.findIndex(call => call.id === callId);
    
    if (callIndex !== -1) {
      const call = calls[callIndex];
      if (!call.modifications) {
        call.modifications = [];
      }
      call.modifications.push(modification);
      
      LocalStorage.setCalls(calls);
    }
  }

  /**
   * Gets all modifications for a specific call
   */
  static getCallModifications(callId: string): CallModification[] {
    const calls = LocalStorage.getCalls();
    const call = calls.find(c => c.id === callId);
    return call?.modifications || [];
  }

  /**
   * Gets recent modifications across all calls
   */
  static getRecentModifications(limit: number = 10): Array<CallModification & { callId: string; employeeName: string }> {
    const calls = LocalStorage.getCalls();
    const employees = LocalStorage.getEmployees();
    const allModifications: Array<CallModification & { callId: string; employeeName: string }> = [];

    calls.forEach(call => {
      if (call.modifications) {
        const employee = employees.find(emp => emp.id === call.employeeId);
        const employeeName = employee ? `${employee.nome} ${employee.cognome}` : 'Dipendente sconosciuto';
        
        call.modifications.forEach(modification => {
          allModifications.push({
            ...modification,
            callId: call.id,
            employeeName
          });
        });
      }
    });

    // Sort by timestamp (most recent first) and limit
    return allModifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Gets modification statistics
   */
  static getModificationStats(): {
    totalModifications: number;
    byAction: Record<CallModification['action'], number>;
    todayModifications: number;
  } {
    const calls = LocalStorage.getCalls();
    const today = new Date().toDateString();
    let totalModifications = 0;
    let todayModifications = 0;
    const byAction: Record<CallModification['action'], number> = {
      created: 0,
      rescheduled: 0,
      suspended: 0,
      resumed: 0,
      completed: 0,
      cancelled: 0,
      deleted: 0
    };

    calls.forEach(call => {
      if (call.modifications) {
        totalModifications += call.modifications.length;
        
        call.modifications.forEach(modification => {
          byAction[modification.action]++;
          
          const modificationDate = new Date(modification.timestamp).toDateString();
          if (modificationDate === today) {
            todayModifications++;
          }
        });
      }
    });

    return {
      totalModifications,
      byAction,
      todayModifications
    };
  }

  /**
   * Creates a human-readable description of a modification
   */
  static getModificationDescription(modification: CallModification): string {
    const time = new Date(modification.timestamp).toLocaleString('it-IT');
    
    switch (modification.action) {
      case 'created':
        return `Call creata il ${time}`;
      case 'rescheduled':
        const oldDate = modification.previousData?.dataSchedulata 
          ? new Date(modification.previousData.dataSchedulata).toLocaleString('it-IT')
          : '';
        const newDate = modification.newData?.dataSchedulata 
          ? new Date(modification.newData.dataSchedulata).toLocaleString('it-IT')
          : '';
        return `Riprogrammata il ${time}${oldDate && newDate ? ` da ${oldDate} a ${newDate}` : ''}`;
      case 'suspended':
        return `Sospesa il ${time}${modification.reason ? ` - ${modification.reason}` : ''}`;
      case 'resumed':
        return `Riattivata il ${time}`;
      case 'completed':
        const rating = modification.newData?.rating;
        return `Completata il ${time}${rating ? ` con valutazione ${rating}/5` : ''}`;
      case 'cancelled':
        return `Annullata il ${time}${modification.reason ? ` - ${modification.reason}` : ''}`;
      case 'deleted':
        return `Eliminata il ${time}`;
      default:
        return `Modificata il ${time}`;
    }
  }
}