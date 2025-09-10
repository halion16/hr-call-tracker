import { useEffect, useRef } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description?: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], deps: any[] = []) {
  const handlersRef = useRef<KeyboardShortcut[]>([]);

  useEffect(() => {
    handlersRef.current = shortcuts;
  }, [shortcuts, ...deps]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.contentEditable === 'true'
      );

      for (const shortcut of handlersRef.current) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = Boolean(shortcut.ctrl) === Boolean(event.ctrlKey || event.metaKey);
        const shiftMatches = Boolean(shortcut.shift) === Boolean(event.shiftKey);
        const altMatches = Boolean(shortcut.alt) === Boolean(event.altKey);

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Per Escape, permettiamo sempre l'esecuzione anche se un input è focussato
          if (shortcut.key.toLowerCase() === 'escape' || !isInputFocused) {
            if (shortcut.preventDefault !== false) {
              event.preventDefault();
            }
            shortcut.handler(event);
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

export function useModalKeyboardNavigation(
  isOpen: boolean,
  onClose: () => void,
  onSubmit?: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Enter':
          if (event.ctrlKey && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
          break;
        case 'Tab':
          // Mantieni il focus all'interno del modal
          const modal = document.querySelector('[role="dialog"], .modal-container');
          if (modal) {
            const focusableElements = modal.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
              }
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSubmit]);
}

export function useTableNavigation(
  rows: any[],
  onSelectRow?: (index: number) => void,
  onActivateRow?: (index: number) => void
) {
  const selectedIndexRef = useRef<number>(-1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (rows.length === 0) return;

      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      );

      if (isInputFocused) return;

      let newIndex = selectedIndexRef.current;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          newIndex = Math.min(selectedIndexRef.current + 1, rows.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          newIndex = Math.max(selectedIndexRef.current - 1, 0);
          break;
        case 'Enter':
          if (selectedIndexRef.current >= 0 && onActivateRow) {
            event.preventDefault();
            onActivateRow(selectedIndexRef.current);
          }
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = rows.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== selectedIndexRef.current) {
        selectedIndexRef.current = newIndex;
        onSelectRow?.(newIndex);
        
        // Scroll l'elemento in vista
        const rowElement = document.querySelector(`[data-row-index="${newIndex}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rows, onSelectRow, onActivateRow]);

  return selectedIndexRef.current;
}

// Hook per focus management automatico
export function useFocusManagement(deps: any[] = []) {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = (element: HTMLElement | null) => {
    focusRef.current = element;
  };

  const restoreFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  const focusFirstInput = (container?: HTMLElement) => {
    const target = container || document;
    const firstInput = target.querySelector(
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
    ) as HTMLElement;
    
    if (firstInput) {
      firstInput.focus();
    }
  };

  useEffect(() => {
    // Auto-focus primo input quando componente monta
    const timer = setTimeout(() => focusFirstInput(), 100);
    return () => clearTimeout(timer);
  }, deps);

  return { setFocus, restoreFocus, focusFirstInput };
}

// Utilities per shortcut hints
export const KEYBOARD_SHORTCUTS = {
  global: [
    { key: 'Ctrl+N', description: 'Nuova call' },
    { key: 'Ctrl+F', description: 'Ricerca' },
    { key: 'Ctrl+S', description: 'Salva' },
    { key: 'Escape', description: 'Chiudi modal' }
  ],
  modal: [
    { key: 'Enter', description: 'Conferma' },
    { key: 'Ctrl+Enter', description: 'Salva e continua' },
    { key: 'Escape', description: 'Chiudi' },
    { key: 'Tab', description: 'Naviga campi' }
  ],
  table: [
    { key: '↑↓', description: 'Naviga righe' },
    { key: 'Enter', description: 'Seleziona riga' },
    { key: 'Home/End', description: 'Prima/ultima riga' }
  ]
} as const;