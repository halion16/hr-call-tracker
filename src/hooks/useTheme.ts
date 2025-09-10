import { useState, useEffect } from 'react';
import { Theme, themeManager } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => themeManager.getTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => 
    themeManager.getEffectiveTheme()
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme manager
    themeManager.initialize();
    
    // Subscribe to theme changes
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setTheme(newTheme);
      setEffectiveTheme(themeManager.getEffectiveTheme());
    });

    // Update effective theme on system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(themeManager.getEffectiveTheme());
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    setMounted(true);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme]);

  const setThemeValue = (newTheme: Theme) => {
    themeManager.setTheme(newTheme);
  };

  const toggleTheme = () => {
    themeManager.toggleTheme();
  };

  const cycleTheme = () => {
    themeManager.cycleTheme();
  };

  const themeInfo = themeManager.getThemeInfo();

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return {
      theme: 'system' as Theme,
      effectiveTheme: 'light' as const,
      setTheme: () => {},
      toggleTheme: () => {},
      cycleTheme: () => {},
      themeInfo: {
        current: 'system' as Theme,
        effective: 'light' as const,
        icon: '💻',
        label: 'Sistema'
      },
      mounted: false
    };
  }

  return {
    theme,
    effectiveTheme,
    setTheme: setThemeValue,
    toggleTheme,
    cycleTheme,
    themeInfo,
    mounted
  };
}