import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function isUpcoming(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d > now;
}

export function isThisWeek(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)
  endOfWeek.setHours(23, 59, 59, 999);
  
  return d >= startOfWeek && d <= endOfWeek;
}

export function getCallStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800';
    case 'rescheduled':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTimeUntilCall(callDate: string | Date): {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formattedString: string;
} {
  const now = new Date().getTime();
  const callTime = new Date(callDate).getTime();
  const total = callTime - now;
  
  const isOverdue = total < 0;
  const absoluteTotal = Math.abs(total);
  
  const days = Math.floor(absoluteTotal / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absoluteTotal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absoluteTotal % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absoluteTotal % (1000 * 60)) / 1000);
  
  let formattedString = '';
  if (isOverdue) {
    if (days > 0) {
      formattedString = `In ritardo di ${days} giorni ${hours}h`;
    } else if (hours > 0) {
      formattedString = `In ritardo di ${hours}h ${minutes}m`;
    } else {
      formattedString = `In ritardo di ${minutes}m`;
    }
  } else {
    if (days > 0) {
      formattedString = `Tra ${days} giorni ${hours}h`;
    } else if (hours > 0) {
      formattedString = `Tra ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      formattedString = `Tra ${minutes} minuti`;
    } else {
      formattedString = 'Ora!';
    }
  }
  
  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    isOverdue,
    formattedString
  };
}