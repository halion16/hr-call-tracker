import { CompanyApiEmployee, Employee } from '@/types';

const MOCK_COMPANY_EMPLOYEES: CompanyApiEmployee[] = [
  {
    employeeId: 'EMP001',
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco.rossi@company.it',
    position: 'Senior Developer',
    department: 'IT',
    hireDate: '2022-03-15',
    phone: '+39 340 1234567',
    status: 'active'
  },
  {
    employeeId: 'EMP002',
    firstName: 'Sofia',
    lastName: 'Bianchi',
    email: 'sofia.bianchi@company.it',
    position: 'Marketing Manager',
    department: 'Marketing',
    hireDate: '2021-09-01',
    phone: '+39 340 2345678',
    status: 'active'
  },
  {
    employeeId: 'EMP003',
    firstName: 'Luca',
    lastName: 'Verdi',
    email: 'luca.verdi@company.it',
    position: 'Sales Representative',
    department: 'Sales',
    hireDate: '2023-01-10',
    phone: '+39 340 3456789',
    status: 'active'
  },
  {
    employeeId: 'EMP004',
    firstName: 'Giulia',
    lastName: 'Neri',
    email: 'giulia.neri@company.it',
    position: 'UX Designer',
    department: 'Design',
    hireDate: '2022-07-20',
    phone: '+39 340 4567890',
    status: 'active'
  },
  {
    employeeId: 'EMP005',
    firstName: 'Alessandro',
    lastName: 'Blu',
    email: 'alessandro.blu@company.it',
    position: 'Project Manager',
    department: 'Operations',
    hireDate: '2020-11-05',
    phone: '+39 340 5678901',
    status: 'active'
  },
  {
    employeeId: 'EMP006',
    firstName: 'Chiara',
    lastName: 'Rosa',
    email: 'chiara.rosa@company.it',
    position: 'HR Specialist',
    department: 'HR',
    hireDate: '2021-02-14',
    status: 'inactive'
  }
];

export class CompanyApiService {
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async fetchActiveEmployees(): Promise<CompanyApiEmployee[]> {
    await this.delay(1000);
    
    return MOCK_COMPANY_EMPLOYEES.filter(emp => emp.status === 'active');
  }

  static async fetchAllEmployees(): Promise<CompanyApiEmployee[]> {
    await this.delay(1200);
    
    return MOCK_COMPANY_EMPLOYEES;
  }

  static async fetchEmployeeById(id: string): Promise<CompanyApiEmployee | null> {
    await this.delay(500);
    
    return MOCK_COMPANY_EMPLOYEES.find(emp => emp.employeeId === id) || null;
  }

  static mapToLocalEmployee(companyEmployee: CompanyApiEmployee): Employee {
    return {
      id: companyEmployee.employeeId,
      nome: companyEmployee.firstName,
      cognome: companyEmployee.lastName,
      email: companyEmployee.email,
      posizione: companyEmployee.position,
      dipartimento: companyEmployee.department,
      dataAssunzione: companyEmployee.hireDate,
      telefono: companyEmployee.phone,
      isActive: companyEmployee.status === 'active'
    };
  }

  static async syncEmployees(): Promise<Employee[]> {
    const companyEmployees = await this.fetchActiveEmployees();
    return companyEmployees.map(this.mapToLocalEmployee);
  }

  static mockApiCredentials = {
    endpoint: 'https://company-api.example.com',
    apiKey: 'mock-api-key-12345',
    version: 'v1'
  };
}