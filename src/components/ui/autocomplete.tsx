'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from './skeleton';

export interface Suggestion {
  value: string;
  label: string;
}

interface AutocompleteProps {
  type: 'trains' | 'stations';
  placeholder: string;
  onSelect: (suggestion: Suggestion | null) => void;
  initialValue?: string;
}

export function Autocomplete({ type, placeholder, onSelect, initialValue }: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/search?type=${type}&query=${query}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query, type]);

  const handleSelect = (currentValue: string) => {
    const selectedSuggestion = suggestions.find(
      (suggestion) => suggestion.label.toLowerCase() === currentValue.toLowerCase()
    ) || null;
    
    const displayValue = selectedSuggestion ? selectedSuggestion.label : '';
    setValue(displayValue);
    onSelect(selectedSuggestion);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal text-base md:text-sm"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${type}...`}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && <CommandItem><Skeleton className="h-4 w-full" /></CommandItem>}
            {!loading && suggestions.length === 0 && query.length > 1 && (
                <CommandEmpty>No {type} found.</CommandEmpty>
            )}
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.label}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === suggestion.label ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {suggestion.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
