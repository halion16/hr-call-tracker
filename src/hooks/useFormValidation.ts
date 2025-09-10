import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface FormField {
  value: any;
  error?: string;
  touched?: boolean;
  rules?: ValidationRule[];
}

export interface FormState {
  [key: string]: FormField;
}

export function useFormValidation<T extends FormState>(initialState: T) {
  const [formState, setFormState] = useState<T>(initialState);
  const [isValid, setIsValid] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  // Valida un singolo campo
  const validateField = useCallback((name: keyof T, value: any, rules?: ValidationRule[]): string | null => {
    if (!rules) return null;

    for (const rule of rules) {
      // Required validation
      if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        return rule.message || `${String(name)} è obbligatorio`;
      }

      // Skip other validations if field is empty and not required
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        continue;
      }

      // MinLength validation
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        return rule.message || `${String(name)} deve avere almeno ${rule.minLength} caratteri`;
      }

      // MaxLength validation
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        return rule.message || `${String(name)} non può superare ${rule.maxLength} caratteri`;
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        return rule.message || `${String(name)} non ha un formato valido`;
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          return customError;
        }
      }
    }

    return null;
  }, []);

  // Aggiorna valore campo
  const updateField = useCallback((name: keyof T, value: any, validate = true) => {
    setFormState(prev => {
      const field = prev[name];
      const rules = field?.rules;
      
      let error: string | null = null;
      if (validate && rules) {
        error = validateField(name, value, rules);
      }

      return {
        ...prev,
        [name]: {
          ...field,
          value,
          error: error || undefined,
          touched: true
        }
      };
    });
  }, [validateField]);

  // Valida tutto il form
  const validateForm = useCallback((): boolean => {
    let formIsValid = true;
    const newFormState = { ...formState };

    Object.keys(formState).forEach(key => {
      const field = formState[key as keyof T];
      if (field?.rules) {
        const error = validateField(key as keyof T, field.value, field.rules);
        if (error) {
          formIsValid = false;
          newFormState[key as keyof T] = {
            ...field,
            error,
            touched: true
          };
        }
      }
    });

    if (!formIsValid) {
      setFormState(newFormState as T);
    }

    return formIsValid;
  }, [formState, validateField]);

  // Marca un campo come touched
  const touchField = useCallback((name: keyof T) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched: true
      }
    }));
  }, []);

  // Reset form
  const resetForm = useCallback((newState?: Partial<T>) => {
    const resetState = { ...initialState };
    
    if (newState) {
      Object.keys(newState).forEach(key => {
        if (resetState[key as keyof T]) {
          resetState[key as keyof T] = {
            ...resetState[key as keyof T],
            ...newState[key as keyof T]
          };
        }
      });
    }

    setFormState(resetState);
  }, [initialState]);

  // Calcola se il form è valido
  useEffect(() => {
    let formHasErrors = false;
    let allRequiredFilled = true;

    Object.keys(formState).forEach(key => {
      const field = formState[key as keyof T];
      
      if (field?.error) {
        formHasErrors = true;
      }

      if (field?.rules?.some(rule => rule.required) && (!field.value || (typeof field.value === 'string' && field.value.trim() === ''))) {
        allRequiredFilled = false;
      }
    });

    setHasErrors(formHasErrors);
    setIsValid(!formHasErrors && allRequiredFilled);
  }, [formState]);

  // Helper per ottenere props input
  const getFieldProps = useCallback((name: keyof T) => {
    const field = formState[name];
    return {
      value: field?.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        updateField(name, e.target.value);
      },
      onBlur: () => touchField(name),
      error: field?.touched ? field.error : undefined,
      hasError: Boolean(field?.touched && field?.error)
    };
  }, [formState, updateField, touchField]);

  // Helper per ottenere solo errori visibili
  const getVisibleErrors = useCallback(() => {
    const errors: { [key: string]: string } = {};
    Object.keys(formState).forEach(key => {
      const field = formState[key as keyof T];
      if (field?.touched && field?.error) {
        errors[key] = field.error;
      }
    });
    return errors;
  }, [formState]);

  return {
    formState,
    isValid,
    hasErrors,
    updateField,
    touchField,
    validateForm,
    validateField,
    resetForm,
    getFieldProps,
    getVisibleErrors
  };
}

// Hook per auto-save
export function useAutoSave<T>(
  data: T, 
  saveFunction: (data: T) => Promise<void>, 
  delay = 2000,
  enabled = true
) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        await saveFunction(data);
        setLastSaved(new Date());
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Errore durante il salvataggio');
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [data, saveFunction, delay, enabled]);

  return {
    isSaving,
    lastSaved,
    saveError
  };
}

// Hook per detect conflitti orari
export function useTimeConflictDetection() {
  const [conflicts, setConflicts] = useState<string[]>([]);

  const checkTimeConflict = useCallback(async (
    employeeId: string, 
    scheduledTime: Date,
    excludeCallId?: string
  ): Promise<string[]> => {
    try {
      // Simula check conflicts - in realtà dovrebbe controllare il database
      const existingCalls = JSON.parse(localStorage.getItem('hr-tracker-calls') || '[]');
      
      const conflictingCalls = existingCalls.filter((call: any) => {
        if (excludeCallId && call.id === excludeCallId) return false;
        
        const callTime = new Date(call.dataSchedulata);
        const timeDiff = Math.abs(scheduledTime.getTime() - callTime.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Considera conflitto se entro 1 ora
        return hoursDiff < 1 && (
          call.employeeId === employeeId || 
          call.dipendente?.id === employeeId
        );
      });

      const conflictMessages = conflictingCalls.map((call: any) => 
        `Conflitto con call esistente alle ${new Date(call.dataSchedulata).toLocaleTimeString()}`
      );
      
      setConflicts(conflictMessages);
      return conflictMessages;
    } catch (error) {
      console.error('Errore controllo conflitti:', error);
      return [];
    }
  }, []);

  return {
    conflicts,
    checkTimeConflict
  };
}

// Validation rules comuni
export const commonValidationRules = {
  required: { required: true },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email non valida'
  },
  phone: { 
    pattern: /^[\+]?[0-9\s\-\(\)]{10,}$/,
    message: 'Numero di telefono non valido'
  },
  dateTime: {
    required: true,
    custom: (value: string) => {
      if (!value) return 'Data e ora sono obbligatorie';
      const date = new Date(value);
      const now = new Date();
      if (date <= now) return 'La data deve essere futura';
      if (date > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
        return 'La data non può essere oltre un anno nel futuro';
      }
      return null;
    }
  },
  notes: {
    maxLength: 500,
    message: 'Le note non possono superare 500 caratteri'
  }
};