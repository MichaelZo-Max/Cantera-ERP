"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantityInput({
  value,
  onChange,
  label = "Cantidad",
  placeholder,
  disabled = false,
  min = 0,
  max,
  step = 1, // Cambiado a 1 para unidades enteras
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);

  // Sincronizar con el valor externo
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue === "") {
      setError("Ingrese una cantidad");
      onChange(0); // Opcional: resetear a 0 si el campo está vacío
      return;
    }
    
    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue) || numericValue < 0) {
      setError("Ingrese una cantidad válida");
      return;
    }

    if (numericValue < min) {
      setError(`La cantidad mínima es ${min}`);
      return;
    }

    if (max && numericValue > max) {
      setError(`La cantidad máxima es ${max}`);
      return;
    }

    setError(null);
    onChange(numericValue);
  };

  const handleBlur = () => {
    // Formatear el valor al perder el foco
    if (!error && value > 0) {
      setInputValue(value.toFixed(0)); // Redondear a 0 decimales para unidades
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="quantity">{label}</Label>
        <Badge variant="secondary" className="text-xs">
          Unidades
        </Badge>
      </div>

      <div className="relative">
        <Input
          id="quantity"
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder || "Cantidad en Unidades"}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={error ? "border-red-500" : ""}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Unidades
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}