'use client';

import { useEffect } from 'react';
import { themeManager } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize theme on mount
    themeManager.initialize();
  }, []);

  return <>{children}</>;
}