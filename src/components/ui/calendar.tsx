'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, selected, onSelect, disabled, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(() => {
      return selected || new Date();
    });

    const today = new Date();
    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = currentDate.getDay();
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const handlePrevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateSelect = (day: number) => {
      if (disabled) return;
      const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      onSelect?.(selectedDate);
    };

    const isDateSelected = (day: number) => {
      if (!selected) return false;
      return selected.getDate() === day &&
             selected.getMonth() === currentMonth.getMonth() &&
             selected.getFullYear() === currentMonth.getFullYear();
    };

    const isToday = (day: number) => {
      return today.getDate() === day &&
             today.getMonth() === currentMonth.getMonth() &&
             today.getFullYear() === currentMonth.getFullYear();
    };

    return (
      <div ref={ref} className={cn('p-3 border rounded-md', className)} {...props}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            disabled={disabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={disabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(dayName => (
            <div key={dayName} className="text-center text-xs font-medium text-muted-foreground p-1">
              {dayName}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div key={index} className="aspect-square">
              {day && (
                <Button
                  variant={isDateSelected(day) ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'w-full h-full text-xs',
                    isToday(day) && !isDateSelected(day) && 'bg-accent text-accent-foreground',
                    isDateSelected(day) && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                >
                  {day}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
Calendar.displayName = 'Calendar';

export { Calendar };