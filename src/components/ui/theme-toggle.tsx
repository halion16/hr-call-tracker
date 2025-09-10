'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ 
  variant = 'icon', 
  size = 'md', 
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, effectiveTheme, setTheme, toggleTheme, cycleTheme, themeInfo, mounted } = useTheme();

  if (!mounted) {
    // Prevent hydration mismatch
    return (
      <Button variant="outline" size={size === 'sm' ? 'sm' : 'default'}>
        <Monitor className="h-4 w-4" />
        {showLabel && <span className="ml-2">Theme</span>}
      </Button>
    );
  }

  const getIcon = (themeName: string, isEffective = false) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (themeName) {
      case 'light':
        return <Sun {...iconProps} />;
      case 'dark':
        return <Moon {...iconProps} />;
      case 'system':
        return <Monitor {...iconProps} />;
      default:
        return isEffective && effectiveTheme === 'dark' ? <Moon {...iconProps} /> : <Sun {...iconProps} />;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'sm';
      case 'lg': return 'lg';
      default: return 'default';
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={getButtonSize()}
        onClick={toggleTheme}
        className="transition-all duration-200"
        title={`Cambia tema (attuale: ${themeInfo.label})`}
      >
        {getIcon(effectiveTheme, true)}
        {showLabel && (
          <span className="ml-2">
            {themeInfo.label}
          </span>
        )}
      </Button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size={getButtonSize()}
            className="transition-all duration-200"
          >
            {getIcon(effectiveTheme, true)}
            {showLabel && (
              <>
                <span className="ml-2">{themeInfo.label}</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
            {!showLabel && <ChevronDown className="ml-1 h-3 w-3" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="end">
          <div className="space-y-1">
            {[
              { key: 'light', icon: 'Sun', label: 'Modalità Chiara' },
              { key: 'dark', icon: 'Moon', label: 'Modalità Scura' },
              { key: 'system', icon: 'Monitor', label: 'Segui Sistema' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={theme === key ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setTheme(key as any)}
              >
                {getIcon(key)}
                <span className="ml-2">{label}</span>
                {theme === key && effectiveTheme === 'dark' && key === 'system' && (
                  <span className="ml-auto text-xs opacity-70">(Scuro)</span>
                )}
                {theme === key && effectiveTheme === 'light' && key === 'system' && (
                  <span className="ml-auto text-xs opacity-70">(Chiaro)</span>
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default: icon variant
  return (
    <Button
      variant="outline"
      size={getButtonSize()}
      onClick={cycleTheme}
      className="transition-all duration-200 hover:scale-105"
      title={`Cambia tema (attuale: ${themeInfo.label})`}
    >
      {getIcon(effectiveTheme, true)}
    </Button>
  );
}

// Shorthand variants for convenience
export function ThemeToggleButton(props: Omit<ThemeToggleProps, 'variant'>) {
  return <ThemeToggle {...props} variant="button" />;
}

export function ThemeToggleDropdown(props: Omit<ThemeToggleProps, 'variant'>) {
  return <ThemeToggle {...props} variant="dropdown" />;
}