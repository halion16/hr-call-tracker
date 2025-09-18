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
      // Filtra solo i dipendenti attivi
      formData.append('PersonStatusCode', "='A'");
      formData.append('TerminationDate', "=''");
      
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
      console.log('📄 Risposta PeopleExpressGetAll (primi 500 char):', responseText.substring(0, 500) + '...');

      const data = JSON.parse(responseText);

      // 🔍 LOG COMPLETO: Struttura della risposta EcosAgile
      console.log('🗂️ STRUTTURA COMPLETA RISPOSTA EcosAgile:', {
        'Top level keys': Object.keys(data),
        'ECOSAGILE_TABLE_DATA keys': data.ECOSAGILE_TABLE_DATA ? Object.keys(data.ECOSAGILE_TABLE_DATA) : 'N/A',
        'Dati completi': data
      });
      
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

      // 📊 TABELLA DATI COMPLETA PER VERIFICA
      console.log('📊 TABELLA DATI ECOSAGILE COMPLETA:');
      console.table(employees);

      // SALVA DATI GREZZI PER FACILE ACCESSO
      localStorage.setItem('ecosagile-raw-data', JSON.stringify(employees, null, 2));
      console.log('💾 Dati grezzi salvati in localStorage con chiave: "ecosagile-raw-data"');

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

  // Converte date italiane (DD/MM/YYYY) in formato ISO
  private static parseItalianDate(dateString: string): string {
    if (!dateString || dateString.trim() === '') return '';

    try {
      // Formato EcosAgile: "30/06/2026 00:00:00" o "30/06/2026"
      const cleanDate = dateString.split(' ')[0]; // Rimuovi l'orario
      const parts = cleanDate.split('/');

      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Converte in formato ISO: YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      console.warn('❌ Errore parsing data italiana:', dateString, error);
    }

    return '';
  }

  // Funzione per mappare la risposta EcosAgile al formato standard
  private static mapEcosAgileToStandardFormat(ecosEmployee: any): CompanyApiEmployee {
    // 🔍 LOG DETTAGLIATO: Mostra tutti i campi ricevuti dall'API EcosAgile
    console.log('📋 DATI RAW EcosAgile per dipendente:', {
      'Tutti i campi ricevuti': Object.keys(ecosEmployee),
      'ID Fields': {
        EmplID: ecosEmployee.EmplID,
        EmplCode: ecosEmployee.EmplCode,
        ID: ecosEmployee.ID
      },
      'Name Fields': {
        NameFirst: ecosEmployee.NameFirst,
        Nome: ecosEmployee.Nome,
        FirstName: ecosEmployee.FirstName,
        NameLast: ecosEmployee.NameLast,
        Cognome: ecosEmployee.Cognome,
        LastName: ecosEmployee.LastName
      },
      'Contact Fields': {
        EMail: ecosEmployee.EMail,
        Email: ecosEmployee.Email,
        email: ecosEmployee.email,
        Phone: ecosEmployee.Phone,
        Telefono: ecosEmployee.Telefono,
        PhoneNumber: ecosEmployee.PhoneNumber
      },
      'Job Fields': {
        Position: ecosEmployee.Position,
        JobTitle: ecosEmployee.JobTitle,
        Posizione: ecosEmployee.Posizione,
        Department: ecosEmployee.Department,
        Dipartimento: ecosEmployee.Dipartimento
      },
      'DATE FIELDS - IMPORTANTE per il problema': {
        HireDate: ecosEmployee.HireDate,
        DataAssunzione: ecosEmployee.DataAssunzione,
        StartDate: ecosEmployee.StartDate,
        EmploymentDate: ecosEmployee.EmploymentDate,
        // Controlla anche altri possibili nomi di campo data
        Date: ecosEmployee.Date,
        DateHired: ecosEmployee.DateHired,
        JoinDate: ecosEmployee.JoinDate,
        ContractStartDate: ecosEmployee.ContractStartDate
      },
      'Status Fields': {
        Delete: ecosEmployee.Delete,
        Active: ecosEmployee.Active,
        Status: ecosEmployee.Status,
        PersonStatusCode: ecosEmployee.PersonStatusCode
      },
      'Altri campi disponibili': ecosEmployee
    });

    // Converte le date dal formato italiano
    const contractEndDate = this.parseItalianDate(ecosEmployee.ContractEndDate);
    const hireDate = this.parseItalianDate(ecosEmployee.HireDate);
    const birthDate = this.parseItalianDate(ecosEmployee.BirthDate);

    console.log('🗓️ CONVERSIONE DATE:', {
      'ContractEndDate originale': ecosEmployee.ContractEndDate,
      'ContractEndDate convertita': contractEndDate,
      'HireDate originale': ecosEmployee.HireDate,
      'HireDate convertita': hireDate,
      'BirthDate originale': ecosEmployee.BirthDate,
      'BirthDate convertita': birthDate
    });

    const mappedEmployee = {
      employeeId: ecosEmployee.EmplID || ecosEmployee.EmplCode || ecosEmployee.ID || 'N/A',
      firstName: ecosEmployee.NameFirst || ecosEmployee.Nome || ecosEmployee.FirstName || 'N/A',
      lastName: ecosEmployee.NameLast || ecosEmployee.Cognome || ecosEmployee.LastName || 'N/A',
      email: ecosEmployee.EMail || ecosEmployee.Email || ecosEmployee.email || '',
      position: ecosEmployee.CategoryDescShort || ecosEmployee.Position || ecosEmployee.JobTitle || ecosEmployee.Posizione || 'Non specificato',
      department: ecosEmployee.DepartmentDescShort || ecosEmployee.Department || ecosEmployee.Dipartimento || 'Non specificato',
      hireDate: hireDate || new Date().toISOString().split('T')[0], // Ora uso HireDate correttamente
      phone: ecosEmployee.Phone || ecosEmployee.Telefono || ecosEmployee.PhoneNumber || '',
      status: (!ecosEmployee.Delete || ecosEmployee.Delete === '0') ? 'active' : 'inactive',
      contractExpiryDate: contractEndDate
    };

    console.log('✅ MAPPATO a formato standard:', mappedEmployee);
    return mappedEmployee;
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
      isActive: companyEmployee.status === 'active',
      contractExpiryDate: companyEmployee.contractExpiryDate
    };
  }

  // Funzione per salvare le credenziali
  static saveCredentials(credentials: Partial<ApiCredentials>): void {
    const current = this.getCredentials();
    const updated = { ...current, ...credentials };
    localStorage.setItem('hr-tracker-api-settings', JSON.stringify(updated));
  }

  // 📊 Funzione per salvare un report dettagliato dei dati EcosAgile
  private static saveDataAnalysisReport(rawEmployees: any[], mappedEmployees: CompanyApiEmployee[], fullResponse: any): void {
    try {
      console.log('🔄 Inizio creazione report analisi...', { rawCount: rawEmployees.length, mappedCount: mappedEmployees.length });

      // Crea un report semplificato per evitare errori di parsing
      const report = {
        timestamp: new Date().toISOString(),
        totalEmployees: rawEmployees.length,
        mappedEmployees: mappedEmployees.length,
        availableFields: rawEmployees.length > 0 ? Object.keys(rawEmployees[0]) : [],
        sampleRawEmployee: rawEmployees.length > 0 ? rawEmployees[0] : null,
        sampleMappedEmployee: mappedEmployees.length > 0 ? mappedEmployees[0] : null,
        rawDataSample: rawEmployees.slice(0, 5), // Prime 5 righe per verifica
        sampleProblematicDates: this.findProblematicDates(rawEmployees.slice(0, 10)),
        fullApiResponse: fullResponse
      };

      // Salva nel localStorage per facile accesso
      localStorage.setItem('ecosagile-data-analysis', JSON.stringify(report, null, 2));

      // Log il summary per console
      console.log('📊 REPORT DATI EcosAgile salvato con successo in localStorage!');
      console.log('📋 SUMMARY REPORT:', {
        'Dipendenti trovati': rawEmployees.length,
        'Campi disponibili': report.availableFields,
        'Campi che contengono "Date"': report.availableFields.filter(f => f.toLowerCase().includes('date')),
        'Primo dipendente (sample)': rawEmployees[0] || null
      });

      // Mostra i primi 3 dipendenti per debug
      if (rawEmployees.length > 0) {
        console.log('🔍 PRIMI 3 DIPENDENTI (per verifica date):', rawEmployees.slice(0, 3));
      }

      console.log('✅ Report salvato con chiave: "ecosagile-data-analysis"');

    } catch (error) {
      console.error('❌ Errore nel salvataggio report:', error);

      // Salvataggio di emergenza semplificato
      try {
        const emergencyReport = {
          timestamp: new Date().toISOString(),
          totalEmployees: rawEmployees.length,
          error: error.message,
          sampleData: rawEmployees.slice(0, 2),
          availableFields: rawEmployees.length > 0 ? Object.keys(rawEmployees[0]) : []
        };
        localStorage.setItem('ecosagile-emergency-report', JSON.stringify(emergencyReport, null, 2));
        console.log('💾 Report di emergenza salvato con chiave: "ecosagile-emergency-report"');
      } catch (emergencyError) {
        console.error('❌ Anche il salvataggio di emergenza è fallito:', emergencyError);
      }
    }
  }

  // Helper per trovare date problematiche
  private static findProblematicDates(employees: any[]): any {
    const problematicDates = [];

    employees.forEach((emp, index) => {
      Object.keys(emp).forEach(field => {
        if (field.toLowerCase().includes('date') && emp[field]) {
          const isValid = !isNaN(Date.parse(emp[field]));
          if (!isValid) {
            problematicDates.push({
              employeeIndex: index,
              field: field,
              value: emp[field],
              type: typeof emp[field]
            });
          }
        }
      });
    });

    return problematicDates;
  }

  // Analizza i campi data comuni
  private static analyzeCommonDateFields(employees: any[]): any {
    if (employees.length === 0) return {};

    const dateFields = {};
    const sampleEmployee = employees[0];

    Object.keys(sampleEmployee).forEach(field => {
      const value = sampleEmployee[field];
      if (typeof value === 'string' && (
        field.toLowerCase().includes('date') ||
        field.toLowerCase().includes('data') ||
        field.toLowerCase().includes('hire') ||
        field.toLowerCase().includes('assunzione') ||
        field.toLowerCase().includes('start') ||
        field.toLowerCase().includes('employment')
      )) {
        dateFields[field] = {
          sampleValue: value,
          type: typeof value,
          appearsInAllEmployees: employees.every(emp => emp[field] !== undefined)
        };
      }
    });

    return dateFields;
  }

  // 🔧 FUNZIONE HELPER per estrarre dati dal browser
  static extractDataAnalysis(): any {
    const data = localStorage.getItem('ecosagile-data-analysis');
    if (!data) {
      console.log('❌ Nessun dato di analisi trovato. Esegui prima una sincronizzazione con EcosAgile.');
      return null;
    }

    const report = JSON.parse(data);
    console.log('📊 DATI ANALISI EcosAgile ESTRATTI:');
    console.log('📋 Per copiare tutti i dati, usa: copy(JSON.parse(localStorage.getItem("ecosagile-data-analysis")))');
    console.log('🗂️ Report completo:', report);

    // Mostra summary dei problemi date
    const dateProblems = report.employeeDataAnalysis.filter(emp =>
      !emp.dateFieldsAnalysis.HireDate.isValid && !emp.dateFieldsAnalysis.DataAssunzione.isValid
    );

    if (dateProblems.length > 0) {
      console.log('⚠️ DIPENDENTI CON PROBLEMI DATE:', dateProblems);
    }

    return report;
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