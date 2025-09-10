// Service for managing autocomplete suggestions based on historical data
import { AutocompleteOption } from '@/components/ui/autocomplete';
import { LocalStorage } from './storage';
import { Call, Employee } from '@/types';

export interface AutocompleteSuggestion extends AutocompleteOption {
  lastUsed?: Date;
  context?: string;
}

export class AutocompleteService {
  private static instance: AutocompleteService;
  private suggestions: Map<string, AutocompleteSuggestion[]> = new Map();
  private initialized = false;

  private constructor() {
    // Don't load suggestions immediately - defer until first use
  }

  static getInstance(): AutocompleteService {
    if (!AutocompleteService.instance) {
      AutocompleteService.instance = new AutocompleteService();
    }
    return AutocompleteService.instance;
  }

  // Load suggestions from localStorage
  private loadSuggestions() {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    try {
      const stored = localStorage.getItem('hr-tracker-autocomplete-suggestions');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.suggestions = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load autocomplete suggestions:', error);
    }
  }

  // Save suggestions to localStorage
  private saveSuggestions() {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    try {
      const obj = Object.fromEntries(this.suggestions);
      localStorage.setItem('hr-tracker-autocomplete-suggestions', JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to save autocomplete suggestions:', error);
    }
  }

  // Ensure suggestions are loaded from localStorage
  private ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      this.loadSuggestions();
      this.initialized = true;
    }
  }

  // Add or update a suggestion
  addSuggestion(field: string, value: string, context?: string) {
    this.ensureInitialized();
    if (!value?.trim()) return;

    const suggestions = this.suggestions.get(field) || [];
    const existingIndex = suggestions.findIndex(s => s.value === value);

    if (existingIndex >= 0) {
      // Update existing suggestion
      suggestions[existingIndex].frequency = (suggestions[existingIndex].frequency || 0) + 1;
      suggestions[existingIndex].lastUsed = new Date();
    } else {
      // Add new suggestion
      const suggestion: AutocompleteSuggestion = {
        value,
        label: value,
        frequency: 1,
        lastUsed: new Date(),
        context
      };
      suggestions.push(suggestion);
    }

    // Keep only top 50 suggestions per field, sorted by frequency
    suggestions.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    this.suggestions.set(field, suggestions.slice(0, 50));
    
    this.saveSuggestions();
  }

  // Get suggestions for a field
  getSuggestions(field: string): AutocompleteSuggestion[] {
    this.ensureInitialized();
    return this.suggestions.get(field) || [];
  }

  // Generate call notes suggestions based on historical data
  getCallNotesSuggestions(): AutocompleteSuggestion[] {
    this.ensureInitialized();
    const calls = LocalStorage.getCalls();
    const noteFrequency = new Map<string, number>();
    
    // Extract common phrases from historical notes
    calls.forEach(call => {
      if (call.note) {
        // Extract sentences and common phrases
        const sentences = call.note.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 5);
        sentences.forEach(sentence => {
          if (sentence.length <= 100) { // Reasonable length
            noteFrequency.set(sentence, (noteFrequency.get(sentence) || 0) + 1);
          }
        });
        
        // Extract common phrases
        const words = call.note.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 2; i++) {
          const phrase = words.slice(i, i + 3).join(' ');
          if (phrase.length > 10) {
            noteFrequency.set(phrase, (noteFrequency.get(phrase) || 0) + 1);
          }
        }
      }
    });

    // Common predefined suggestions
    const commonSuggestions = [
      { value: 'Discussione su obiettivi trimestrali', category: 'Obiettivi' },
      { value: 'Review delle performance', category: 'Performance' },
      { value: 'Feedback su progetto attuale', category: 'Progetti' },
      { value: 'Pianificazione sviluppo professionale', category: 'Sviluppo' },
      { value: 'Discussione su work-life balance', category: 'Benessere' },
      { value: 'Aggiornamento su formazione', category: 'Formazione' },
      { value: 'Revisione mansioni e responsabilità', category: 'Ruolo' },
      { value: 'Follow-up su feedback precedente', category: 'Follow-up' },
      { value: 'Discussione su opportunità di crescita', category: 'Crescita' },
      { value: 'Allineamento su priorità aziendali', category: 'Azienda' }
    ];

    // Combine historical and predefined
    const suggestions: AutocompleteSuggestion[] = [
      ...Array.from(noteFrequency.entries())
        .filter(([text, freq]) => freq >= 2) // Only suggest if used at least twice
        .map(([text, freq]) => ({
          value: text,
          label: text.charAt(0).toUpperCase() + text.slice(1),
          frequency: freq,
          category: 'Storico'
        })),
      ...commonSuggestions.map(s => ({ ...s, label: s.value, frequency: 1 }))
    ];

    return suggestions
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, 20);
  }

  // Generate employee selection suggestions
  getEmployeeSuggestions(searchTerm?: string): AutocompleteSuggestion[] {
    this.ensureInitialized();
    const employees = LocalStorage.getEmployees();
    const calls = LocalStorage.getCalls();
    
    // Calculate call frequency per employee
    const employeeCallFreq = new Map<string, number>();
    calls.forEach(call => {
      employeeCallFreq.set(call.employeeId, (employeeCallFreq.get(call.employeeId) || 0) + 1);
    });

    let suggestions = employees
      .filter(emp => emp.isActive)
      .map(emp => ({
        value: emp.id,
        label: `${emp.nome} ${emp.cognome}`,
        description: `${emp.posizione} - ${emp.dipartimento}`,
        category: emp.dipartimento,
        frequency: employeeCallFreq.get(emp.id) || 0
      }));

    // Filter by search term if provided
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      suggestions = suggestions.filter(emp => 
        emp.label.toLowerCase().includes(search) ||
        emp.description?.toLowerCase().includes(search) ||
        emp.category?.toLowerCase().includes(search)
      );
    }

    return suggestions
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, 30);
  }

  // Generate department suggestions
  getDepartmentSuggestions(): AutocompleteSuggestion[] {
    this.ensureInitialized();
    const employees = LocalStorage.getEmployees();
    const deptFreq = new Map<string, number>();
    
    employees.forEach(emp => {
      if (emp.dipartimento) {
        deptFreq.set(emp.dipartimento, (deptFreq.get(emp.dipartimento) || 0) + 1);
      }
    });

    return Array.from(deptFreq.entries())
      .map(([dept, count]) => ({
        value: dept,
        label: dept,
        description: `${count} dipendenti`,
        frequency: count,
        category: 'Dipartimento'
      }))
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  }

  // Generate position suggestions
  getPositionSuggestions(): AutocompleteSuggestion[] {
    this.ensureInitialized();
    const employees = LocalStorage.getEmployees();
    const posFreq = new Map<string, number>();
    
    employees.forEach(emp => {
      if (emp.posizione) {
        posFreq.set(emp.posizione, (posFreq.get(emp.posizione) || 0) + 1);
      }
    });

    return Array.from(posFreq.entries())
      .map(([pos, count]) => ({
        value: pos,
        label: pos,
        description: `${count} dipendenti`,
        frequency: count,
        category: 'Posizione'
      }))
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  }

  // Generate time slot suggestions for call scheduling
  getTimeSlotSuggestions(): AutocompleteSuggestion[] {
    this.ensureInitialized();
    const calls = LocalStorage.getCalls();
    const timeFreq = new Map<string, number>();
    
    // Analyze historical call times
    calls.forEach(call => {
      const date = new Date(call.dataSchedulata);
      const hour = date.getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      timeFreq.set(timeSlot, (timeFreq.get(timeSlot) || 0) + 1);
    });

    // Common business hours
    const commonSlots = [
      '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
    ];

    const suggestions: AutocompleteSuggestion[] = [
      ...Array.from(timeFreq.entries()).map(([time, freq]) => ({
        value: time,
        label: time,
        description: `Usato ${freq} volte`,
        frequency: freq,
        category: 'Storico'
      })),
      ...commonSlots
        .filter(slot => !timeFreq.has(slot))
        .map(slot => ({
          value: slot,
          label: slot,
          description: 'Orario consigliato',
          frequency: 1,
          category: 'Consigliato'
        }))
    ];

    return suggestions
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, 10);
  }

  // Clear suggestions for a field or all fields
  clearSuggestions(field?: string) {
    if (field) {
      this.suggestions.delete(field);
    } else {
      this.suggestions.clear();
    }
    this.saveSuggestions();
  }

  // Get usage statistics
  getStats(): { field: string; suggestionCount: number; totalFrequency: number }[] {
    this.ensureInitialized();
    return Array.from(this.suggestions.entries()).map(([field, suggestions]) => ({
      field,
      suggestionCount: suggestions.length,
      totalFrequency: suggestions.reduce((sum, s) => sum + (s.frequency || 0), 0)
    }));
  }

  // Auto-learn from form submissions
  learnFromCall(call: Call) {
    if (call.note) {
      this.addSuggestion('call-notes', call.note, 'call-completion');
    }
    
    // Learn time patterns
    const date = new Date(call.dataSchedulata);
    const hour = date.getHours();
    this.addSuggestion('time-slots', `${hour.toString().padStart(2, '0')}:00`, 'call-scheduling');
  }

  // Auto-learn from employee operations
  learnFromEmployee(employee: Employee) {
    this.addSuggestion('departments', employee.dipartimento, 'employee-management');
    this.addSuggestion('positions', employee.posizione, 'employee-management');
  }
}

// Export singleton instance
export const autocompleteService = AutocompleteService.getInstance();