import { useState, useCallback, useEffect } from 'react';
import { validationEngine, ValidationResult, ValidationMessage } from '@/lib/validation';

export interface UseValidationProps {
  entity: string;
  context?: any;
  realTimeValidation?: boolean;
  debounceMs?: number;
}

export interface UseValidationReturn {
  validateField: (field: string, value: any) => ValidationResult;
  validateObject: (object: Record<string, any>) => ValidationResult;
  getFieldErrors: (field: string) => ValidationMessage[];
  getFieldWarnings: (field: string) => ValidationMessage[];
  getFieldInfo: (field: string) => ValidationMessage[];
  clearFieldValidation: (field: string) => void;
  clearAllValidation: () => void;
  hasErrors: boolean;
  hasWarnings: boolean;
  hasInfo: boolean;
  fieldValidations: Record<string, ValidationResult>;
  isValidating: boolean;
}

export function useValidation({ 
  entity, 
  context, 
  realTimeValidation = true,
  debounceMs = 300 
}: UseValidationProps): UseValidationReturn {
  const [fieldValidations, setFieldValidations] = useState<Record<string, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((field: string, value: any): ValidationResult => {
    const result = validationEngine.validateField(entity, field, value, context);
    
    if (realTimeValidation) {
      setFieldValidations(prev => ({
        ...prev,
        [field]: result
      }));
    }
    
    return result;
  }, [entity, context, realTimeValidation]);

  const validateObject = useCallback((object: Record<string, any>): ValidationResult => {
    setIsValidating(true);
    
    const result = validationEngine.validateObject(entity, object, context);
    
    // Update field validations for each field
    const newFieldValidations: Record<string, ValidationResult> = {};
    
    for (const [field, value] of Object.entries(object)) {
      const fieldResult = validationEngine.validateField(entity, field, value, context);
      newFieldValidations[field] = fieldResult;
    }
    
    setFieldValidations(newFieldValidations);
    setIsValidating(false);
    
    return result;
  }, [entity, context]);

  const getFieldErrors = useCallback((field: string): ValidationMessage[] => {
    return fieldValidations[field]?.errors || [];
  }, [fieldValidations]);

  const getFieldWarnings = useCallback((field: string): ValidationMessage[] => {
    return fieldValidations[field]?.warnings || [];
  }, [fieldValidations]);

  const getFieldInfo = useCallback((field: string): ValidationMessage[] => {
    return fieldValidations[field]?.info || [];
  }, [fieldValidations]);

  const clearFieldValidation = useCallback((field: string) => {
    setFieldValidations(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const clearAllValidation = useCallback(() => {
    setFieldValidations({});
  }, []);

  // Computed properties
  const hasErrors = Object.values(fieldValidations).some(validation => validation.errors.length > 0);
  const hasWarnings = Object.values(fieldValidations).some(validation => validation.warnings.length > 0);
  const hasInfo = Object.values(fieldValidations).some(validation => validation.info.length > 0);

  // Update context when it changes
  useEffect(() => {
    if (realTimeValidation && Object.keys(fieldValidations).length > 0) {
      const updatedValidations: Record<string, ValidationResult> = {};
      
      Object.entries(fieldValidations).forEach(([field, previousResult]) => {
        // Re-validate with new context
        const lastValue = previousResult.errors[0]?.value || 
                          previousResult.warnings[0]?.value || 
                          previousResult.info[0]?.value;
        
        if (lastValue !== undefined) {
          updatedValidations[field] = validationEngine.validateField(entity, field, lastValue, context);
        }
      });
      
      if (Object.keys(updatedValidations).length > 0) {
        setFieldValidations(prev => ({ ...prev, ...updatedValidations }));
      }
    }
  }, [context, entity, realTimeValidation, fieldValidations]);

  return {
    validateField,
    validateObject,
    getFieldErrors,
    getFieldWarnings,
    getFieldInfo,
    clearFieldValidation,
    clearAllValidation,
    hasErrors,
    hasWarnings,
    hasInfo,
    fieldValidations,
    isValidating
  };
}