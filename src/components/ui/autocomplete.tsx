'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, X, Search } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
  frequency?: number;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxSuggestions?: number;
  minCharsToSearch?: number;
  showFrequency?: boolean;
  onSelect?: (option: AutocompleteOption) => void;
  renderOption?: (option: AutocompleteOption, isSelected: boolean) => React.ReactNode;
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder = 'Digita per cercare...',
  className = '',
  disabled = false,
  allowCustom = true,
  maxSuggestions = 10,
  minCharsToSearch = 1,
  showFrequency = false,
  onSelect,
  renderOption
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [inputValue, setInputValue] = useState(value);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Filter options based on input
  const filterOptions = useCallback((searchValue: string) => {
    if (!searchValue || searchValue.length < minCharsToSearch) {
      return options.slice(0, maxSuggestions);
    }

    const searchLower = searchValue.toLowerCase();
    
    // Score-based filtering for better results
    const scored = options.map(option => {
      const labelLower = option.label.toLowerCase();
      const descriptionLower = option.description?.toLowerCase() || '';
      
      let score = 0;
      
      // Exact match gets highest score
      if (labelLower === searchLower) score += 100;
      // Starts with gets high score
      else if (labelLower.startsWith(searchLower)) score += 50;
      // Contains gets medium score
      else if (labelLower.includes(searchLower)) score += 25;
      // Description match gets lower score
      else if (descriptionLower.includes(searchLower)) score += 10;
      
      // Boost score based on frequency
      if (option.frequency) score += option.frequency / 10;
      
      return { option, score };
    });
    
    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(({ option }) => option);
  }, [options, maxSuggestions, minCharsToSearch]);

  // Update filtered options when input changes
  useEffect(() => {
    const filtered = filterOptions(inputValue);
    setFilteredOptions(filtered);
    setSelectedIndex(-1);
  }, [inputValue, filterOptions]);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= minCharsToSearch || filteredOptions.length > 0);
  };

  // Handle option selection
  const handleOptionSelect = (option: AutocompleteOption) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(option);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          handleOptionSelect(filteredOptions[selectedIndex]);
        } else if (allowCustom && inputValue.trim()) {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && optionsRef.current) {
      const selectedElement = optionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const defaultRenderOption = (option: AutocompleteOption, isSelected: boolean) => (
    <div className={`px-3 py-2 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-sm">{option.label}</div>
          {option.description && (
            <div className="text-xs text-gray-600 mt-1">{option.description}</div>
          )}
          {option.category && (
            <div className="text-xs text-blue-600 mt-1">
              {option.category}
            </div>
          )}
        </div>
        {showFrequency && option.frequency && (
          <div className="text-xs text-gray-400 ml-2">
            {option.frequency}x
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredOptions.length > 0 || inputValue.length >= minCharsToSearch) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          <div ref={optionsRef}>
            {filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onClick={() => handleOptionSelect(option)}
                className={selectedIndex === index ? 'bg-blue-50' : ''}
              >
                {renderOption ? renderOption(option, selectedIndex === index) : defaultRenderOption(option, selectedIndex === index)}
              </div>
            ))}
          </div>
          
          {/* Show "create new" option for custom values */}
          {allowCustom && inputValue && !filteredOptions.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase()) && (
            <div className="border-t border-gray-100">
              <div
                className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-600"
                onClick={() => {
                  onChange(inputValue);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  Usa "{inputValue}"
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Multi-select autocomplete variant
interface MultiAutocompleteProps extends Omit<AutocompleteProps, 'value' | 'onChange'> {
  values: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
}

export function MultiAutocomplete({
  values,
  onChange,
  maxSelections,
  ...props
}: MultiAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSelect = (option: AutocompleteOption) => {
    if (!values.includes(option.value)) {
      if (!maxSelections || values.length < maxSelections) {
        onChange([...values, option.value]);
      }
    }
    setInputValue('');
  };

  const handleRemove = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const availableOptions = props.options.filter(option => !values.includes(option.value));

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map(value => {
            const option = props.options.find(opt => opt.value === value);
            return (
              <div key={value} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                {option?.label || value}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0 hover:bg-blue-200"
                  onClick={() => handleRemove(value)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      
      {(!maxSelections || values.length < maxSelections) && (
        <Autocomplete
          {...props}
          value={inputValue}
          onChange={setInputValue}
          options={availableOptions}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}