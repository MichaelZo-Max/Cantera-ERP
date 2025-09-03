// components/forms/truck-picker.tsx

"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Truck as TruckType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TruckPickerProps {
  value: string | null
  onChange: (truckId: string | null) => void
  trucks: TruckType[]
  placeholder?: string
  disabled?: boolean
}

export function TruckPicker({
  value,
  onChange,
  trucks = [],
  placeholder = "Seleccionar camión...",
  disabled = false,
}: TruckPickerProps) {
  const [open, setOpen] = useState(false)
  
  const selectedTruck = trucks.find(truck => truck.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
          disabled={disabled}
        >
          {selectedTruck ? (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="font-mono font-bold">{selectedTruck.placa}</span>
              <span className="text-muted-foreground hidden sm:inline">({selectedTruck.brand} {selectedTruck.model})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por placa, marca..." />
          <CommandList>
            <CommandEmpty>No se encontraron camiones.</CommandEmpty>
            <CommandGroup>
              {trucks.map((truck) => (
                <CommandItem
                  key={truck.id}
                  value={`${truck.placa} ${truck.brand} ${truck.model}`}
                  onSelect={() => {
                    onChange(truck.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === truck.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <div>
                            <div className="font-medium font-mono">{truck.placa}</div>
                            <div className="text-sm text-muted-foreground">{truck.brand} {truck.model}</div>
                        </div>
                    </div>
                    {truck.capacity && <Badge variant="outline">{truck.capacity} m³</Badge>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}