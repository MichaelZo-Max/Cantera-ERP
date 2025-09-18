"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

export interface SearchableSelectOption {
  value: string;
  label: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  // === FUNCIÓN DE FILTRADO REESCRITA Y CORREGIDA ===
  const commandFilter = (itemValue: string, search: string): number => {
    const option = options.find((opt) => opt.value === itemValue);

    if (!option) {
      return 0;
    }

    // Función recursiva y segura para obtener el texto de cualquier ReactNode
    const getNodeText = (node: React.ReactNode): string => {
      // Casos base: texto, nulos o booleanos
      if (node == null || typeof node === "boolean") return "";
      if (typeof node === "string" || typeof node === "number")
        return node.toString();

      // Caso recursivo para arrays (fragmentos)
      if (Array.isArray(node)) {
        return node.map(getNodeText).join("");
      }

      // Caso recursivo para elementos de React
      // Se verifica que sea un elemento válido y que tenga `props`
      if (React.isValidElement(node) && node.props) {
        // La recursión se hace sobre los hijos del elemento
        return getNodeText(node.props.children);
      }

      // Si no es ninguno de los anteriores, no tiene texto
      return "";
    };

    const labelText = getNodeText(option.label);

    // Normalización y búsqueda (insensible a mayúsculas y acentos)
    const normalizedLabel = labelText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normalizedSearch = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return normalizedLabel.includes(normalizedSearch) ? 1 : 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-sm",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span>{placeholder}</span>
          )}
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
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
