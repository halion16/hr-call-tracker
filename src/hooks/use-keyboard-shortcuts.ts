import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip se siamo in un input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Hook specifico per ricerca globale
export function useGlobalSearch(onFocus: () => void) {
  useKeyboardShortcuts([
    {
      key: '/',
      callback: onFocus,
      description: 'Focus ricerca'
    },
    {
      key: 'k',
      ctrlKey: true,
      callback: onFocus,
      description: 'Ctrl+K - Quick search'
    }
  ]);
}

// Shortcuts comuni per HR
export function useHRShortcuts(actions: {
  newCall?: () => void;
  syncEmployees?: () => void;
  showHelp?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];
  
  if (actions.newCall) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      callback: actions.newCall,
      description: 'Ctrl+N - Nuova chiamata'
    });
  }
  
  if (actions.syncEmployees) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      callback: actions.syncEmployees,
      description: 'Ctrl+R - Sincronizza dipendenti'
    });
  }
  
  if (actions.showHelp) {
    shortcuts.push({
      key: '?',
      shiftKey: true,
      callback: actions.showHelp,
      description: 'Shift+? - Mostra aiuto'
    });
  }
  
  useKeyboardShortcuts(shortcuts);
  
  return shortcuts;
}