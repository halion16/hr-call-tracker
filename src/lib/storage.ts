import { Employee, Call, User } from '@/types';

const STORAGE_KEYS = {
  EMPLOYEES: 'hr-tracker-employees',
  CALLS: 'hr-tracker-calls',
  USER: 'hr-tracker-user',
} as const;

export class LocalStorage {
  static getEmployees(): Employee[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  }

  static setEmployees(employees: Employee[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }

  static getCalls(): Call[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.CALLS);
    return data ? JSON.parse(data) : [];
  }

  static setCalls(calls: Call[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
  }

  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  static addEmployee(employee: Employee): void {
    const employees = this.getEmployees();
    employees.push(employee);
    this.setEmployees(employees);
  }

  static updateEmployee(id: string, updatedEmployee: Partial<Employee>): void {
    const employees = this.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...updatedEmployee };
      this.setEmployees(employees);
    }
  }

  static addCall(call: Call): void {
    const calls = this.getCalls();
    calls.push(call);
    this.setCalls(calls);
  }

  static updateCall(id: string, updatedCall: Partial<Call>): void {
    const calls = this.getCalls();
    const index = calls.findIndex(call => call.id === id);
    if (index !== -1) {
      calls[index] = { ...calls[index], ...updatedCall };
      this.setCalls(calls);
    }
  }

  static deleteCall(id: string): void {
    const calls = this.getCalls();
    const filteredCalls = calls.filter(call => call.id !== id);
    this.setCalls(filteredCalls);
  }

  static getCallsByEmployee(employeeId: string): Call[] {
    return this.getCalls().filter(call => call.employeeId === employeeId);
  }

  static getUpcomingCalls(): Call[] {
    const calls = this.getCalls();
    const now = new Date();
    return calls
      .filter(call => call.status === 'scheduled' && new Date(call.dataSchedulata) >= now)
      .sort((a, b) => new Date(a.dataSchedulata).getTime() - new Date(b.dataSchedulata).getTime());
  }

  static getCompletedCalls(): Call[] {
    return this.getCalls().filter(call => call.status === 'completed');
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}