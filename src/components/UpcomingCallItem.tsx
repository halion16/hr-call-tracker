'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Timer, MoreHorizontal, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDateTime, getCallStatusColor } from '@/lib/utils';
import { Call } from '@/types';

interface UpcomingCallItemProps {
  call: Call;
  onViewDetails: (id: string) => void;
}

export function UpcomingCallItem({ call, onViewDetails }: UpcomingCallItemProps) {
  const timeRemaining = useCountdown(call.dataSchedulata);

  const getUrgencyIcon = () => {
    if (timeRemaining.isOverdue) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (timeRemaining.days === 0 && timeRemaining.hours < 2) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    } else if (timeRemaining.days === 0 && timeRemaining.hours < 24) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <Timer className="h-5 w-5 text-green-500" />;
    }
  };

  const getUrgencyColors = () => {
    if (timeRemaining.isOverdue) {
      return 'text-red-600 font-bold';
    } else if (timeRemaining.days === 0 && timeRemaining.hours < 2) {
      return 'text-orange-600 font-semibold';
    } else if (timeRemaining.days === 0 && timeRemaining.hours < 24) {
      return 'text-yellow-600 font-medium';
    } else {
      return 'text-green-600 font-medium';
    }
  };

  return (
    <div className="flex items-center justify-between smooth-hover rounded-lg p-2 -m-2 fade-in">
      <div className="flex-1">
        <div className="mb-1.5">
          <p className="font-medium">
            {call.employee.nome} {call.employee.cognome}
          </p>
          <p className="text-sm text-muted-foreground">
            {call.employee.posizione} - {call.employee.dipartimento}
          </p>
        </div>
        <div className="flex items-center justify-center mb-1.5">
          <div className="flex items-center gap-2">
            {getUrgencyIcon()}
            <span className={`text-base ${getUrgencyColors()}`}>
              {timeRemaining.formattedString}
            </span>
          </div>
        </div>
        <p className="text-sm text-blue-600">
          {formatDateTime(call.dataSchedulata)}
        </p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 scale-hover">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">
                {call.employee.nome} {call.employee.cognome}
              </h4>
              <p className="text-sm text-muted-foreground">
                {call.employee.email}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-muted-foreground">Posizione:</span>
                <p>{call.employee.posizione}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Dipartimento:</span>
                <p>{call.employee.dipartimento}</p>
              </div>
            </div>
            
            <div>
              <span className="font-medium text-muted-foreground text-xs">Data e Ora:</span>
              <p className="text-sm">{formatDateTime(call.dataSchedulata)}</p>
            </div>
            
            {call.note && (
              <div>
                <span className="font-medium text-muted-foreground text-xs">Note:</span>
                <p className="text-sm">{call.note}</p>
              </div>
            )}
            
            <div>
              <span className="font-medium text-muted-foreground text-xs">Stato:</span>
              <span className={`inline-block px-2 py-1 rounded-full text-xs ${getCallStatusColor(call.status)}`}>
                {call.status === 'scheduled' ? 'Programmata' :
                 call.status === 'completed' ? 'Completata' :
                 call.status === 'cancelled' ? 'Annullata' :
                 call.status === 'suspended' ? 'Sospesa' :
                 call.status === 'rescheduled' ? 'Riprogrammata' : call.status}
              </span>
            </div>
            
            <div className="flex items-center gap-1 pt-2 border-t">
              <Timer className="h-3 w-3" />
              <span className={`text-xs font-medium ${
                timeRemaining.isOverdue 
                  ? 'text-red-600' 
                  : timeRemaining.days === 0 && timeRemaining.hours < 2
                    ? 'text-orange-600'
                    : 'text-green-600'
              }`}>
                {timeRemaining.formattedString}
              </span>
            </div>
            
            <Button 
              size="sm" 
              className="w-full mt-3 scale-hover"
              onClick={() => onViewDetails(call.id)}
            >
              Vai ai Dettagli Completi
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}