'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Mail, MessageSquare } from 'lucide-react';
import { RealNotificationService } from './notification-center';
import { toast } from 'sonner';
import { Call, Employee } from '@/types';

interface SendNotificationButtonProps {
  call: Call;
  employee: Employee;
  type: 'reminder' | 'overdue';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function SendNotificationButton({ 
  call, 
  employee, 
  type, 
  variant = 'outline',
  size = 'sm',
  className 
}: SendNotificationButtonProps) {
  const [sending, setSending] = useState(false);

  const sendNotification = async () => {
    setSending(true);
    
    try {
      let result;
      
      if (type === 'reminder') {
        const callDate = new Date(call.dataSchedulata).toLocaleDateString('it-IT');
        const callTime = new Date(call.dataSchedulata).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        result = await RealNotificationService.sendCallReminder(
          call.id,
          `${employee.nome} ${employee.cognome}`,
          employee.email,
          employee.telefono || '',
          callDate,
          callTime
        );
      } else if (type === 'overdue') {
        const today = new Date();
        const callDate = new Date(call.dataSchedulata);
        const daysOverdue = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
        
        result = await RealNotificationService.sendOverdueAlert(
          call.id,
          `${employee.nome} ${employee.cognome}`,
          employee.email,
          employee.telefono || '',
          daysOverdue
        );
      }

      if (result?.success) {
        toast.success(
          type === 'reminder' 
            ? `Promemoria inviato a ${employee.nome}` 
            : `Avviso ritardo inviato a ${employee.nome}`
        );
      } else {
        toast.error(`Errore invio notifica: ${result?.error || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Errore di rete durante l\'invio');
    } finally {
      setSending(false);
    }
  };

  const buttonText = type === 'reminder' ? 'Invia Promemoria' : 'Invia Avviso';
  const icon = type === 'reminder' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={sendNotification}
      disabled={sending}
    >
      {sending ? (
        <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
      ) : (
        icon
      )}
      <span className="ml-2">
        {sending ? 'Invio...' : buttonText}
      </span>
    </Button>
  );
}

// Componente dropdown per scegliere il tipo di notifica
export function NotificationDropdown({ 
  call, 
  employee,
  className 
}: {
  call: Call;
  employee: Employee;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center"
      >
        <Send className="w-4 h-4 mr-2" />
        Notifica
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Trigger reminder notification
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-4 h-4 mr-2 text-blue-500" />
              Invia Promemoria
            </button>
            
            {call.status === 'scheduled' && new Date(call.dataSchedulata) < new Date() && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Trigger overdue notification
                }}
                className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-orange-500" />
                Invia Avviso Ritardo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay per chiudere il dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}