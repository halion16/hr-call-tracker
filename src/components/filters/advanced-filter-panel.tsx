'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { 
  Filter, 
  Search, 
  Calendar, 
  Star, 
  Clock, 
  Users, 
  Building, 
  ChevronDown,
  X,
  Save,
  Bookmark,
  Trash2,
  Settings
} from 'lucide-react';
import { CallFilters, FilterPreset, filterManager } from '@/lib/filters';

interface AdvancedFilterPanelProps {
  onFiltersChange: (filters: CallFilters) => void;
  currentFilters: CallFilters;
  filterOptions: {
    departments: Array<{ value: string; label: string; count?: number }>;
    employees: Array<{ value: string; label: string; count?: number }>;
    statuses: Array<{ value: string; label: string; count?: number }>;
  };
}

export function AdvancedFilterPanel({ 
  onFiltersChange, 
  currentFilters, 
  filterOptions 
}: AdvancedFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    const loadedPresets = filterManager.getPresets();
    setPresets(loadedPresets);
  };

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange(preset.filters);
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;

    const preset = filterManager.savePreset({
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      filters: currentFilters
    });

    setPresets([...presets, preset]);
    setShowSaveDialog(false);
    setNewPresetName('');
    setNewPresetDescription('');
  };

  const deletePreset = (presetId: string) => {
    if (filterManager.deletePreset(presetId)) {
      setPresets(presets.filter(p => p.id !== presetId));
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const updateFilter = (key: keyof CallFilters, value: any) => {
    onFiltersChange({ ...currentFilters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof CallFilters, value: string) => {
    const currentArray = (currentFilters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  const activeFilterCount = Object.values(currentFilters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined && v !== null && v !== '');
    }
    return value !== undefined && value !== null && value !== '';
  }).length;

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center space-x-2">
          <Bookmark className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtri Rapidi:</span>
        </div>
        
        {presets.filter(p => p.isDefault).map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
            className="text-xs"
          >
            {preset.name}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          <Filter className="h-3 w-3 mr-1" />
          Filtri Avanzati
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Cancella Filtri
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Filtri Avanzati</CardTitle>
                <CardDescription>Affina la ricerca con filtri personalizzati</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={activeFilterCount === 0}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Salva Filtro
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ricerca Generale</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome dipendente, note..."
                  value={currentFilters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value || undefined)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Status Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Stato Call
                </Label>
                <div className="space-y-2">
                  {filterOptions.statuses.map((status) => (
                    <label key={status.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentFilters.status?.includes(status.value as any) || false}
                        onChange={() => toggleArrayFilter('status', status.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{status.label}</span>
                      {status.count && (
                        <span className="text-xs text-muted-foreground">({status.count})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Department Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Dipartimenti
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {filterOptions.departments.map((dept) => (
                    <label key={dept.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentFilters.departmentIds?.includes(dept.value) || false}
                        onChange={() => toggleArrayFilter('departmentIds', dept.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{dept.label}</span>
                      {dept.count && (
                        <span className="text-xs text-muted-foreground">({dept.count})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Employee Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Dipendenti
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {filterOptions.employees.slice(0, 10).map((employee) => (
                    <label key={employee.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentFilters.employeeIds?.includes(employee.value) || false}
                        onChange={() => toggleArrayFilter('employeeIds', employee.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{employee.label}</span>
                      {employee.count && (
                        <span className="text-xs text-muted-foreground">({employee.count})</span>
                      )}
                    </label>
                  ))}
                  {filterOptions.employees.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      +{filterOptions.employees.length - 10} altri dipendenti...
                    </p>
                  )}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  Rating
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="rating-min" className="text-xs">Min:</Label>
                    <Input
                      id="rating-min"
                      type="number"
                      min="1"
                      max="5"
                      placeholder="1"
                      value={currentFilters.rating?.min || ''}
                      onChange={(e) => updateFilter('rating', {
                        ...currentFilters.rating,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="rating-max" className="text-xs">Max:</Label>
                    <Input
                      id="rating-max"
                      type="number"
                      min="1"
                      max="5"
                      placeholder="5"
                      value={currentFilters.rating?.max || ''}
                      onChange={(e) => updateFilter('rating', {
                        ...currentFilters.rating,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Durata (min)
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="duration-min" className="text-xs">Min:</Label>
                    <Input
                      id="duration-min"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={currentFilters.duration?.min || ''}
                      onChange={(e) => updateFilter('duration', {
                        ...currentFilters.duration,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="duration-max" className="text-xs">Max:</Label>
                    <Input
                      id="duration-max"
                      type="number"
                      min="0"
                      placeholder="120"
                      value={currentFilters.duration?.max || ''}
                      onChange={(e) => updateFilter('duration', {
                        ...currentFilters.duration,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Boolean Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Opzioni</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ha Note</Label>
                    <Switch
                      checked={currentFilters.hasNotes === true}
                      onCheckedChange={(checked) => updateFilter('hasNotes', checked ? true : undefined)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ha Prossima Call</Label>
                    <Switch
                      checked={currentFilters.hasNextCall === true}
                      onCheckedChange={(checked) => updateFilter('hasNextCall', checked ? true : undefined)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Presets */}
            {presets.filter(p => !p.isDefault).length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Filtri Personalizzati</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presets.filter(p => !p.isDefault).map((preset) => (
                    <div key={preset.id} className="flex items-center border rounded-lg p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="text-xs p-1 h-auto"
                      >
                        {preset.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreset(preset.id)}
                        className="text-xs p-1 h-auto text-muted-foreground hover:text-destructive ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Salva Filtro</CardTitle>
              <CardDescription>
                Salva la configurazione attuale come filtro personalizzato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preset-name">Nome Filtro*</Label>
                <Input
                  id="preset-name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="es. Call Urgenti Q1"
                />
              </div>
              <div>
                <Label htmlFor="preset-description">Descrizione</Label>
                <Input
                  id="preset-description"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Descrizione opzionale del filtro"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Annulla
                </Button>
                <Button
                  onClick={saveCurrentAsPreset}
                  disabled={!newPresetName.trim()}
                >
                  Salva Filtro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}