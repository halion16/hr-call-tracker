// Advanced filtering system with saveable presets
import { Call, Employee } from '@/types';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: CallFilters;
  createdAt: Date;
  isDefault?: boolean;
  isPublic?: boolean; // For future team sharing
}

export interface CallFilters {
  // Basic filters
  search?: string;
  status?: Array<Call['status']>;
  employeeIds?: string[];
  departmentIds?: string[];
  
  // Date filters
  dateRange?: {
    from?: Date;
    to?: Date;
    preset?: 'today' | 'thisWeek' | 'thisMonth' | 'lastWeek' | 'lastMonth' | 'custom';
  };
  
  // Advanced filters
  rating?: {
    min?: number;
    max?: number;
  };
  duration?: {
    min?: number; // minutes
    max?: number;
  };
  priority?: 'high' | 'medium' | 'low';
  hasNotes?: boolean;
  hasNextCall?: boolean;
  
  // Sort options
  sortBy?: 'date' | 'employee' | 'rating' | 'duration' | 'department';
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeFilters {
  search?: string;
  departments?: string[];
  positions?: string[];
  isActive?: boolean;
  hiredAfter?: Date;
  hiredBefore?: Date;
  hasRecentCall?: boolean; // within last 30 days
  sortBy?: 'name' | 'department' | 'hireDate' | 'position';
  sortOrder?: 'asc' | 'desc';
}

const STORAGE_KEY = 'hr-tracker-filter-presets';

export class FilterManager {
  private static instance: FilterManager;
  
  private constructor() {}
  
  static getInstance(): FilterManager {
    if (!FilterManager.instance) {
      FilterManager.instance = new FilterManager();
    }
    return FilterManager.instance;
  }

  // Filter preset management
  getPresets(): FilterPreset[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return this.getDefaultPresets();
    
    try {
      const presets: FilterPreset[] = JSON.parse(stored);
      return presets.map(preset => ({
        ...preset,
        filters: {
          ...preset.filters,
          dateRange: preset.filters.dateRange ? {
            ...preset.filters.dateRange,
            from: preset.filters.dateRange.from ? new Date(preset.filters.dateRange.from) : undefined,
            to: preset.filters.dateRange.to ? new Date(preset.filters.dateRange.to) : undefined
          } : undefined
        }
      }));
    } catch (error) {
      console.error('Error loading filter presets:', error);
      return this.getDefaultPresets();
    }
  }

  savePreset(preset: Omit<FilterPreset, 'id' | 'createdAt'>): FilterPreset {
    const newPreset: FilterPreset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    const presets = this.getPresets();
    presets.push(newPreset);
    this.savePresets(presets);
    
    return newPreset;
  }

  updatePreset(id: string, updates: Partial<Omit<FilterPreset, 'id' | 'createdAt'>>): FilterPreset | null {
    const presets = this.getPresets();
    const index = presets.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    presets[index] = { ...presets[index], ...updates };
    this.savePresets(presets);
    
    return presets[index];
  }

  deletePreset(id: string): boolean {
    const presets = this.getPresets();
    const filtered = presets.filter(p => p.id !== id);
    
    if (filtered.length === presets.length) return false;
    
    this.savePresets(filtered);
    return true;
  }

  private savePresets(presets: FilterPreset[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }

  private getDefaultPresets(): FilterPreset[] {
    return [
      {
        id: 'today-calls',
        name: 'Call di Oggi',
        description: 'Tutte le call programmate per oggi',
        filters: {
          dateRange: { preset: 'today' },
          sortBy: 'date',
          sortOrder: 'asc'
        },
        createdAt: new Date(),
        isDefault: true
      },
      {
        id: 'pending-calls',
        name: 'Call in Sospeso',
        description: 'Call programmate ma non ancora completate',
        filters: {
          status: ['scheduled'],
          sortBy: 'date',
          sortOrder: 'asc'
        },
        createdAt: new Date(),
        isDefault: true
      },
      {
        id: 'completed-this-week',
        name: 'Completate Questa Settimana',
        description: 'Call completate negli ultimi 7 giorni',
        filters: {
          status: ['completed'],
          dateRange: { preset: 'thisWeek' },
          sortBy: 'date',
          sortOrder: 'desc'
        },
        createdAt: new Date(),
        isDefault: true
      },
      {
        id: 'high-rated',
        name: 'Call Eccellenti',
        description: 'Call con rating 4+ stelle',
        filters: {
          status: ['completed'],
          rating: { min: 4 },
          sortBy: 'rating',
          sortOrder: 'desc'
        },
        createdAt: new Date(),
        isDefault: true
      },
      {
        id: 'needs-follow-up',
        name: 'Richiedono Follow-up',
        description: 'Call completate con prossima call programmata',
        filters: {
          status: ['completed'],
          hasNextCall: true,
          sortBy: 'date',
          sortOrder: 'desc'
        },
        createdAt: new Date(),
        isDefault: true
      }
    ];
  }

  // Call filtering
  filterCalls(calls: Call[], employees: Employee[], filters: CallFilters): Call[] {
    let filtered = [...calls];

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(call => {
        const employee = employees.find(emp => emp.id === call.employeeId);
        const employeeName = employee ? `${employee.nome} ${employee.cognome}`.toLowerCase() : '';
        const employeePosition = employee ? employee.posizione.toLowerCase() : '';
        const employeeDepartment = employee ? employee.dipartimento.toLowerCase() : '';
        const notes = call.note?.toLowerCase() || '';

        return employeeName.includes(searchTerm) ||
               employeePosition.includes(searchTerm) ||
               employeeDepartment.includes(searchTerm) ||
               notes.includes(searchTerm) ||
               call.id.toLowerCase().includes(searchTerm);
      });
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(call => filters.status!.includes(call.status));
    }

    // Employee filter
    if (filters.employeeIds && filters.employeeIds.length > 0) {
      filtered = filtered.filter(call => filters.employeeIds!.includes(call.employeeId));
    }

    // Department filter
    if (filters.departmentIds && filters.departmentIds.length > 0) {
      filtered = filtered.filter(call => {
        const employee = employees.find(emp => emp.id === call.employeeId);
        return employee && filters.departmentIds!.includes(employee.dipartimento);
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const { from, to, preset } = filters.dateRange;
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (preset) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (preset) {
          case 'today':
            startDate = today;
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'thisWeek':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startDate = startOfWeek;
            endDate = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case 'lastWeek':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            startDate = lastWeekStart;
            endDate = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
      }

      if (from) startDate = from;
      if (to) endDate = to;

      if (startDate || endDate) {
        filtered = filtered.filter(call => {
          const callDate = new Date(call.dataSchedulata);
          if (startDate && callDate < startDate) return false;
          if (endDate && callDate >= endDate) return false;
          return true;
        });
      }
    }

    // Rating filter
    if (filters.rating && (filters.rating.min !== undefined || filters.rating.max !== undefined)) {
      filtered = filtered.filter(call => {
        if (!call.rating) return false;
        if (filters.rating!.min !== undefined && call.rating < filters.rating!.min) return false;
        if (filters.rating!.max !== undefined && call.rating > filters.rating!.max) return false;
        return true;
      });
    }

    // Duration filter
    if (filters.duration && (filters.duration.min !== undefined || filters.duration.max !== undefined)) {
      filtered = filtered.filter(call => {
        if (!call.durata) return false;
        if (filters.duration!.min !== undefined && call.durata < filters.duration!.min) return false;
        if (filters.duration!.max !== undefined && call.durata > filters.duration!.max) return false;
        return true;
      });
    }

    // Boolean filters
    if (filters.hasNotes !== undefined) {
      filtered = filtered.filter(call => {
        const hasNotes = !!(call.note && call.note.trim());
        return hasNotes === filters.hasNotes;
      });
    }

    if (filters.hasNextCall !== undefined) {
      filtered = filtered.filter(call => {
        const hasNext = !!call.nextCallDate;
        return hasNext === filters.hasNextCall;
      });
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'date':
            comparison = new Date(a.dataSchedulata).getTime() - new Date(b.dataSchedulata).getTime();
            break;
          case 'employee':
            const empA = employees.find(emp => emp.id === a.employeeId);
            const empB = employees.find(emp => emp.id === b.employeeId);
            const nameA = empA ? `${empA.cognome} ${empA.nome}` : '';
            const nameB = empB ? `${empB.cognome} ${empB.nome}` : '';
            comparison = nameA.localeCompare(nameB, 'it');
            break;
          case 'rating':
            comparison = (a.rating || 0) - (b.rating || 0);
            break;
          case 'duration':
            comparison = (a.durata || 0) - (b.durata || 0);
            break;
          case 'department':
            const deptA = employees.find(emp => emp.id === a.employeeId)?.dipartimento || '';
            const deptB = employees.find(emp => emp.id === b.employeeId)?.dipartimento || '';
            comparison = deptA.localeCompare(deptB, 'it');
            break;
        }
        
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }

  // Employee filtering
  filterEmployees(employees: Employee[], filters: EmployeeFilters): Employee[] {
    let filtered = [...employees];

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(employee => {
        const fullName = `${employee.nome} ${employee.cognome}`.toLowerCase();
        const email = employee.email.toLowerCase();
        const position = employee.posizione.toLowerCase();
        const department = employee.dipartimento.toLowerCase();
        
        return fullName.includes(searchTerm) ||
               email.includes(searchTerm) ||
               position.includes(searchTerm) ||
               department.includes(searchTerm);
      });
    }

    // Department filter
    if (filters.departments && filters.departments.length > 0) {
      filtered = filtered.filter(emp => filters.departments!.includes(emp.dipartimento));
    }

    // Position filter
    if (filters.positions && filters.positions.length > 0) {
      filtered = filtered.filter(emp => filters.positions!.includes(emp.posizione));
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(emp => emp.isActive === filters.isActive);
    }

    // Hire date filters
    if (filters.hiredAfter) {
      filtered = filtered.filter(emp => new Date(emp.dataAssunzione) >= filters.hiredAfter!);
    }

    if (filters.hiredBefore) {
      filtered = filtered.filter(emp => new Date(emp.dataAssunzione) <= filters.hiredBefore!);
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'name':
            comparison = `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it');
            break;
          case 'department':
            comparison = a.dipartimento.localeCompare(b.dipartimento, 'it');
            break;
          case 'hireDate':
            comparison = new Date(a.dataAssunzione).getTime() - new Date(b.dataAssunzione).getTime();
            break;
          case 'position':
            comparison = a.posizione.localeCompare(b.posizione, 'it');
            break;
        }
        
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }

  // Generate filter options from data
  getCallFilterOptions(calls: Call[], employees: Employee[]): {
    departments: FilterOption[];
    employees: FilterOption[];
    statuses: FilterOption[];
  } {
    const departmentMap = new Map<string, number>();
    const employeeMap = new Map<string, number>();
    const statusMap = new Map<Call['status'], number>();

    calls.forEach(call => {
      // Count by status
      statusMap.set(call.status, (statusMap.get(call.status) || 0) + 1);

      // Count by employee and department
      const employee = employees.find(emp => emp.id === call.employeeId);
      if (employee) {
        employeeMap.set(call.employeeId, (employeeMap.get(call.employeeId) || 0) + 1);
        departmentMap.set(employee.dipartimento, (departmentMap.get(employee.dipartimento) || 0) + 1);
      }
    });

    return {
      departments: Array.from(departmentMap.entries()).map(([dept, count]) => ({
        value: dept,
        label: dept,
        count
      })).sort((a, b) => a.label.localeCompare(b.label, 'it')),

      employees: Array.from(employeeMap.entries()).map(([empId, count]) => {
        const employee = employees.find(emp => emp.id === empId);
        return {
          value: empId,
          label: employee ? `${employee.cognome} ${employee.nome}` : empId,
          count
        };
      }).sort((a, b) => a.label.localeCompare(b.label, 'it')),

      statuses: Array.from(statusMap.entries()).map(([status, count]) => {
        const labels = {
          scheduled: 'Programmate',
          completed: 'Completate',
          cancelled: 'Cancellate',
          suspended: 'Sospese',
          rescheduled: 'Riprogrammate'
        };
        
        return {
          value: status,
          label: labels[status] || status,
          count
        };
      })
    };
  }

  getEmployeeFilterOptions(employees: Employee[]): {
    departments: FilterOption[];
    positions: FilterOption[];
  } {
    const departmentMap = new Map<string, number>();
    const positionMap = new Map<string, number>();

    employees.forEach(employee => {
      departmentMap.set(employee.dipartimento, (departmentMap.get(employee.dipartimento) || 0) + 1);
      positionMap.set(employee.posizione, (positionMap.get(employee.posizione) || 0) + 1);
    });

    return {
      departments: Array.from(departmentMap.entries()).map(([dept, count]) => ({
        value: dept,
        label: dept,
        count
      })).sort((a, b) => a.label.localeCompare(b.label, 'it')),

      positions: Array.from(positionMap.entries()).map(([pos, count]) => ({
        value: pos,
        label: pos,
        count
      })).sort((a, b) => a.label.localeCompare(b.label, 'it'))
    };
  }
}

// Export singleton
export const filterManager = FilterManager.getInstance();