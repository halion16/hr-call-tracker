'use client';

import { useEffect, useState } from 'react';
import { NotificationService } from '@/lib/notification-service';
import { DigestService } from '@/lib/digest-service';
import { toast } from 'sonner';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeNotifications = async () => {
      try {
        const success = await NotificationService.initialize();
        
        // Initialize digest service
        DigestService.initialize();
        
        if (mounted) {
          setInitialized(true);
          
          if (success) {
            console.log('🔔 Notification service initialized');
            console.log('📊 Digest service initialized');
          } else {
            console.warn('⚠️ Notification service initialization failed');
            toast.warning('Notifiche non disponibili', {
              description: 'Abilita le notifiche nelle impostazioni del browser per ricevere promemoria.'
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        if (mounted) {
          setInitialized(true);
        }
      }
    };

    // Initialize notifications after a short delay to avoid blocking the UI
    const timer = setTimeout(initializeNotifications, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return <>{children}</>;
}