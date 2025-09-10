// Calendar synchronization service
// Handles bidirectional sync between HR Call Tracker and Google Calendar

import { GoogleCalendarService } from './google-calendar-service';
import { LocalStorage } from './storage';
import { Call, Employee } from '@/types';

export interface SyncResult {
  success: boolean;
  updated: number;
  created: number;
  deleted: number;
  errors: string[];
}

export interface SyncStatus {
  isEnabled: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  autoSyncInterval: number; // minutes
}

export class CalendarSyncService {
  private static readonly STORAGE_KEY = 'hr-tracker-sync-status';
  private static syncInterval: number | null = null;

  // Get sync status
  static getSyncStatus(): SyncStatus {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const defaultStatus: SyncStatus = {
      isEnabled: false,
      autoSyncInterval: 30 // 30 minutes default
    };
    
    if (!saved) return defaultStatus;
    
    const parsed = JSON.parse(saved);
    return {
      ...defaultStatus,
      ...parsed,
      lastSyncAt: parsed.lastSyncAt ? new Date(parsed.lastSyncAt) : undefined,
      nextSyncAt: parsed.nextSyncAt ? new Date(parsed.nextSyncAt) : undefined
    };
  }

  // Update sync status
  static updateSyncStatus(status: Partial<SyncStatus>): void {
    const current = this.getSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  // Sync call changes to Google Calendar
  static async syncCallToCalendar(call: Call, employee: Employee, action: 'create' | 'update' | 'delete'): Promise<boolean> {
    if (!GoogleCalendarService.isConnected()) {
      console.warn('Google Calendar not connected, skipping sync');
      return false;
    }

    try {
      switch (action) {
        case 'create':
          if (!call.googleCalendarEventId) {
            const calendarEvent = await GoogleCalendarService.createCallEvent({
              employeeName: `${employee.nome} ${employee.cognome}`,
              employeeEmail: employee.email,
              scheduledDate: new Date(call.dataSchedulata),
              employeeData: employee
            });

            if (calendarEvent) {
              // Update call with calendar event ID
              const updatedCall = { 
                ...call, 
                googleCalendarEventId: calendarEvent.id,
                lastSyncedAt: new Date().toISOString()
              };
              LocalStorage.updateCall(call.id, updatedCall);
              return true;
            }
          }
          break;

        case 'update':
          if (call.googleCalendarEventId) {
            const startTime = new Date(call.dataSchedulata);
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + 30); // Default duration

            const updatedEvent = await GoogleCalendarService.updateEvent(
              call.googleCalendarEventId,
              {
                title: GoogleCalendarService.processTemplate(
                  GoogleCalendarService.getSettings().meetingTemplate.title,
                  `${employee.nome} ${employee.cognome}`,
                  employee
                ),
                startTime,
                endTime,
                attendees: GoogleCalendarService.getSettings().autoInviteEmployees ? [employee.email] : []
              }
            );

            if (updatedEvent) {
              // Update sync timestamp
              const updatedCall = { 
                ...call, 
                lastSyncedAt: new Date().toISOString()
              };
              LocalStorage.updateCall(call.id, updatedCall);
              return true;
            }
          }
          break;

        case 'delete':
          if (call.googleCalendarEventId) {
            const deleted = await GoogleCalendarService.deleteEvent(call.googleCalendarEventId);
            if (deleted) {
              // Clear calendar event ID
              const updatedCall = { 
                ...call, 
                googleCalendarEventId: undefined,
                lastSyncedAt: new Date().toISOString()
              };
              LocalStorage.updateCall(call.id, updatedCall);
              return true;
            }
          }
          break;
      }

      return false;
    } catch (error) {
      console.error('Sync to calendar failed:', error);
      return false;
    }
  }

  // Full synchronization
  static async performFullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      updated: 0,
      created: 0,
      deleted: 0,
      errors: []
    };

    if (!GoogleCalendarService.isConnected()) {
      result.errors.push('Google Calendar not connected');
      return result;
    }

    try {
      const calls = LocalStorage.getCalls();
      const employees = LocalStorage.getEmployees();
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthFromNow = new Date(now);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      // Get HR Call events from Google Calendar
      const calendarEvents = await GoogleCalendarService.getEvents(
        oneMonthAgo,
        oneMonthFromNow
      );

      // Sync each call to calendar
      for (const call of calls) {
        if (call.status === 'cancelled') continue;
        
        const employee = employees.find(emp => emp.id === call.employeeId);
        if (!employee) continue;

        try {
          if (!call.googleCalendarEventId) {
            // Create missing calendar event
            const success = await this.syncCallToCalendar(call, employee, 'create');
            if (success) result.created++;
          } else {
            // Check if event still exists in calendar
            const calendarEvent = calendarEvents.find(event => event.id === call.googleCalendarEventId);
            if (!calendarEvent) {
              // Event was deleted in calendar, recreate it
              const success = await this.syncCallToCalendar(call, employee, 'create');
              if (success) result.created++;
            } else {
              // Update existing event if needed
              const callDate = new Date(call.dataSchedulata);
              if (Math.abs(callDate.getTime() - calendarEvent.startTime.getTime()) > 60000) { // 1 minute tolerance
                const success = await this.syncCallToCalendar(call, employee, 'update');
                if (success) result.updated++;
              }
            }
          }
        } catch (error) {
          result.errors.push(`Failed to sync call ${call.id}: ${error}`);
        }
      }

      // Update sync status
      this.updateSyncStatus({
        lastSyncAt: new Date(),
        nextSyncAt: new Date(Date.now() + this.getSyncStatus().autoSyncInterval * 60000)
      });

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Full sync failed: ${error}`);
      return result;
    }
  }

  // Start automatic sync
  static startAutoSync(): void {
    const status = this.getSyncStatus();
    if (!status.isEnabled || this.syncInterval !== null) return;

    this.syncInterval = window.setInterval(async () => {
      const currentStatus = this.getSyncStatus();
      if (!currentStatus.isEnabled) {
        this.stopAutoSync();
        return;
      }

      console.log('Performing automatic calendar sync...');
      const result = await this.performFullSync();
      console.log('Auto sync completed:', result);
    }, status.autoSyncInterval * 60000);

    console.log(`Auto sync started with ${status.autoSyncInterval}min interval`);
  }

  // Stop automatic sync
  static stopAutoSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto sync stopped');
    }
  }

  // Enable/disable sync
  static toggleSync(enabled: boolean): void {
    this.updateSyncStatus({ isEnabled: enabled });
    
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  // Manual sync trigger
  static async triggerManualSync(): Promise<SyncResult> {
    console.log('Manual sync triggered...');
    const result = await this.performFullSync();
    console.log('Manual sync completed:', result);
    return result;
  }
}