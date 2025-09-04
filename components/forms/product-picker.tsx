// components/forms/product-picker.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Product, ProductFormat, ProductSelection } from "@/lib/types"
import { toast } from "sonner"

interface ProductPickerProps {
  value: ProductSelection | null
  onChange: (value: ProductSelection | null) => void
  onFormatChange: (format: ProductFormat | null) => void; // Para devolver el objeto formato completo
  products?: Product[]
  placeholder?: string
  disabled?: boolean
}

export function ProductPicker({
  value,
  onChange,
  onFormatChange,
  products = [],
  placeholder = "Seleccionar producto...",
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [availableFormats, setAvailableFormats] = useState<ProductFormat[]>([])
  const [isLoadingFormats, setIsLoadingFormats] = useState(false)

  // Sincronizar con el valor externo cuando se resetea
  useEffect(() => {
    if (!value) {
      setSelectedProduct(null)
      setAvailableFormats([])
      onFormatChange(null)
    }
  }, [value, onFormatChange]);
  
  // EFECTO CLAVE: Cargar formatos cuando cambia el producto seleccionado
  const fetchFormats = useCallback(async () => {
    if (selectedProduct) {
      setIsLoadingFormats(true);
      try {
        const res = await fetch(`/api/product-formats?productId=${selectedProduct.id}`);
        if (!res.ok) throw new Error("No se pudieron cargar los formatos");
        const data: ProductFormat[] = await res.json();
        setAvailableFormats(data);
        
        // *** INICIO DE LA CORRECCIÓN ***
        // Si solo hay un formato, lo seleccionamos automáticamente usando los datos frescos
        if (data.length === 1) {
          const singleFormat = data[0];
          onChange({ productId: selectedProduct.id, formatId: singleFormat.id });
          onFormatChange(singleFormat);
        }
        // *** FIN DE LA CORRECCIÓN ***

      } catch (error) {
        toast.error("Error al cargar formatos.");
        setAvailableFormats([]);
      } finally {
        setIsLoadingFormats(false);
      }
    } else {
      setAvailableFormats([]);
    }
  }, [selectedProduct, onChange, onFormatChange]);

  useEffect(() => {
    fetchFormats();
  }, [fetchFormats])

  const handleProductSelect = (productCode: string) => {
    const product = products.find((p) => `${p.codigo} ${p.nombre}` === productCode)
    if (product) {
        setSelectedProduct(product)
        setOpen(false)
        // Reset format selection
        onChange({ productId: product.id, formatId: "" })
        onFormatChange(null)
    }
  }

  const handleFormatSelect = (formatId: string) => {
    if (selectedProduct) {
      onChange({ productId: selectedProduct.id, formatId })
      const format = availableFormats.find(f => f.id === formatId);
      onFormatChange(format || null);
    }
  }

  const selectedFormat = availableFormats.find((f) => f.id === value?.formatId)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Producto</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-transparent"
              disabled={disabled}
            >
              {selectedProduct ? (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="truncate">{selectedProduct.nombre}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar producto..." />
              <CommandList>
                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.codigo} ${product.nombre}`}
                      onSelect={handleProductSelect}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{product.nombre}</div>
                            <div className="text-sm text-muted-foreground">Código: {product.codigo}</div>
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedProduct && (
        <div className="space-y-2">
          <Label>Formato</Label>
          <Select
            value={value?.formatId || ""}
            onValueChange={handleFormatSelect}
            disabled={disabled || isLoadingFormats || availableFormats.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingFormats ? "Cargando..." : "Seleccionar formato..."} />
            </SelectTrigger>
            <SelectContent>
              {availableFormats.map((format) => (
                <SelectItem key={format.id} value={format.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{format.sku || `Formato ${format.unidadBase}`}</span>
                    <Badge variant="secondary" className="ml-2">
                      {format.pricePerUnit ? `$${format.pricePerUnit.toFixed(2)}` : format.unidadBase}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}