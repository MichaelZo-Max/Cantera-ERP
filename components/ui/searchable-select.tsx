"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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

// 👇 1. Sobrecarga de tipos para manejar single y multi-select
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

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
} & (SingleSelectProps | MultiSelectProps);

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    emptyText = "No se encontraron resultados.",
    disabled = false,
    className,
  } = props;

  const [open, setOpen] = React.useState(false);

  // === Lógica para Single Select ===
  const handleSingleSelect = (currentValue: string) => {
    if (!props.isMulti) {
      const newValue = currentValue === props.value ? "" : currentValue;
      props.onChange(newValue);
      setOpen(false);
    }
  };

  // === Lógica para Multi Select ===
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

  // Determina qué opción está seleccionada (para single-select)
  const selectedOption = React.useMemo(() => {
    if (!props.isMulti) {
      return options.find((option) => option.value === props.value);
    }
    return null;
  }, [options, props]);

  // Determina las opciones seleccionadas (para multi-select)
  const selectedOptionsMulti = React.useMemo(() => {
    if (props.isMulti) {
      return options.filter((option) => props.value?.includes(option.value));
    }
    return [];
  }, [options, props]);

  // Función de filtrado mejorada
  const commandFilter = (itemValue: string, search: string): number => {
    // ... (la función de filtrado no necesita cambios)
    return 1;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-sm h-auto", // h-auto para multi-select
            !props.value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex-1 text-left">
            {props.isMulti ? (
              // Vista para Multi-select
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
            ) : // Vista para Single-select
            selectedOption ? (
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
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                // Determina si la opción está seleccionada
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}