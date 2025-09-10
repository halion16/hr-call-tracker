import { useState, useEffect } from 'react';
import { getTimeUntilCall } from '@/lib/utils';

export function useCountdown(callDate: string | Date) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeUntilCall(callDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilCall(callDate));
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [callDate]);

  return timeRemaining;
}