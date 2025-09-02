"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { UnitBase } from "@/lib/types"

interface QuantityInputProps {
  unitBase: UnitBase
  value: number
  onChange: (value: number) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
}

const UNIT_LABELS = {
  M3: "m³",
  TON: "toneladas",
  BOLSA: "bolsas",
  UNIDAD: "unidades",
} as const

const UNIT_HELPERS = {
  M3: "Volumen en metros cúbicos",
  TON: "Peso en toneladas",
  BOLSA: "Cantidad en bolsas",
  UNIDAD: "Cantidad en unidades",
} as const

export function QuantityInput({
  unitBase,
  value,
  onChange,
  label = "Cantidad",
  placeholder,
  disabled = false,
  min = 0,
  max,
  step = 0.1,
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [error, setError] = useState<string | null>(null)

  // Sincronizar con el valor externo
  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Validar y convertir
    const numericValue = Number.parseFloat(newValue)

    if (newValue === "" || isNaN(numericValue)) {
      setError("Ingrese una cantidad válida")
      return
    }

    if (numericValue < min) {
      setError(`La cantidad mínima es ${min}`)
      return
    }

    if (max && numericValue > max) {
      setError(`La cantidad máxima es ${max}`)
      return
    }

    setError(null)
    onChange(numericValue)
  }

  const handleBlur = () => {
    // Formatear el valor al perder el foco
    if (!error && value > 0) {
      setInputValue(value.toFixed(step < 1 ? 1 : 0))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="quantity">{label}</Label>
        <Badge variant="secondary" className="text-xs">
          {UNIT_LABELS[unitBase]}
        </Badge>
      </div>

      <div className="relative">
        <Input
          id="quantity"
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder || `Cantidad en ${UNIT_LABELS[unitBase]}`}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={error ? "border-red-500" : ""}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {UNIT_LABELS[unitBase]}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs text-muted-foreground">{UNIT_HELPERS[unitBase]}</p>
    </div>
  )
}
