'use client';

import { useEffect } from 'react';
import { CalendarSyncService } from '@/lib/calendar-sync-service';

export function CalendarSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize calendar sync on app load
    const syncStatus = CalendarSyncService.getSyncStatus();
    if (syncStatus.isEnabled) {
      CalendarSyncService.startAutoSync();
    }

    // Cleanup on unmount
    return () => {
      CalendarSyncService.stopAutoSync();
    };
  }, []);

  return <>{children}</>;
}