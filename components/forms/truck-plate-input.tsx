"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TruckPlateInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function TruckPlateInput({
  value,
  onChange,
  label = "Placa del camión",
  placeholder = "ABC-123D",
  disabled = false,
  required = false,
}: TruckPlateInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [error, setError] = useState<string | null>(null)

  // Sincronizar con el valor externo
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const formatPlate = (input: string): string => {
    // Remover caracteres no válidos y convertir a mayúsculas
    const cleaned = input.replace(/[^A-Z0-9]/gi, "").toUpperCase()

    // Aplicar formato AAA-123A (flexible)
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}${cleaned.slice(6, 7)}`
    }
  }

  const validatePlate = (plate: string): string | null => {
    if (!plate && required) {
      return "La placa es requerida"
    }

    if (plate && plate.length < 5) {
      return "La placa debe tener al menos 5 caracteres"
    }

    if (plate && plate.length > 8) {
      return "La placa no puede tener más de 8 caracteres"
    }

    // Validar formato básico (flexible)
    const plateRegex = /^[A-Z]{2,3}-?[0-9]{2,3}[A-Z]?$/
    if (plate && !plateRegex.test(plate.replace("-", ""))) {
      return "Formato de placa inválido"
    }

    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formattedValue = formatPlate(rawValue)

    setInputValue(formattedValue)

    const validationError = validatePlate(formattedValue)
    setError(validationError)

    // Solo llamar onChange si no hay error o si está vacío
    if (!validationError || formattedValue === "") {
      onChange(formattedValue)
    }
  }

  const handleBlur = () => {
    // Validar al perder el foco
    const validationError = validatePlate(inputValue)
    setError(validationError)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="truck-plate" className="flex items-center gap-2">
        <Truck className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        <Input
          id="truck-plate"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={8}
          className={error ? "border-red-500" : ""}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs text-muted-foreground">Formato: AAA-123A (ejemplo: ABC-123D)</p>
    </div>
  )
}
