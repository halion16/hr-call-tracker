// Call Templates Service for Managing Predefined Call Scenarios
import { generateId } from './utils';
import { autocompleteService } from './autocomplete-service';

export interface CallTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'onboarding' | 'development' | 'feedback' | 'exit' | 'general';
  icon: string;
  duration: number; // in minutes
  objectives: string[];
  agenda: CallAgendaItem[];
  notes: string;
  followUpRequired: boolean;
  followUpDelay?: number; // days
  questions: string[];
  isActive: boolean;
  usageCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CallAgendaItem {
  id: string;
  title: string;
  description?: string;
  timeAllocated: number; // minutes
  questions?: string[];
  notes?: string;
  isRequired: boolean;
}

export class CallTemplatesService {
  private static instance: CallTemplatesService;
  private storageKey = 'hr-tracker-call-templates';
  
  private defaultTemplates: Omit<CallTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Performance Review Trimestrale',
      description: 'Template strutturato per review performance trimestrali con KPI e obiettivi',
      category: 'performance',
      icon: '🎯',
      duration: 45,
      objectives: [
        'Valutare performance del trimestre corrente',
        'Identificare aree di miglioramento',
        'Definire obiettivi per il prossimo trimestre',
        'Discutere opportunità di sviluppo'
      ],
      agenda: [
        {
          id: 'intro',
          title: 'Apertura e clima',
          description: 'Creare atmosfera positiva e raccogliere feedback iniziale',
          timeAllocated: 5,
          questions: [
            'Come ti senti nel tuo ruolo attuale?',
            'Quali sono state le sfide principali del trimestre?'
          ],
          isRequired: true
        },
        {
          id: 'achievements',
          title: 'Risultati raggiunti',
          description: 'Analisi dei risultati ottenuti e successi',
          timeAllocated: 15,
          questions: [
            'Quali sono i risultati di cui vai più fiero?',
            'Come valuti il raggiungimento degli obiettivi trimestrali?'
          ],
          isRequired: true
        },
        {
          id: 'challenges',
          title: 'Sfide e ostacoli',
          description: 'Identificazione e analisi delle difficoltà incontrate',
          timeAllocated: 10,
          questions: [
            'Quali ostacoli hai incontrato?',
            'Come possiamo supportarti meglio?'
          ],
          isRequired: true
        },
        {
          id: 'development',
          title: 'Sviluppo e crescita',
          description: 'Discussione su crescita professionale e formazione',
          timeAllocated: 10,
          questions: [
            'In quali aree vorresti svilupparti?',
            'Hai bisogno di formazione specifica?'
          ],
          isRequired: false
        },
        {
          id: 'goals',
          title: 'Obiettivi prossimo trimestre',
          description: 'Definizione obiettivi SMART per il periodo successivo',
          timeAllocated: 5,
          questions: [
            'Quali sono le tue priorità per il prossimo trimestre?'
          ],
          isRequired: true
        }
      ],
      notes: 'Preparare in anticipo: KPI del dipendente, obiettivi precedenti, feedback 360°',
      followUpRequired: true,
      followUpDelay: 30,
      questions: [
        'Come valuti la tua performance complessiva?',
        'Quali supporti necessiti dal team/manager?',
        'Hai feedback sul processo o l\'organizzazione?'
      ],
      isActive: true,
      tags: ['performance', 'quarterly', 'goals', 'development']
    },
    {
      name: 'Onboarding 30-60-90 giorni',
      description: 'Check-in strutturato per nuovi dipendenti nei primi mesi',
      category: 'onboarding',
      icon: '🚀',
      duration: 30,
      objectives: [
        'Verificare integrazione nel team',
        'Identificare necessità formative',
        'Raccogliere feedback su onboarding',
        'Supportare adattamento al ruolo'
      ],
      agenda: [
        {
          id: 'integration',
          title: 'Integrazione nel team',
          timeAllocated: 8,
          questions: [
            'Come ti stai trovando con il team?',
            'Chi ti sta aiutando di più nell\'inserimento?'
          ],
          isRequired: true
        },
        {
          id: 'role-clarity',
          title: 'Chiarezza del ruolo',
          timeAllocated: 10,
          questions: [
            'Hai chiarezza su responsabilità e aspettative?',
            'Ci sono aspetti del ruolo ancora poco chiari?'
          ],
          isRequired: true
        },
        {
          id: 'training',
          title: 'Formazione e supporto',
          timeAllocated: 7,
          questions: [
            'La formazione ricevuta è stata adeguata?',
            'Di quale supporto aggiuntivo avresti bisogno?'
          ],
          isRequired: true
        },
        {
          id: 'feedback',
          title: 'Feedback e miglioramenti',
          timeAllocated: 5,
          questions: [
            'Come possiamo migliorare il processo di onboarding?'
          ],
          isRequired: false
        }
      ],
      notes: 'Adattare le domande in base al periodo (30, 60 o 90 giorni)',
      followUpRequired: true,
      followUpDelay: 15,
      questions: [
        'Ti senti supportato nel tuo percorso?',
        'Hai tutto ciò che ti serve per essere produttivo?'
      ],
      isActive: true,
      tags: ['onboarding', 'new-hire', 'integration', 'support']
    },
    {
      name: 'One-on-One Mensile',
      description: 'Incontro mensile per mantenere allineamento e supporto continuo',
      category: 'general',
      icon: '💬',
      duration: 30,
      objectives: [
        'Mantenere comunicazione aperta',
        'Identificare blocchi o problemi',
        'Supportare crescita continua',
        'Raccogliere feedback bidirezionale'
      ],
      agenda: [
        {
          id: 'current-state',
          title: 'Situazione attuale',
          timeAllocated: 10,
          questions: [
            'Come vanno le cose in generale?',
            'Su cosa stai lavorando principalmente?'
          ],
          isRequired: true
        },
        {
          id: 'challenges',
          title: 'Sfide e blocchi',
          timeAllocated: 8,
          questions: [
            'Ci sono ostacoli che ti impediscono di essere efficace?',
            'Come posso aiutarti?'
          ],
          isRequired: true
        },
        {
          id: 'recognition',
          title: 'Riconoscimenti',
          timeAllocated: 5,
          questions: [
            'Quali successi vuoi condividere?'
          ],
          isRequired: false
        },
        {
          id: 'feedback',
          title: 'Feedback per me/azienda',
          timeAllocated: 7,
          questions: [
            'Hai feedback per me come manager?',
            'Cosa possiamo migliorare come team/azienda?'
          ],
          isRequired: false
        }
      ],
      notes: 'Mantenere atmosfera informale e aperta',
      followUpRequired: false,
      questions: [
        'C\'è qualcosa di cui non abbiamo parlato ma vorresti discutere?'
      ],
      isActive: true,
      tags: ['monthly', 'general', 'feedback', 'support']
    },
    {
      name: 'Piano di Sviluppo Individuale',
      description: 'Sessione dedicata alla crescita professionale e career planning',
      category: 'development',
      icon: '📈',
      duration: 60,
      objectives: [
        'Mappare aspirazioni di carriera',
        'Identificare competenze da sviluppare',
        'Creare piano di sviluppo personalizzato',
        'Definire milestone e timeline'
      ],
      agenda: [
        {
          id: 'aspirations',
          title: 'Aspirazioni di carriera',
          timeAllocated: 15,
          questions: [
            'Dove ti vedi tra 2-3 anni?',
            'Quali ruoli ti interessano?'
          ],
          isRequired: true
        },
        {
          id: 'skills-gap',
          title: 'Gap analysis competenze',
          timeAllocated: 20,
          questions: [
            'Quali competenze ti servono per raggiungere i tuoi obiettivi?',
            'Su cosa vorresti lavorare prioritariamente?'
          ],
          isRequired: true
        },
        {
          id: 'development-plan',
          title: 'Piano di sviluppo',
          timeAllocated: 20,
          questions: [
            'Quali azioni concrete possiamo pianificare?',
            'Di quale supporto hai bisogno?'
          ],
          isRequired: true
        },
        {
          id: 'timeline',
          title: 'Timeline e milestone',
          timeAllocated: 5,
          isRequired: true
        }
      ],
      notes: 'Preparare: profilo competenze attuale, opportunità interne disponibili',
      followUpRequired: true,
      followUpDelay: 60,
      questions: [
        'Cosa ti motiva di più nel lavoro?',
        'Quali sono i tuoi punti di forza principali?'
      ],
      isActive: true,
      tags: ['development', 'career', 'skills', 'planning']
    },
    {
      name: 'Exit Interview',
      description: 'Colloquio strutturato per raccogliere feedback da dipendenti in uscita',
      category: 'exit',
      icon: '👋',
      duration: 45,
      objectives: [
        'Comprendere motivazioni dell\'uscita',
        'Raccogliere feedback costruttivo',
        'Identificare aree di miglioramento',
        'Mantenere relazione positiva'
      ],
      agenda: [
        {
          id: 'reasons',
          title: 'Motivazioni dell\'uscita',
          timeAllocated: 15,
          questions: [
            'Cosa ti ha portato a questa decisione?',
            'C\'è stato un evento scatenante specifico?'
          ],
          isRequired: true
        },
        {
          id: 'experience',
          title: 'Esperienza lavorativa',
          timeAllocated: 15,
          questions: [
            'Cosa hai apprezzato di più della tua esperienza qui?',
            'Cosa avresti voluto fosse diverso?'
          ],
          isRequired: true
        },
        {
          id: 'feedback',
          title: 'Feedback per miglioramenti',
          timeAllocated: 10,
          questions: [
            'Che consigli daresti per migliorare l\'esperienza dei dipendenti?',
            'Come valuteresti il management e la leadership?'
          ],
          isRequired: true
        },
        {
          id: 'future',
          title: 'Relazioni future',
          timeAllocated: 5,
          questions: [
            'Saresti disponibile come referenza/consulente in futuro?'
          ],
          isRequired: false
        }
      ],
      notes: 'Mantenere tono neutro e costruttivo, garantire confidenzialità',
      followUpRequired: false,
      questions: [
        'Raccomanderesti questa azienda come posto di lavoro?',
        'C\'è qualcos\'altro che vorresti condividere?'
      ],
      isActive: true,
      tags: ['exit', 'feedback', 'improvement', 'retention']
    },
    {
      name: 'Feedback 360° Follow-up',
      description: 'Sessione di follow-up dopo feedback 360° per piano di miglioramento',
      category: 'feedback',
      icon: '🔄',
      duration: 40,
      objectives: [
        'Analizzare risultati feedback 360°',
        'Identificare aree di sviluppo prioritarie',
        'Creare piano di miglioramento',
        'Stabilire accountability e supporto'
      ],
      agenda: [
        {
          id: 'results-review',
          title: 'Analisi risultati',
          timeAllocated: 15,
          questions: [
            'Come ti senti rispetto ai risultati ricevuti?',
            'Ci sono stati risultati sorprendenti?'
          ],
          isRequired: true
        },
        {
          id: 'priorities',
          title: 'Priorità di sviluppo',
          timeAllocated: 15,
          questions: [
            'Su quali aree vuoi concentrarti per prime?',
            'Quali feedback risuonano di più con te?'
          ],
          isRequired: true
        },
        {
          id: 'action-plan',
          title: 'Piano d\'azione',
          timeAllocated: 10,
          questions: [
            'Quali azioni concrete puoi intraprendere?',
            'Come posso supportarti in questo percorso?'
          ],
          isRequired: true
        }
      ],
      notes: 'Preparare: report feedback 360°, analisi trend rispetto a feedback precedenti',
      followUpRequired: true,
      followUpDelay: 45,
      questions: [
        'Quali sono i tuoi punti di forza secondo il feedback?',
        'Come pensi di lavorare sulle aree di miglioramento?'
      ],
      isActive: true,
      tags: ['feedback', '360', 'development', 'improvement']
    }
  ];

  private constructor() {}

  static getInstance(): CallTemplatesService {
    if (!CallTemplatesService.instance) {
      CallTemplatesService.instance = new CallTemplatesService();
    }
    return CallTemplatesService.instance;
  }

  // Initialize default templates if not exists
  private initializeDefaultTemplates(): void {
    const existing = this.getAllTemplates();
    if (existing.length === 0) {
      const now = new Date().toISOString();
      const templates = this.defaultTemplates.map(template => ({
        ...template,
        id: generateId(),
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        agenda: template.agenda.map(item => ({
          ...item,
          id: item.id || generateId()
        }))
      }));
      this.saveTemplates(templates);
    }
  }

  // Get all templates
  getAllTemplates(): CallTemplate[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load call templates');
    }
    
    this.initializeDefaultTemplates();
    return this.getAllTemplates();
  }

  // Get templates by category
  getTemplatesByCategory(category: CallTemplate['category']): CallTemplate[] {
    return this.getAllTemplates().filter(template => 
      template.category === category && template.isActive
    );
  }

  // Get template by ID
  getTemplate(id: string): CallTemplate | null {
    return this.getAllTemplates().find(template => template.id === id) || null;
  }

  // Get popular templates (by usage)
  getPopularTemplates(limit: number = 5): CallTemplate[] {
    return this.getAllTemplates()
      .filter(template => template.isActive)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  // Search templates
  searchTemplates(query: string): CallTemplate[] {
    if (!query.trim()) return this.getAllTemplates().filter(t => t.isActive);
    
    const searchTerm = query.toLowerCase();
    return this.getAllTemplates().filter(template => 
      template.isActive && (
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        template.objectives.some(obj => obj.toLowerCase().includes(searchTerm))
      )
    );
  }

  // Create new template
  createTemplate(templateData: Omit<CallTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): CallTemplate {
    const now = new Date().toISOString();
    const newTemplate: CallTemplate = {
      ...templateData,
      id: generateId(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      agenda: templateData.agenda.map(item => ({
        ...item,
        id: item.id || generateId()
      }))
    };
    
    const templates = this.getAllTemplates();
    templates.push(newTemplate);
    this.saveTemplates(templates);
    
    return newTemplate;
  }

  // Update template
  updateTemplate(id: string, updates: Partial<CallTemplate>): CallTemplate | null {
    const templates = this.getAllTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return null;
    
    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveTemplates(templates);
    return templates[index];
  }

  // Delete template
  deleteTemplate(id: string): boolean {
    const templates = this.getAllTemplates();
    const filteredTemplates = templates.filter(t => t.id !== id);
    
    if (filteredTemplates.length === templates.length) return false;
    
    this.saveTemplates(filteredTemplates);
    return true;
  }

  // Use template (increment usage count)
  useTemplate(id: string): void {
    const template = this.getTemplate(id);
    if (template) {
      this.updateTemplate(id, { 
        usageCount: template.usageCount + 1 
      });
      
      // Add template content to autocomplete suggestions
      autocompleteService.addSuggestion('call-notes', template.notes, 'template-usage');
      template.objectives.forEach(objective => {
        autocompleteService.addSuggestion('call-notes', objective, 'template-usage');
      });
    }
  }

  // Generate call content from template
  generateCallContent(templateId: string, customizations?: {
    additionalNotes?: string;
    modifiedObjectives?: string[];
    selectedAgenda?: string[];
  }): {
    note: string;
    objectives: string[];
    agenda: string;
    estimatedDuration: number;
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    this.useTemplate(templateId);

    const objectives = customizations?.modifiedObjectives || template.objectives;
    const selectedAgendaIds = customizations?.selectedAgenda || template.agenda.map(item => item.id);
    const selectedAgenda = template.agenda.filter(item => selectedAgendaIds.includes(item.id));
    
    const agendaText = selectedAgenda.map((item, index) => {
      let itemText = `${index + 1}. ${item.title} (${item.timeAllocated} min)`;
      if (item.description) {
        itemText += `\n   ${item.description}`;
      }
      if (item.questions && item.questions.length > 0) {
        itemText += `\n   Domande chiave:\n   ${item.questions.map(q => `- ${q}`).join('\n   ')}`;
      }
      return itemText;
    }).join('\n\n');

    const estimatedDuration = selectedAgenda.reduce((total, item) => total + item.timeAllocated, 0);
    
    let noteContent = `📋 ${template.name}\n\n`;
    noteContent += `🎯 Obiettivi:\n${objectives.map(obj => `• ${obj}`).join('\n')}\n\n`;
    noteContent += `📅 Agenda:\n${agendaText}\n\n`;
    
    if (template.questions.length > 0) {
      noteContent += `❓ Domande aggiuntive:\n${template.questions.map(q => `• ${q}`).join('\n')}\n\n`;
    }
    
    if (template.notes) {
      noteContent += `📝 Note preparatorie:\n${template.notes}\n\n`;
    }
    
    if (customizations?.additionalNotes) {
      noteContent += `💭 Note personalizzate:\n${customizations.additionalNotes}\n\n`;
    }
    
    if (template.followUpRequired) {
      noteContent += `🔄 Follow-up richiesto: ${template.followUpDelay} giorni\n`;
    }

    return {
      note: noteContent,
      objectives,
      agenda: agendaText,
      estimatedDuration
    };
  }

  // Get template statistics
  getTemplateStats(): {
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
    categoryCounts: Record<string, number>;
    mostUsedTemplate: CallTemplate | null;
  } {
    const templates = this.getAllTemplates();
    const activeTemplates = templates.filter(t => t.isActive);
    
    const categoryCounts = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedTemplate = templates.length > 0 
      ? templates.reduce((max, template) => 
          template.usageCount > max.usageCount ? template : max
        )
      : null;

    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      categoryCounts,
      mostUsedTemplate
    };
  }

  // Save templates to localStorage
  private saveTemplates(templates: CallTemplate[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.warn('Failed to save call templates');
    }
  }

  // Export templates
  exportTemplates(): string {
    return JSON.stringify(this.getAllTemplates(), null, 2);
  }

  // Import templates
  importTemplates(jsonData: string): { success: boolean; message: string; imported: number } {
    try {
      const importedTemplates = JSON.parse(jsonData) as CallTemplate[];
      
      if (!Array.isArray(importedTemplates)) {
        return { success: false, message: 'Invalid format: expected array of templates', imported: 0 };
      }

      const validTemplates = importedTemplates.filter(template => 
        template.id && template.name && template.category
      );

      if (validTemplates.length === 0) {
        return { success: false, message: 'No valid templates found', imported: 0 };
      }

      const existingTemplates = this.getAllTemplates();
      const existingIds = new Set(existingTemplates.map(t => t.id));
      
      const newTemplates = validTemplates.filter(template => !existingIds.has(template.id));
      
      if (newTemplates.length === 0) {
        return { success: false, message: 'All templates already exist', imported: 0 };
      }

      const allTemplates = [...existingTemplates, ...newTemplates];
      this.saveTemplates(allTemplates);

      return { 
        success: true, 
        message: `Successfully imported ${newTemplates.length} templates`, 
        imported: newTemplates.length 
      };
    } catch (error) {
      return { success: false, message: 'Invalid JSON format', imported: 0 };
    }
  }
}

// Export singleton instance
export const callTemplatesService = CallTemplatesService.getInstance();