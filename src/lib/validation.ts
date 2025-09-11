// Advanced validation system with custom regex patterns and business rules

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  validator?: (value: any, context?: any) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
}

export interface ValidationMessage {
  ruleId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
}

export class ValidationEngine {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Email validation
    this.addRule('employee', {
      id: 'email-format',
      name: 'Email Format',
      description: 'Validates email format with enhanced pattern',
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: 'Formato email non valido. Usa format: user@domain.com',
      severity: 'error',
      category: 'format'
    });

    // Phone validation
    this.addRule('employee', {
      id: 'phone-italian',
      name: 'Italian Phone Format',
      description: 'Validates Italian phone numbers',
      pattern: /^(\+39\s?)?((38[890])|(34[4-90])|(36[680])|(33[13-90])|(32[89])|(35[01]))(\d{7})$|^(\+39\s?)?(0\d{1,4})(\s?\d{4,8})$/,
      message: 'Numero di telefono italiano non valido. Usa formato: +39 xxx xxx xxxx o 0xx xxx xxxx',
      severity: 'warning',
      category: 'format'
    });

    // Name validation
    this.addRule('employee', {
      id: 'name-format',
      name: 'Name Format',
      description: 'Validates name contains only letters and common characters',
      pattern: /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s'-]{2,50}$/,
      message: 'Il nome deve contenere solo lettere, spazi, apostrofi e trattini (2-50 caratteri)',
      severity: 'error',
      category: 'format'
    });

    // Call notes validation - More permissive
    this.addRule('call', {
      id: 'notes-quality',
      name: 'Notes Quality',
      description: 'Validates call notes for completeness and quality',
      validator: (value: string) => {
        if (!value) return true; // Optional field
        const words = value.trim().split(/\s+/).length;
        return words >= 2; // At least 2 words - more permissive
      },
      message: 'Le note dovrebbero contenere almeno 2 parole per essere significative',
      severity: 'info',
      category: 'business'
    });

    // Call duration validation
    this.addRule('call', {
      id: 'duration-reasonable',
      name: 'Reasonable Duration',
      description: 'Validates call duration is within reasonable limits',
      validator: (value: number) => {
        if (!value) return true;
        return value >= 1 && value <= 480; // 1 minute to 8 hours
      },
      message: 'La durata deve essere tra 1 minuto e 8 ore (480 minuti)',
      severity: 'error',
      category: 'business'
    });

    // Future date validation
    this.addRule('call', {
      id: 'future-date',
      name: 'Future Date',
      description: 'Validates scheduled dates are not in the past',
      validator: (value: string, context?: { allowPast?: boolean }) => {
        if (!value) return true;
        const date = new Date(value);
        const now = new Date();
        // Allow future dates and times, including later times today
        return context?.allowPast || date >= now;
      },
      message: 'La data non può essere nel passato',
      severity: 'error',
      category: 'business'
    });

    // Working hours validation
    this.addRule('call', {
      id: 'working-hours',
      name: 'Working Hours',
      description: 'Validates calls are scheduled during working hours',
      validator: (value: string) => {
        if (!value) return true;
        const date = new Date(value);
        const hour = date.getHours();
        const day = date.getDay();
        // Monday-Friday, 8 AM - 8 PM (more flexible)
        return day >= 1 && day <= 5 && hour >= 8 && hour < 20;
      },
      message: 'Le call dovrebbero essere programmate durante l\'orario lavorativo (Lun-Ven, 8:00-20:00)',
      severity: 'info',
      category: 'business'
    });

    // SQL injection prevention
    this.addRule('all', {
      id: 'sql-injection',
      name: 'SQL Injection Prevention',
      description: 'Detects potential SQL injection patterns',
      pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(['";])|(--)|(\/\*|\*\/)/i,
      message: 'Input contiene caratteri potenzialmente pericolosi',
      severity: 'error',
      category: 'security'
    });

    // XSS prevention
    this.addRule('all', {
      id: 'xss-prevention',
      name: 'XSS Prevention',
      description: 'Detects potential XSS patterns',
      pattern: /(<script[^>]*>.*?<\/script>)|(<[^>]*on\w+\s*=)|(<[^>]*javascript:)/i,
      message: 'Input contiene script potenzialmente pericolosi',
      severity: 'error',
      category: 'security'
    });

    // Performance: Large text validation
    this.addRule('all', {
      id: 'text-length-limit',
      name: 'Text Length Limit',
      description: 'Validates text length for performance',
      validator: (value: string) => {
        if (typeof value !== 'string') return true;
        return value.length <= 5000; // 5KB limit
      },
      message: 'Il testo è troppo lungo (massimo 5000 caratteri)',
      severity: 'warning',
      category: 'performance'
    });

    // Business rule: No overlapping calls
    this.addRule('call', {
      id: 'no-overlap',
      name: 'No Overlapping Calls',
      description: 'Prevents scheduling overlapping calls for the same employee',
      validator: (value: string, context?: { employeeId: string; existingCalls: any[]; callId?: string }) => {
        if (!value || !context?.existingCalls || !context?.employeeId) return true;
        
        const newCallDate = new Date(value);
        const buffer = 15 * 60 * 1000; // 15 minutes buffer
        
        return !context.existingCalls.some(call => {
          if (call.employeeId !== context.employeeId) return false;
          if (context.callId && call.id === context.callId) return false; // Skip current call when editing
          if (call.status === 'cancelled' || call.status === 'completed') return false;
          
          const existingDate = new Date(call.dataSchedulata);
          const timeDiff = Math.abs(newCallDate.getTime() - existingDate.getTime());
          return timeDiff < buffer;
        });
      },
      message: 'Esiste già una call programmata per questo dipendente nello stesso orario (buffer 15 min)',
      severity: 'error',
      category: 'business'
    });
  }

  addRule(entity: string, rule: ValidationRule) {
    if (!this.rules.has(entity)) {
      this.rules.set(entity, []);
    }
    this.rules.get(entity)!.push(rule);
  }

  removeRule(entity: string, ruleId: string) {
    const entityRules = this.rules.get(entity);
    if (entityRules) {
      const index = entityRules.findIndex(rule => rule.id === ruleId);
      if (index !== -1) {
        entityRules.splice(index, 1);
      }
    }
  }

  validateField(entity: string, field: string, value: any, context?: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const entityRules = [
      ...(this.rules.get(entity) || []),
      ...(this.rules.get('all') || [])
    ];

    for (const rule of entityRules) {
      let isValid = true;
      
      if (rule.pattern) {
        if (typeof value === 'string') {
          isValid = !rule.pattern.test(value) === (rule.id.includes('injection') || rule.id.includes('xss'));
        }
      }
      
      if (rule.validator) {
        isValid = rule.validator(value, context);
      }

      if (!isValid) {
        const message: ValidationMessage = {
          ruleId: rule.id,
          field,
          message: rule.message,
          severity: rule.severity,
          value
        };

        switch (rule.severity) {
          case 'error':
            result.errors.push(message);
            result.isValid = false;
            break;
          case 'warning':
            result.warnings.push(message);
            break;
          case 'info':
            result.info.push(message);
            break;
        }
      }
    }

    return result;
  }

  validateObject(entity: string, object: Record<string, any>, context?: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    for (const [field, value] of Object.entries(object)) {
      const fieldResult = this.validateField(entity, field, value, context);
      
      result.errors.push(...fieldResult.errors);
      result.warnings.push(...fieldResult.warnings);
      result.info.push(...fieldResult.info);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
      }
    }

    return result;
  }

  getEntityRules(entity: string): ValidationRule[] {
    return [
      ...(this.rules.get(entity) || []),
      ...(this.rules.get('all') || [])
    ];
  }

  getRulesByCategory(entity: string, category: ValidationRule['category']): ValidationRule[] {
    const entityRules = this.getEntityRules(entity);
    return entityRules.filter(rule => rule.category === category);
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();

// Helper functions for common validation patterns
export const ValidationHelpers = {
  // Italian fiscal code validation
  fiscalCode: (value: string): boolean => {
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return pattern.test(value);
  },

  // Italian VAT number validation
  vatNumber: (value: string): boolean => {
    const pattern = /^[0-9]{11}$/;
    if (!pattern.test(value)) return false;
    
    // Checksum validation for Italian VAT
    const digits = value.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 2);
      if (digits[i] * (i % 2 === 0 ? 1 : 2) > 9) {
        sum -= 9;
      }
    }
    return (10 - (sum % 10)) % 10 === digits[10];
  },

  // IBAN validation (simplified)
  iban: (value: string): boolean => {
    const pattern = /^IT[0-9]{2}[A-Z][0-9]{10}[A-Z0-9]{12}$/;
    return pattern.test(value.replace(/\s/g, ''));
  },

  // Italian ZIP code validation
  zipCode: (value: string): boolean => {
    const pattern = /^[0-9]{5}$/;
    return pattern.test(value);
  },

  // Strength password validation
  strongPassword: (value: string): boolean => {
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return pattern.test(value);
  }
};