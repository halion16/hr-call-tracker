// Theme management utility
export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'hr-tracker-theme';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = 'system';
  private listeners: Array<(theme: Theme) => void> = [];

  private constructor() {
    this.loadTheme();
    this.applySystemTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  // Load theme from localStorage
  private loadTheme(): void {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      this.currentTheme = saved;
    }
  }

  // Save theme to localStorage
  private saveTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  // Apply system theme preference
  private applySystemTheme(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (this.currentTheme === 'system') {
        this.updateDOMTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    this.updateDOMTheme();
  }

  // Update DOM classes based on theme
  private updateDOMTheme(): void {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    const isDark = this.getEffectiveTheme() === 'dark';

    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
    }
  }

  // Get the currently effective theme (resolving 'system')
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  // Get current theme setting
  getTheme(): Theme {
    return this.currentTheme;
  }

  // Set theme
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.saveTheme(theme);
    this.updateDOMTheme();
    this.notifyListeners();
  }

  // Toggle between light and dark (smart toggle)
  toggleTheme(): void {
    const effective = this.getEffectiveTheme();
    const newTheme = effective === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // Cycle through all theme options
  cycleTheme(): void {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.setTheme(nextTheme);
  }

  // Subscribe to theme changes
  subscribe(callback: (theme: Theme) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentTheme));
  }

  // Initialize theme on app start
  initialize(): void {
    this.updateDOMTheme();
  }

  // Get theme display info
  getThemeInfo(): {
    current: Theme;
    effective: 'light' | 'dark';
    icon: string;
    label: string;
  } {
    const effective = this.getEffectiveTheme();
    
    const themeInfo = {
      light: { icon: '☀️', label: 'Modalità Chiara' },
      dark: { icon: '🌙', label: 'Modalità Scura' },
      system: { icon: '💻', label: 'Sistema' }
    };

    return {
      current: this.currentTheme,
      effective,
      icon: themeInfo[this.currentTheme].icon,
      label: themeInfo[this.currentTheme].label
    };
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();