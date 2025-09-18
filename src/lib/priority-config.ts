export interface PriorityRule {
  id: string;
  name: string;
  description: string;
  type: 'hire_date' | 'department' | 'position' | 'custom';
  priority: 'high' | 'medium' | 'low';
  criteria: {
    field: string;
    operator: 'less_than' | 'greater_than' | 'equals' | 'contains' | 'in_months' | 'in_days';
    value: string | number;
    unit?: 'days' | 'months' | 'years';
  };
  color: {
    bg: string;
    text: string;
    border: string;
  };
  icon: string;
  enabled: boolean;
  order: number;
}

export interface PriorityConfig {
  rules: PriorityRule[];
  defaultPriority: 'high' | 'medium' | 'low';
  showPriorityIndicators: boolean;
  enableNotifications: boolean;
}

const DEFAULT_PRIORITY_RULES: PriorityRule[] = [
  {
    id: 'new-hire-high',
    name: 'Nuovi Assunti (Alta)',
    description: 'Dipendenti assunti negli ultimi 30 giorni',
    type: 'hire_date',
    priority: 'high',
    criteria: {
      field: 'dataAssunzione',
      operator: 'in_days',
      value: 30,
      unit: 'days'
    },
    color: {
      bg: 'rgba(239, 68, 68, 0.05)',
      text: '#dc2626',
      border: '#ef4444'
    },
    icon: '🔥',
    enabled: true,
    order: 1
  },
  {
    id: 'recent-hire-medium',
    name: 'Assunzioni Recenti (Media)',
    description: 'Dipendenti assunti negli ultimi 12 mesi',
    type: 'hire_date',
    priority: 'medium',
    criteria: {
      field: 'dataAssunzione',
      operator: 'in_months',
      value: 12,
      unit: 'months'
    },
    color: {
      bg: 'rgba(245, 158, 11, 0.05)',
      text: '#d97706',
      border: '#f59e0b'
    },
    icon: '⚡',
    enabled: true,
    order: 2
  },
  {
    id: 'department-high',
    name: 'Dipartimenti Critici',
    description: 'Dipendenti in dipartimenti ad alta priorità',
    type: 'department',
    priority: 'high',
    criteria: {
      field: 'dipartimento',
      operator: 'contains',
      value: 'IT,Management,HR'
    },
    color: {
      bg: 'rgba(239, 68, 68, 0.05)',
      text: '#dc2626',
      border: '#ef4444'
    },
    icon: '🏢',
    enabled: false,
    order: 3
  },
  {
    id: 'position-high',
    name: 'Posizioni Strategiche',
    description: 'Dipendenti in ruoli chiave',
    type: 'position',
    priority: 'high',
    criteria: {
      field: 'posizione',
      operator: 'contains',
      value: 'Manager,Director,Senior,Lead'
    },
    color: {
      bg: 'rgba(239, 68, 68, 0.05)',
      text: '#dc2626',
      border: '#ef4444'
    },
    icon: '👑',
    enabled: false,
    order: 4
  }
];

const DEFAULT_CONFIG: PriorityConfig = {
  rules: DEFAULT_PRIORITY_RULES,
  defaultPriority: 'low',
  showPriorityIndicators: true,
  enableNotifications: true
};

export class PriorityConfigService {
  private static readonly STORAGE_KEY = 'hr-tracker-priority-config';

  static getConfig(): PriorityConfig {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  }

  static saveConfig(config: PriorityConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  static resetToDefaults(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
  }

  static addRule(rule: Omit<PriorityRule, 'id' | 'order'>): void {
    const config = this.getConfig();
    const newRule: PriorityRule = {
      ...rule,
      id: `custom-${Date.now()}`,
      order: Math.max(...config.rules.map(r => r.order), 0) + 1
    };
    config.rules.push(newRule);
    this.saveConfig(config);
  }

  static updateRule(id: string, updates: Partial<PriorityRule>): void {
    const config = this.getConfig();
    const ruleIndex = config.rules.findIndex(r => r.id === id);
    if (ruleIndex >= 0) {
      config.rules[ruleIndex] = { ...config.rules[ruleIndex], ...updates };
      this.saveConfig(config);
    }
  }

  static deleteRule(id: string): void {
    const config = this.getConfig();
    config.rules = config.rules.filter(r => r.id !== id);
    this.saveConfig(config);
  }

  static toggleRule(id: string): void {
    const config = this.getConfig();
    const rule = config.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveConfig(config);
    }
  }

  static evaluateEmployeePriority(employee: any): { 
    priority: 'high' | 'medium' | 'low', 
    matchedRules: PriorityRule[],
    label: string,
    icon: string,
    color: PriorityRule['color']
  } {
    const config = this.getConfig();
    const matchedRules: PriorityRule[] = [];

    // Ordina le regole per priority (high > medium > low) e poi per order
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sortedRules = config.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.order - b.order;
      });

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, employee)) {
        matchedRules.push(rule);
      }
    }

    // Prendi la regola con priorità più alta che matcha
    const highestPriorityRule = matchedRules[0];
    
    if (highestPriorityRule) {
      return {
        priority: highestPriorityRule.priority,
        matchedRules,
        label: highestPriorityRule.name,
        icon: highestPriorityRule.icon,
        color: highestPriorityRule.color
      };
    }

    // Fallback al default
    const defaultRule = sortedRules.find(r => r.priority === config.defaultPriority) || {
      priority: config.defaultPriority,
      name: 'Standard',
      icon: '📋',
      color: {
        bg: 'rgba(107, 114, 128, 0.05)',
        text: '#6b7280',
        border: '#9ca3af'
      }
    } as PriorityRule;

    return {
      priority: config.defaultPriority,
      matchedRules: [],
      label: 'Standard',
      icon: '📋',
      color: defaultRule.color
    };
  }

  private static evaluateRule(rule: PriorityRule, employee: any): boolean {
    const { criteria } = rule;
    const fieldValue = employee[criteria.field];

    if (!fieldValue) return false;

    switch (criteria.operator) {
      case 'in_days':
        const today = new Date();
        const date = new Date(fieldValue);
        const daysAgo = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo >= 0 && daysAgo <= (criteria.value as number);

      case 'in_months':
        const todayMonths = new Date();
        const dateMonths = new Date(fieldValue);
        const monthsAgo = (todayMonths.getTime() - dateMonths.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAgo <= (criteria.value as number);

      case 'equals':
        return fieldValue === criteria.value;

      case 'contains':
        const values = (criteria.value as string).split(',').map(v => v.trim().toLowerCase());
        return values.some(val => fieldValue.toLowerCase().includes(val));

      case 'less_than':
        return parseFloat(fieldValue) < (criteria.value as number);

      case 'greater_than':
        return parseFloat(fieldValue) > (criteria.value as number);

      default:
        return false;
    }
  }

  // Metodi di utilità per l'UI
  static getPriorityColors(priority: 'high' | 'medium' | 'low'): PriorityRule['color'] {
    const config = this.getConfig();
    const rule = config.rules.find(r => r.priority === priority && r.enabled);
    
    if (rule) return rule.color;

    // Colori di fallback
    const fallbackColors = {
      high: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: '#ef4444' },
      medium: { bg: 'rgba(245, 158, 11, 0.05)', text: '#d97706', border: '#f59e0b' },
      low: { bg: 'rgba(107, 114, 128, 0.05)', text: '#6b7280', border: '#9ca3af' }
    };
    
    return fallbackColors[priority];
  }

  static getPriorityIcon(priority: 'high' | 'medium' | 'low'): string {
    const config = this.getConfig();
    const rule = config.rules.find(r => r.priority === priority && r.enabled);
    
    return rule?.icon || { high: '🔥', medium: '⚡', low: '📋' }[priority];
  }
}