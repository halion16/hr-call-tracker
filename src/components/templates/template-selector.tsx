'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  Target, 
  CheckCircle, 
  Star,
  Filter,
  Grid,
  List,
  Eye,
  Copy,
  Settings
} from 'lucide-react';
import { callTemplatesService, CallTemplate } from '@/lib/call-templates-service';

interface TemplateSelectorProps {
  onSelectTemplate: (template: CallTemplate) => void;
  onPreviewTemplate?: (template: CallTemplate) => void;
  selectedCategory?: string;
  showCreateNew?: boolean;
  compact?: boolean;
}

export function TemplateSelector({ 
  onSelectTemplate, 
  onPreviewTemplate,
  selectedCategory,
  showCreateNew = true,
  compact = false
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<CallTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(selectedCategory || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setLoading(true);
    try {
      const allTemplates = callTemplatesService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory && template.isActive;
  });

  const categories = [
    { value: 'all', label: 'Tutti', count: templates.filter(t => t.isActive).length },
    { value: 'performance', label: 'Performance', count: templates.filter(t => t.category === 'performance' && t.isActive).length },
    { value: 'onboarding', label: 'Onboarding', count: templates.filter(t => t.category === 'onboarding' && t.isActive).length },
    { value: 'development', label: 'Sviluppo', count: templates.filter(t => t.category === 'development' && t.isActive).length },
    { value: 'feedback', label: 'Feedback', count: templates.filter(t => t.category === 'feedback' && t.isActive).length },
    { value: 'general', label: 'Generale', count: templates.filter(t => t.category === 'general' && t.isActive).length },
    { value: 'exit', label: 'Exit', count: templates.filter(t => t.category === 'exit' && t.isActive).length }
  ];

  const popularTemplates = callTemplatesService.getPopularTemplates(3);

  const getCategoryColor = (category: string) => {
    const colors = {
      performance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      onboarding: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      feedback: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      exit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Seleziona Template</h3>
            <p className="text-sm text-gray-600">
              Scegli un template predefinito per strutturare la tua chiamata
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca template per nome, descrizione o tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Popular Templates */}
      {!searchQuery && popularTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Star className="h-4 w-4 mr-2 text-yellow-500" />
            Template Più Usati
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {popularTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{template.icon}</span>
                    <Badge variant="secondary" className="text-xs">
                      {template.usageCount} usi
                    </Badge>
                  </div>
                  <h5 className="font-medium text-sm mb-1">{template.name}</h5>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {template.duration} min
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectTemplate(template)}
                      className="text-xs h-6"
                    >
                      Usa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.value}
            variant={categoryFilter === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(category.value)}
            className="text-xs"
          >
            {category.label}
            {category.count > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {category.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Templates Grid/List */}
      {filteredTemplates.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
        }>
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'flex-row' : ''
              }`}
            >
              <CardContent className={`p-4 ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}`}>
                <div className={viewMode === 'list' ? 'flex-1' : ''}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{template.icon}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                    
                    {template.usageCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {template.usageCount} usi
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Objectives Preview */}
                  <div className="mb-3">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Target className="h-3 w-3 mr-1" />
                      Obiettivi ({template.objectives.length})
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {template.objectives.slice(0, 2).map((objective, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-1">•</span>
                          <span className="line-clamp-1">{objective}</span>
                        </li>
                      ))}
                      {template.objectives.length > 2 && (
                        <li className="text-gray-400 italic">
                          +{template.objectives.length - 2} altri...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {template.duration} minuti
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {template.agenda.length} sezioni
                    </div>
                    {template.followUpRequired && (
                      <div className="flex items-center text-orange-500">
                        <Target className="h-3 w-3 mr-1" />
                        Follow-up
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={`flex ${viewMode === 'list' ? 'flex-col space-y-2' : 'justify-between'} gap-2`}>
                  <Button
                    size="sm"
                    onClick={() => onSelectTemplate(template)}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Usa Template
                  </Button>
                  
                  {onPreviewTemplate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPreviewTemplate(template)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Anteprima
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchQuery 
                ? `Nessun template trovato per "${searchQuery}"` 
                : 'Nessun template disponibile per questa categoria'
              }
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Cancella ricerca
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Template */}
      {showCreateNew && (
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-6 text-center">
            <div className="text-gray-400 mb-2">
              <Settings className="h-8 w-8 mx-auto" />
            </div>
            <h4 className="font-medium text-gray-700 mb-1">Crea Nuovo Template</h4>
            <p className="text-sm text-gray-500 mb-3">
              Personalizza un template per le tue esigenze specifiche
            </p>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Crea Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}