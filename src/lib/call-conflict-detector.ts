import { Call } from '@/types';
import { LocalStorage } from './storage';

/**
 * Servizio per rilevare e risolvere conflitti di orario nelle call
 */
export class CallConflictDetector {
  private static readonly MIN_GAP_MINUTES = 25; // Distanza minima tra call
  private static readonly CALL_DURATION_MINUTES = 30; // Durata standard di una call
  private static readonly BUSINESS_HOURS = {
    start: 9, // 9:00 AM
    end: 18   // 6:00 PM
  };

  /**
   * Trova il primo slot disponibile per una call a partire dalla data suggerita
   */
  static findAvailableTimeSlot(suggestedDate: Date, excludeCallId?: string): Date {
    const allCalls = LocalStorage.getCalls();

    // Filtra call del giorno suggerito (escludendo eventuali call da ignorare)
    const dayStart = new Date(suggestedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(suggestedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const daysCalls = allCalls
      .filter(call => {
        if (excludeCallId && call.id === excludeCallId) return false;
        if (call.status === 'cancelled') return false;

        const callDate = new Date(call.dataSchedulata);
        return callDate >= dayStart && callDate <= dayEnd;
      })
      .sort((a, b) => new Date(a.dataSchedulata).getTime() - new Date(b.dataSchedulata).getTime());

    console.log(`🔍 Checking conflicts for ${suggestedDate.toISOString()}`);
    console.log(`📅 Found ${daysCalls.length} existing calls on this day`);

    // Se non ci sono call nel giorno, usa l'orario suggerito o un orario di default
    if (daysCalls.length === 0) {
      const availableTime = this.getDefaultTimeSlot(suggestedDate);
      console.log(`✅ No conflicts found, using time: ${availableTime.toLocaleString()}`);
      return availableTime;
    }

    // Cerca il primo slot libero
    const businessStart = new Date(suggestedDate);
    businessStart.setHours(this.BUSINESS_HOURS.start, 0, 0, 0);

    let candidateTime = new Date(businessStart);

    // Se la data suggerita ha già un orario specifico e è nell'orario lavorativo, parti da lì
    if (suggestedDate.getHours() >= this.BUSINESS_HOURS.start &&
        suggestedDate.getHours() < this.BUSINESS_HOURS.end) {
      candidateTime = new Date(suggestedDate);
    }

    for (let attempt = 0; attempt < 50; attempt++) { // Max 50 tentativi
      if (this.isTimeSlotAvailable(candidateTime, daysCalls)) {
        console.log(`✅ Available slot found: ${candidateTime.toLocaleString()} (attempt ${attempt + 1})`);
        return candidateTime;
      }

      // Prova il prossimo slot (aggiungi 25 minuti)
      candidateTime = new Date(candidateTime.getTime() + this.MIN_GAP_MINUTES * 60 * 1000);

      // Se siamo fuori dall'orario lavorativo, prova il giorno successivo
      if (candidateTime.getHours() >= this.BUSINESS_HOURS.end) {
        candidateTime.setDate(candidateTime.getDate() + 1);
        candidateTime.setHours(this.BUSINESS_HOURS.start, 0, 0, 0);
        // Assicurati che sia un giorno lavorativo
        this.adjustToBusinessDay(candidateTime);
        console.log(`⏩ Moving to next business day: ${candidateTime.toLocaleDateString()}`);
      }
    }

    // Fallback: aggiungi un giorno e ricomincia
    const fallbackDate = new Date(suggestedDate);
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    fallbackDate.setHours(this.BUSINESS_HOURS.start, 0, 0, 0);
    this.adjustToBusinessDay(fallbackDate);

    console.log(`⚠️ Using fallback date: ${fallbackDate.toLocaleString()}`);
    return fallbackDate;
  }

  /**
   * Verifica se uno slot temporale è disponibile
   */
  private static isTimeSlotAvailable(candidateTime: Date, existingCalls: Call[]): boolean {
    const candidateStart = candidateTime.getTime();
    const candidateEnd = candidateStart + this.CALL_DURATION_MINUTES * 60 * 1000;

    for (const call of existingCalls) {
      const callStart = new Date(call.dataSchedulata).getTime();
      const callEnd = callStart + (call.durata || this.CALL_DURATION_MINUTES) * 60 * 1000;

      // Verifica sovrapposizione + gap minimo
      const gapMs = this.MIN_GAP_MINUTES * 60 * 1000;

      // Conflitto se:
      // - La nuova call inizia prima che finisca quella esistente + gap
      // - La nuova call finisce dopo che inizia quella esistente - gap
      const hasConflict =
        (candidateStart < callEnd + gapMs) &&
        (candidateEnd > callStart - gapMs);

      if (hasConflict) {
        console.log(`❌ Conflict detected with existing call at ${new Date(callStart).toLocaleString()}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Ottieni un orario di default per il giorno
   */
  private static getDefaultTimeSlot(date: Date): Date {
    const defaultTime = new Date(date);

    // Se la data ha già un orario specifico, usalo se è valido
    if (date.getHours() >= this.BUSINESS_HOURS.start &&
        date.getHours() < this.BUSINESS_HOURS.end) {
      return defaultTime;
    }

    // Altrimenti usa 10:00 AM come default
    defaultTime.setHours(10, 0, 0, 0);
    return defaultTime;
  }

  /**
   * Aggiusta la data per essere un giorno lavorativo (Lunedì-Venerdì)
   */
  private static adjustToBusinessDay(date: Date): void {
    while (date.getDay() === 0 || date.getDay() === 6) { // 0 = Domenica, 6 = Sabato
      date.setDate(date.getDate() + 1);
    }
  }

  /**
   * Verifica se una data/ora specifica ha conflitti
   */
  static hasTimeConflict(proposedDateTime: Date, excludeCallId?: string): {
    hasConflict: boolean;
    conflictingCalls: Call[];
    message: string;
  } {
    const allCalls = LocalStorage.getCalls();
    const conflictingCalls: Call[] = [];

    const proposedStart = proposedDateTime.getTime();
    const proposedEnd = proposedStart + this.CALL_DURATION_MINUTES * 60 * 1000;
    const gapMs = this.MIN_GAP_MINUTES * 60 * 1000;

    for (const call of allCalls) {
      if (excludeCallId && call.id === excludeCallId) continue;
      if (call.status === 'cancelled') continue;

      const callStart = new Date(call.dataSchedulata).getTime();
      const callEnd = callStart + (call.durata || this.CALL_DURATION_MINUTES) * 60 * 1000;

      const hasConflict =
        (proposedStart < callEnd + gapMs) &&
        (proposedEnd > callStart - gapMs);

      if (hasConflict) {
        conflictingCalls.push(call);
      }
    }

    const hasConflict = conflictingCalls.length > 0;
    const message = hasConflict
      ? `Conflitto di orario: distanza minima di ${this.MIN_GAP_MINUTES} minuti richiesta`
      : 'Nessun conflitto di orario';

    return {
      hasConflict,
      conflictingCalls,
      message
    };
  }

  /**
   * Suggerisce un orario alternativo in caso di conflitto
   */
  static suggestAlternativeTime(originalDateTime: Date, excludeCallId?: string): {
    suggestedTime: Date;
    reason: string;
  } {
    const conflict = this.hasTimeConflict(originalDateTime, excludeCallId);

    if (!conflict.hasConflict) {
      return {
        suggestedTime: originalDateTime,
        reason: 'Orario originale disponibile'
      };
    }

    const alternativeTime = this.findAvailableTimeSlot(originalDateTime, excludeCallId);

    return {
      suggestedTime: alternativeTime,
      reason: `Orario spostato per evitare conflitti (distanza minima ${this.MIN_GAP_MINUTES} min richiesta)`
    };
  }

  /**
   * Rileva tutti i conflitti esistenti nelle call programmate
   */
  static detectAllExistingConflicts(): {
    conflictGroups: Call[][];
    totalConflicts: number;
    summary: string;
  } {
    const allCalls = LocalStorage.getCalls();
    const activeCalls = allCalls
      .filter(call => call.status === 'scheduled' || call.status === 'rescheduled')
      .sort((a, b) => new Date(a.dataSchedulata).getTime() - new Date(b.dataSchedulata).getTime());

    const conflictGroups: Call[][] = [];
    const processed = new Set<string>();

    for (const call of activeCalls) {
      if (processed.has(call.id)) continue;

      const conflictingCalls = this.findConflictingCalls(call, activeCalls);

      if (conflictingCalls.length > 0) {
        const conflictGroup = [call, ...conflictingCalls];
        conflictGroups.push(conflictGroup);

        // Mark all calls in this group as processed
        conflictGroup.forEach(c => processed.add(c.id));
      }
    }

    const totalConflicts = conflictGroups.reduce((sum, group) => sum + group.length, 0);

    return {
      conflictGroups,
      totalConflicts,
      summary: conflictGroups.length === 0
        ? '✅ Nessun conflitto rilevato'
        : `⚠️ ${conflictGroups.length} gruppi di conflitti (${totalConflicts} call coinvolte)`
    };
  }

  /**
   * Trova tutte le call in conflitto con una call specifica
   */
  private static findConflictingCalls(targetCall: Call, allCalls: Call[]): Call[] {
    const conflicting: Call[] = [];
    const targetStart = new Date(targetCall.dataSchedulata).getTime();
    const targetEnd = targetStart + (targetCall.durata || this.CALL_DURATION_MINUTES) * 60 * 1000;
    const gapMs = this.MIN_GAP_MINUTES * 60 * 1000;

    for (const call of allCalls) {
      if (call.id === targetCall.id) continue;
      if (call.status === 'cancelled') continue;

      const callStart = new Date(call.dataSchedulata).getTime();
      const callEnd = callStart + (call.durata || this.CALL_DURATION_MINUTES) * 60 * 1000;

      // Check for conflict (overlap + minimum gap)
      const hasConflict =
        (targetStart < callEnd + gapMs) &&
        (targetEnd > callStart - gapMs);

      if (hasConflict) {
        conflicting.push(call);
      }
    }

    return conflicting;
  }

  /**
   * Verifica se una call specifica ha conflitti
   */
  static getCallConflicts(callId: string): {
    hasConflicts: boolean;
    conflictingCalls: Call[];
    message: string;
  } {
    const allCalls = LocalStorage.getCalls();
    const targetCall = allCalls.find(c => c.id === callId);

    if (!targetCall) {
      return {
        hasConflicts: false,
        conflictingCalls: [],
        message: 'Call non trovata'
      };
    }

    const conflictingCalls = this.findConflictingCalls(targetCall, allCalls);
    const hasConflicts = conflictingCalls.length > 0;

    return {
      hasConflicts,
      conflictingCalls,
      message: hasConflicts
        ? `Conflitto con ${conflictingCalls.length} call`
        : 'Nessun conflitto'
    };
  }
}