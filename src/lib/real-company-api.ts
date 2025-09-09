import { CompanyApiEmployee, Employee } from '@/types';

// Backup dei dati mock per fallback
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
  }
];

interface ApiCredentials {
  endpoint: string;
  apiKey: string;
  version: string;
  useMock: boolean;
  // EcosAgile specific credentials
  userid?: string;
  password?: string;
  clientId?: string;
  instanceCode?: string;
}

interface EcosAgileTokenResponse {
  token: string;
  success: boolean;
  message?: string;
}

interface EcosAgileEmployee {
  id: string;
  name: string;
  surname: string;
  email?: string;
  role?: string;
  department?: string;
  hireDate?: string;
  phone?: string;
  active: boolean;
}

export class RealCompanyApiService {
  private static getCredentials(): ApiCredentials & { 
    ecosApiAuthToken?: string; 
    urlCalToken?: string; 
    apiPassword?: string;
  } {
    // Carica le credenziali salvate o usa i defaults corretti
    const saved = localStorage.getItem('hr-tracker-api-settings');
    const defaults = {
      endpoint: 'https://ha.ecosagile.com',
      apiKey: 'your-api-key', // Non utilizzato per EcosAgile
      version: 'v1',
      useMock: true, // Cambia a false per usare API reale
      // Credenziali EcosAgile
      instanceCode: 'ee', // Codice istanza EcosAgile
      userid: 'TUO_USERNAME',
      password: 'TUA_PASSWORD', 
      clientId: '16383',
      // Token specifici per autenticazione
      ecosApiAuthToken: '039b969c-339d-4316-9c84-e4bfe1a77f3f',
      urlCalToken: '0AF0QFNRF5HPS5FJT6MMWF0DI',
      apiPassword: 'dG2ZhGyt!'
    };
    
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Autentica con EcosAgile e ottieni il token
  private static async getEcosAgileToken(): Promise<string> {
    const credentials = this.getCredentials();
    
    console.log('🔍 Debug credenziali:', {
      endpoint: credentials.endpoint,
      instanceCode: credentials.instanceCode,
      userid: credentials.userid,
      hasPassword: !!credentials.password,
      clientId: credentials.clientId
    });
    
    if (!credentials.instanceCode || !credentials.userid || !credentials.password) {
      const missing = [];
      if (!credentials.instanceCode) missing.push('Codice Istanza');
      if (!credentials.userid) missing.push('Username');
      if (!credentials.password) missing.push('Password');
      throw new Error(`Credenziali EcosAgile incomplete. Mancano: ${missing.join(', ')}`);
    }

    const tokenUrl = `${credentials.endpoint}/${credentials.instanceCode}/api.pm?ApiName=TokenGet`;
    
    // Prepara i dati per TokenGet (formato Form URL Encoded)
    const formData = new URLSearchParams();
    formData.append('Userid', credentials.userid);
    formData.append('Password', credentials.password);
    formData.append('ClientID', credentials.clientId);

    console.log('🔐 Richiesta token EcosAgile:', tokenUrl);
    console.log('📤 Dati inviati:', {
      Userid: credentials.userid,
      hasPassword: !!credentials.password,
      ClientID: credentials.clientId
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log('📥 Risposta HTTP:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore HTTP completo:', errorText);
      throw new Error(`Errore TokenGet: ${response.status} ${response.statusText}. Dettagli: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('📄 Risposta EcosAgile raw:', responseText);
    
    let data: any;
    try {
      data = JSON.parse(responseText);
      
      // Check if it's an EcosAgile XML error response converted to JSON
      if (data.ECOSAGILE_TABLE_DATA && data.ECOSAGILE_TABLE_DATA.ECOSAGILE_ERROR_MESSAGE) {
        const error = data.ECOSAGILE_TABLE_DATA.ECOSAGILE_ERROR_MESSAGE;
        if (error.CODE === 'FAIL') {
          throw new Error(`EcosAgile API Error: ${error.USERMESSAGE || error.MESSAGE || 'Errore sconosciuto'}`);
        }
      }
      
      // Check for success token response (EcosAgile format)
      if (data.ECOSAGILE_TABLE_DATA && 
          data.ECOSAGILE_TABLE_DATA.ECOSAGILE_DATA && 
          data.ECOSAGILE_TABLE_DATA.ECOSAGILE_DATA.ECOSAGILE_DATA_ROW) {
        const authToken = data.ECOSAGILE_TABLE_DATA.ECOSAGILE_DATA.ECOSAGILE_DATA_ROW.AuthToken;
        if (authToken) {
          console.log('✅ Token EcosAgile ottenuto con successo');
          return authToken;
        }
      }
      
    } catch (parseError) {
      console.error('❌ Errore parsing JSON:', parseError);
      throw new Error(`Risposta API non è JSON valido: ${responseText}`);
    }
    
    console.log('📦 Dati parsati:', data);
    throw new Error('Formato risposta EcosAgile non riconosciuto');
  }

  // Funzione per testare la connessione API
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    const credentials = this.getCredentials();
    
    if (credentials.useMock) {
      return { success: true, message: 'Usando dati mock per testing' };
    }

    try {
      // Test connessione EcosAgile tramite TokenGet
      const token = await this.getEcosAgileToken();
      return { success: true, message: 'Connessione EcosAgile riuscita e token ottenuto' };
    } catch (error: any) {
      console.error('❌ Errore catturato:', error);
      let errorMessage = `Errore connessione EcosAgile: ${error.message}`;
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Errore di connessione - possibile problema CORS o rete. Verifica le credenziali.';
      }
      
      return { success: false, message: errorMessage };
    }
  }

  static async fetchActiveEmployees(): Promise<CompanyApiEmployee[]> {
    const credentials = this.getCredentials();
    
    // Se siamo in modalità mock, usa i dati di test
    if (credentials.useMock) {
      await this.delay(1000); // Simula latenza di rete
      console.log('🔄 Usando dati MOCK per testing');
      return MOCK_COMPANY_EMPLOYEES.filter(emp => emp.status === 'active');
    }

    // Chiamata API EcosAgile reale
    try {
      console.log('🌐 Chiamando API EcosAgile');
      
      // Primo: ottieni il token di autenticazione
      const token = await this.getEcosAgileToken();
      
      // Secondo: chiama PeopleExpressGetAll
      const apiUrl = `${credentials.endpoint}/${credentials.instanceCode}/api.pm?ApiName=PeopleExpressGetAll&AuthToken=${token}`;
      
      const formData = new URLSearchParams();
      // Nessun parametro aggiuntivo necessario per ottenere tutti i dipendenti
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`Errore API EcosAgile: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📄 Risposta PeopleExpressGetAll:', responseText.substring(0, 500) + '...');
      
      const data = JSON.parse(responseText);
      
      // Controlla errori EcosAgile
      if (data.ECOSAGILE_TABLE_DATA && data.ECOSAGILE_TABLE_DATA.ECOSAGILE_ERROR_MESSAGE) {
        const error = data.ECOSAGILE_TABLE_DATA.ECOSAGILE_ERROR_MESSAGE;
        if (error.CODE === 'FAIL') {
          throw new Error(`Errore EcosAgile: ${error.USERMESSAGE || error.MESSAGE || 'Errore sconosciuto'}`);
        }
      }

      // Estrai i dati dei dipendenti dal formato EcosAgile
      let employees: any[] = [];
      
      if (data.ECOSAGILE_TABLE_DATA && data.ECOSAGILE_TABLE_DATA.ECOSAGILE_DATA) {
        const ecosData = data.ECOSAGILE_TABLE_DATA.ECOSAGILE_DATA.ECOSAGILE_DATA_ROW;
        if (Array.isArray(ecosData)) {
          employees = ecosData;
        } else if (ecosData) {
          employees = [ecosData]; // Singolo record
        }
      }
      
      console.log(`📋 Trovati ${employees.length} dipendenti da EcosAgile`);

      // Converte dal formato EcosAgile al formato standard
      const mappedEmployees = employees
        .filter(emp => !emp.Delete || emp.Delete === '0') // Solo dipendenti non cancellati
        .map(emp => this.mapEcosAgileToStandardFormat(emp));
      
      console.log(`✅ Importati ${mappedEmployees.length} dipendenti da EcosAgile`);
      return mappedEmployees;

    } catch (error: any) {
      console.error('❌ Errore EcosAgile, usando fallback mock:', error.message);
      
      // Fallback ai dati mock in caso di errore
      await this.delay(500);
      return MOCK_COMPANY_EMPLOYEES.filter(emp => emp.status === 'active');
    }
  }

  // Funzione per mappare la risposta EcosAgile al formato standard
  private static mapEcosAgileToStandardFormat(ecosEmployee: any): CompanyApiEmployee {
    return {
      employeeId: ecosEmployee.EmplID || ecosEmployee.EmplCode || ecosEmployee.ID || 'N/A',
      firstName: ecosEmployee.NameFirst || ecosEmployee.Nome || ecosEmployee.FirstName || 'N/A',
      lastName: ecosEmployee.NameLast || ecosEmployee.Cognome || ecosEmployee.LastName || 'N/A',
      email: ecosEmployee.EMail || ecosEmployee.Email || ecosEmployee.email || '',
      position: ecosEmployee.Position || ecosEmployee.JobTitle || ecosEmployee.Posizione || 'Non specificato',
      department: ecosEmployee.Department || ecosEmployee.Dipartimento || 'Non specificato',
      hireDate: ecosEmployee.HireDate || ecosEmployee.DataAssunzione || new Date().toISOString().split('T')[0],
      phone: ecosEmployee.Phone || ecosEmployee.Telefono || ecosEmployee.PhoneNumber || '',
      status: (!ecosEmployee.Delete || ecosEmployee.Delete === '0') ? 'active' : 'inactive'
    };
  }

  // Funzione per mappare la risposta di API generiche al formato standard
  private static mapApiResponseToStandardFormat(apiResponse: any): CompanyApiEmployee {
    // Adatta questi campi al formato di API generiche
    return {
      employeeId: apiResponse.id || apiResponse.employeeId || apiResponse.employee_id,
      firstName: apiResponse.firstName || apiResponse.first_name || apiResponse.nome,
      lastName: apiResponse.lastName || apiResponse.last_name || apiResponse.cognome,
      email: apiResponse.email || apiResponse.emailAddress,
      position: apiResponse.position || apiResponse.job_title || apiResponse.posizione,
      department: apiResponse.department || apiResponse.dept || apiResponse.dipartimento,
      hireDate: apiResponse.hireDate || apiResponse.hire_date || apiResponse.dataAssunzione,
      phone: apiResponse.phone || apiResponse.telefono || apiResponse.phoneNumber,
      status: apiResponse.status || (apiResponse.active ? 'active' : 'inactive')
    };
  }

  static async syncEmployees(): Promise<Employee[]> {
    const companyEmployees = await this.fetchActiveEmployees();
    return companyEmployees.map(this.mapToLocalEmployee);
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

  // Funzione per salvare le credenziali
  static saveCredentials(credentials: Partial<ApiCredentials>): void {
    const current = this.getCredentials();
    const updated = { ...current, ...credentials };
    localStorage.setItem('hr-tracker-api-settings', JSON.stringify(updated));
  }

  // Funzione per forzare il reset ai defaults corretti
  static resetToCorrectDefaults(): void {
    const correctDefaults = {
      endpoint: 'https://ha.ecosagile.com',
      apiKey: 'your-api-key',
      version: 'v1',
      useMock: true,
      instanceCode: 'ee',
      userid: 'TUO_USERNAME',
      password: 'TUA_PASSWORD', 
      clientId: '16383',
      ecosApiAuthToken: '039b969c-339d-4316-9c84-e4bfe1a77f3f',
      urlCalToken: '0AF0QFNRF5HPS5FJT6MMWF0DI',
      apiPassword: 'dG2ZhGyt!'
    };
    localStorage.setItem('hr-tracker-api-settings', JSON.stringify(correctDefaults));
  }

  // Funzione per attivare/disattivare la modalità mock
  static toggleMockMode(useMock: boolean): void {
    this.saveCredentials({ useMock });
  }
}