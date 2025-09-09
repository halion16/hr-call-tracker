export interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  posizione: string;
  dipartimento: string;
  dataAssunzione: string;
  telefono?: string;
  isActive: boolean;
}

export interface Call {
  id: string;
  employeeId: string;
  dataSchedulata: string;
  dataCompletata?: string;
  durata?: number;
  note?: string;
  rating?: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  nextCallDate?: string;
}

export interface User {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: string;
}

export interface CompanyApiEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  hireDate: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface CallFormData {
  dataSchedulata: string;
  note?: string;
  nextCallDate?: string;
}

export interface CallCompletionData {
  dataCompletata: string;
  durata: number;
  note: string;
  rating: number;
  nextCallDate?: string;
}