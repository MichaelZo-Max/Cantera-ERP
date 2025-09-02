"use client"

import { useState, useEffect } from "react"
import { Search, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Product, ProductFormat, ProductSelection } from "@/lib/types"

interface ProductPickerProps {
  value: ProductSelection | null
  onChange: (value: ProductSelection | null) => void
  products?: Product[]
  formats?: ProductFormat[]
  placeholder?: string
  disabled?: boolean
}

export function ProductPicker({
  value,
  onChange,
  products = [],
  formats = [],
  placeholder = "Seleccionar producto...",
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [availableFormats, setAvailableFormats] = useState<ProductFormat[]>([])

  // Filtrar formatos disponibles cuando se selecciona un producto
  useEffect(() => {
    if (selectedProduct) {
      const productFormats = formats.filter((f) => f.productId === selectedProduct.id && f.activo)
      setAvailableFormats(productFormats)
    } else {
      setAvailableFormats([])
    }
  }, [selectedProduct, formats])

  // Sincronizar con el valor externo
  useEffect(() => {
    if (value?.productId) {
      const product = products.find((p) => p.id === value.productId)
      setSelectedProduct(product || null)
    } else {
      setSelectedProduct(null)
    }
  }, [value, products])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setOpen(false)
    // Reset format selection when product changes
    onChange({ productId: product.id, formatId: "" })
  }

  const handleFormatSelect = (formatId: string) => {
    if (selectedProduct) {
      onChange({ productId: selectedProduct.id, formatId })
    }
  }

  const selectedFormat = availableFormats.find((f) => f.id === value?.formatId)

  return (
    <div className="space-y-4">
      {/* Product Selection */}
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
                  <Badge variant="secondary" className="ml-auto">
                    {selectedProduct.area}
                  </Badge>
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
                      onSelect={() => handleProductSelect(product)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{product.nombre}</div>
                            <div className="text-sm text-muted-foreground">Código: {product.codigo}</div>
                          </div>
                        </div>
                        <Badge variant="outline">{product.area}</Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Format Selection */}
      {selectedProduct && availableFormats.length > 0 && (
        <div className="space-y-2">
          <Label>Formato</Label>
          <Select value={value?.formatId || ""} onValueChange={handleFormatSelect} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar formato..." />
            </SelectTrigger>
            <SelectContent>
              {availableFormats.map((format) => (
                <SelectItem key={format.id} value={format.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{format.sku || `Formato ${format.unidadBase}`}</span>
                    <Badge variant="secondary" className="ml-2">
                      {format.unidadBase}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedFormat && (
            <div className="text-sm text-muted-foreground">
              Factor: {selectedFormat.factorUnidadBase} {selectedFormat.unidadBase}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
