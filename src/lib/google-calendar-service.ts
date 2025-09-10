// Browser-compatible Google Calendar API
// Uses Google APIs JavaScript client (gapi)
// No server-side imports to avoid 'child_process' errors

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface CalendarSettings {
  enabled: boolean;
  connectedAccount?: string;
  defaultCalendarId?: string;
  autoCreateEvents: boolean;
  autoInviteEmployees: boolean;
  defaultDuration: number; // minutes
  defaultLocation: string;
  meetingTemplate: {
    title: string;
    description: string;
    includeAgenda: boolean;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  meetLink?: string;
  calendarId?: string;
}

export interface CalendarConnection {
  isConnected: boolean;
  accountEmail?: string;
  calendars?: Array<{
    id: string;
    name: string;
    primary?: boolean;
  }>;
  lastSync?: Date;
  error?: string;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  enabled: false,
  autoCreateEvents: true,
  autoInviteEmployees: true,
  defaultDuration: 30,
  defaultLocation: 'Ufficio HR / Google Meet',
  meetingTemplate: {
    title: 'HR Call - {employeeName}',
    description: `Chiamata di recap HR con {employeeName}

📋 Agenda:
• Review performance e obiettivi
• Feedback e supporto
• Pianificazione sviluppo
• Q&A e discussione aperta

🔗 Link call: Sarà fornito prima dell'incontro
📧 Per domande: contattare HR team

---
Generato da HR Call Tracker`,
    includeAgenda: true
  }
};

export class GoogleCalendarService {
  private static readonly STORAGE_KEY = 'hr-tracker-calendar-settings';
  private static readonly DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
  private static readonly SCOPES = 'https://www.googleapis.com/auth/calendar';
  private static isInitialized = false;
  private static isSignedIn = false;

  // Settings management
  static getSettings(): CalendarSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  }

  static saveSettings(settings: CalendarSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  // Initialize Google API
  static async initialize(): Promise<boolean> {
    try {
      // Load Google APIs if not already loaded
      if (!window.gapi) {
        await this.loadGoogleApis();
      }

      // Initialize gapi
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client:auth2', async () => {
          try {
            await window.gapi.client.init({
              apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
              clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              discoveryDocs: this.DISCOVERY_DOCS,
              scope: this.SCOPES
            });

            this.isInitialized = true;
            
            // Check if user is signed in
            const authInstance = window.gapi.auth2.getAuthInstance();
            this.isSignedIn = authInstance.isSignedIn.get();
            
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize Google API:', error);
      return false;
    }
  }

  private static loadGoogleApis(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-apis')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-apis';
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google APIs'));
      document.head.appendChild(script);
    });
  }

  // Connection management
  static async initializeConnection(): Promise<CalendarConnection> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            isConnected: false,
            error: 'Failed to initialize Google API'
          };
        }
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();

      if (!isSignedIn) {
        return {
          isConnected: false,
          error: 'Not signed in to Google account'
        };
      }

      // Get user info and calendars
      const user = authInstance.currentUser.get();
      const profile = user.getBasicProfile();
      
      const calendarsResponse = await window.gapi.client.calendar.calendarList.list();
      const calendars = calendarsResponse.result.items.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false
      }));

      // Update settings with connected account
      const settings = this.getSettings();
      settings.connectedAccount = profile.getEmail();
      settings.defaultCalendarId = calendars.find((cal: any) => cal.primary)?.id || 'primary';
      this.saveSettings(settings);

      return {
        isConnected: true,
        accountEmail: profile.getEmail(),
        calendars,
        lastSync: new Date()
      };

    } catch (error) {
      console.error('Connection initialization failed:', error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Authentication
  static async signIn(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      
      this.isSignedIn = authInstance.isSignedIn.get();
      return this.isSignedIn;
    } catch (error) {
      console.error('Sign in failed:', error);
      return false;
    }
  }

  static disconnect(): void {
    try {
      if (this.isInitialized && window.gapi.auth2) {
        const authInstance = window.gapi.auth2.getAuthInstance();
        authInstance.signOut();
        this.isSignedIn = false;
      }

      // Clear settings
      const settings = this.getSettings();
      settings.enabled = false;
      settings.connectedAccount = undefined;
      settings.defaultCalendarId = undefined;
      this.saveSettings(settings);

    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }

  // Event creation
  static async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return null;
    }

    try {
      const settings = this.getSettings();
      if (!settings.enabled || !settings.autoCreateEvents) {
        console.log('Calendar integration disabled or auto-create disabled');
        return null;
      }

      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: event.attendees.map(email => ({ email })),
        location: event.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'email', minutes: 1440 } // 24h before
          ]
        }
      };

      // Create event in primary calendar
      const calendarId = settings.defaultCalendarId || 'primary';
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: calendarEvent
      });

      if (response.status === 200) {
        const createdEvent = response.result;
        return {
          id: createdEvent.id,
          title: createdEvent.summary,
          description: createdEvent.description,
          startTime: new Date(createdEvent.start.dateTime || createdEvent.start.date),
          endTime: new Date(createdEvent.end.dateTime || createdEvent.end.date),
          attendees: event.attendees,
          location: createdEvent.location,
          meetLink: createdEvent.hangoutLink,
          calendarId: calendarId
        };
      }

      return null;

    } catch (error) {
      console.error('Create event failed:', error);
      return null;
    }
  }

  // Utility methods
  static isConnected(): boolean {
    return this.isSignedIn && this.isInitialized;
  }

  static getConnectionStatus(): CalendarConnection {
    const settings = this.getSettings();
    
    return {
      isConnected: this.isConnected(),
      accountEmail: settings.connectedAccount,
      lastSync: new Date()
    };
  }

  // Create calendar event from HR call
  static async createCallEvent(callData: {
    employeeName: string;
    employeeEmail?: string;
    scheduledDate: Date;
    employeeData?: any;
  }): Promise<CalendarEvent | null> {
    const settings = this.getSettings();
    
    if (!settings.enabled || !settings.autoCreateEvents) {
      return null;
    }

    try {
      // Calculate event times
      const startTime = new Date(callData.scheduledDate);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + settings.defaultDuration);

      // Process template
      const title = this.processTemplate(
        settings.meetingTemplate.title, 
        callData.employeeName, 
        callData.employeeData
      );
      
      let description = this.processTemplate(
        settings.meetingTemplate.description || '', 
        callData.employeeName, 
        callData.employeeData
      );

      // Add standard agenda if enabled
      if (settings.meetingTemplate.includeAgenda && !description.includes('📋 Agenda')) {
        description += `\n\n📋 Agenda:\n• Review performance e obiettivi\n• Feedback e supporto\n• Pianificazione sviluppo\n• Q&A e discussione aperta\n\n🔗 Link call: Sarà fornito prima dell'incontro\n📧 Per domande: contattare HR team\n\n---\nGenerato da HR Call Tracker`;
      }

      // Prepare attendees
      const attendees: string[] = [];
      if (settings.autoInviteEmployees && callData.employeeEmail) {
        attendees.push(callData.employeeEmail);
      }

      // Create the event
      return await this.createEvent({
        title,
        description,
        startTime,
        endTime,
        attendees,
        location: settings.defaultLocation
      });

    } catch (error) {
      console.error('Failed to create call event:', error);
      return null;
    }
  }

  // Template processing
  static processTemplate(template: string, employeeName: string, employeeData?: any): string {
    return template
      .replace(/{employeeName}/g, employeeName)
      .replace(/{employeeDepartment}/g, employeeData?.dipartimento || '')
      .replace(/{employeePosition}/g, employeeData?.posizione || '');
  }

  // Environment validation
  static validateEnvironment(): { isValid: boolean; missing: string[] } {
    const required = [
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      'NEXT_PUBLIC_GOOGLE_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  // Update existing event
  static async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId?: string): Promise<CalendarEvent | null> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return null;
    }

    try {
      const settings = this.getSettings();
      const targetCalendarId = calendarId || settings.defaultCalendarId || 'primary';

      const updateData: any = {};
      
      if (event.title) updateData.summary = event.title;
      if (event.description !== undefined) updateData.description = event.description;
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map(email => ({ email }));
      }
      if (event.location !== undefined) updateData.location = event.location;

      const response = await window.gapi.client.calendar.events.patch({
        calendarId: targetCalendarId,
        eventId: eventId,
        resource: updateData
      });

      if (response.status === 200) {
        const updatedEvent = response.result;
        return {
          id: updatedEvent.id,
          title: updatedEvent.summary,
          description: updatedEvent.description,
          startTime: new Date(updatedEvent.start.dateTime || updatedEvent.start.date),
          endTime: new Date(updatedEvent.end.dateTime || updatedEvent.end.date),
          attendees: event.attendees || [],
          location: updatedEvent.location,
          meetLink: updatedEvent.hangoutLink,
          calendarId: targetCalendarId
        };
      }

      return null;
    } catch (error) {
      console.error('Update event failed:', error);
      return null;
    }
  }

  // Delete event
  static async deleteEvent(eventId: string, calendarId?: string): Promise<boolean> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return false;
    }

    try {
      const settings = this.getSettings();
      const targetCalendarId = calendarId || settings.defaultCalendarId || 'primary';

      const response = await window.gapi.client.calendar.events.delete({
        calendarId: targetCalendarId,
        eventId: eventId
      });

      return response.status === 204;
    } catch (error) {
      console.error('Delete event failed:', error);
      return false;
    }
  }

  // Get events in date range
  static async getEvents(startDate: Date, endDate: Date, calendarId?: string): Promise<CalendarEvent[]> {
    if (!this.isSignedIn) {
      console.error('Not signed in to Google Calendar');
      return [];
    }

    try {
      const settings = this.getSettings();
      const targetCalendarId = calendarId || settings.defaultCalendarId || 'primary';

      const response = await window.gapi.client.calendar.events.list({
        calendarId: targetCalendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        q: 'HR Call' // Filter only HR call events
      });

      if (response.status === 200) {
        return response.result.items.map((event: any) => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          startTime: new Date(event.start.dateTime || event.start.date),
          endTime: new Date(event.end.dateTime || event.end.date),
          attendees: event.attendees ? event.attendees.map((att: any) => att.email) : [],
          location: event.location,
          meetLink: event.hangoutLink,
          calendarId: targetCalendarId
        }));
      }

      return [];
    } catch (error) {
      console.error('Get events failed:', error);
      return [];
    }
  }

  // Test connection
  static async testConnection(): Promise<boolean> {
    try {
      if (!this.isSignedIn) return false;

      // Simple test: get calendar list
      const response = await window.gapi.client.calendar.calendarList.list();
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}