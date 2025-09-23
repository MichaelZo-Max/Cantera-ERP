"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"; // Importamos un ícono de carga
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface SearchableSelectOption {
  value: string;
  label: React.ReactNode;
}

type SingleSelectProps = {
  isMulti?: false;
  value?: string;
  onChange: (value: string) => void;
};

type MultiSelectProps = {
  isMulti: true;
  value?: string[];
  onChange: (value: string[]) => void;
};

// Se añaden nuevas props para la funcionalidad asíncrona
type SearchableSelectProps = {
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  onSearch?: (query: string) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
} & (SingleSelectProps | MultiSelectProps);

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    emptyText = "No se encontraron resultados.",
    disabled = false,
    className,
    onSearch,
    onLoadMore,
    hasNextPage,
    isLoading,
  } = props;

  const [open, setOpen] = React.useState(false);

  const handleSingleSelect = (currentValue: string) => {
    if (!props.isMulti) {
      props.onChange(currentValue === props.value ? "" : currentValue);
      setOpen(false);
    }
  };

  const handleMultiSelect = (currentValue: string) => {
    if (props.isMulti) {
      const currentValues = props.value || [];
      if (currentValues.includes(currentValue)) {
        props.onChange(currentValues.filter((v) => v !== currentValue));
      } else {
        props.onChange([...currentValues, currentValue]);
      }
    }
  };

  const selectedOption = React.useMemo(() => {
    if (!props.isMulti) {
      return options.find((option) => option.value === props.value);
    }
    return null;
  }, [options, props]);

  const selectedOptionsMulti = React.useMemo(() => {
    if (props.isMulti) {
      return options.filter((option) => props.value?.includes(option.value));
    }
    return [];
  }, [options, props]);
  
  // Cuando onSearch es provisto, asumimos que el filtrado se hace externamente.
  const commandFilter = (value: string, search: string): number => {
    if (onSearch) {
      return 1; 
    }
    // Si no, se realiza un filtrado básico por etiqueta
    const option = options.find(o => o.value === value);
    if (option && typeof option.label === 'string') {
        return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    }
    return 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-sm h-auto",
            (!props.value || (props.isMulti && props.value?.length === 0)) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex-1 text-left">
            {props.isMulti ? (
              selectedOptionsMulti.length > 0 ? (
                <div className="flex gap-1 flex-wrap">
                  {selectedOptionsMulti.map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="whitespace-nowrap"
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span>{placeholder}</span>
              )
            ) : selectedOption ? (
              <span className="truncate">{selectedOption.label}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] p-0 z-[99]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command filter={commandFilter}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={onSearch}
            disabled={disabled || isLoading}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? "Buscando..." : emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = props.isMulti
                  ? props.value?.includes(option.value)
                  : props.value === option.value;

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      if (props.isMulti) {
                        handleMultiSelect(currentValue);
                      } else {
                        handleSingleSelect(currentValue);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {/* Se añade el indicador de carga y el botón para cargar más */}
            {isLoading && (
              <CommandItem disabled className="flex justify-center items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Cargando...</span>
              </CommandItem>
            )}
            {hasNextPage && !isLoading && (
              <CommandItem
                key="load-more"
                onSelect={onLoadMore}
                className="flex justify-center items-center cursor-pointer opacity-75"
              >
                <span>Cargar más resultados</span>
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}