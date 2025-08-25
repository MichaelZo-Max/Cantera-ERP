"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedCard } from "@/components/ui/animated-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { mockProducts } from "@/lib/mock-data"
import type { Product } from "@/lib/types"
import { Package, Plus, Search, Edit, Trash2, CheckCircle, Sparkles } from "lucide-react"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "",
    pricePerUnit: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleNewProduct = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      description: "",
      unit: "",
      pricePerUnit: 0,
    })
    setShowForm(true)
    setSuccess("")
    setError("")
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      unit: product.unit,
      pricePerUnit: product.pricePerUnit,
    })
    setShowForm(true)
    setSuccess("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (editingProduct) {
        // Update existing product
        const updatedProducts = products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...formData,
                updatedAt: new Date(),
              }
            : p,
        )
        setProducts(updatedProducts)
        setSuccess("Producto actualizado exitosamente")
      } else {
        // Create new product
        const newProduct: Product = {
          id: String(Date.now()),
          ...formData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setProducts([...products, newProduct])
        setSuccess("Producto creado exitosamente")
      }

      setShowForm(false)
      setFormData({
        name: "",
        description: "",
        unit: "",
        pricePerUnit: 0,
      })
    } catch (err) {
      setError("Error al guardar el producto")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const updatedProducts = products.map((p) =>
        p.id === product.id
          ? {
              ...p,
              isActive: !p.isActive,
              updatedAt: new Date(),
            }
          : p,
      )
      setProducts(updatedProducts)
      setSuccess(`Producto ${product.isActive ? "desactivado" : "activado"} exitosamente`)
    } catch (err) {
      setError("Error al cambiar el estado del producto")
    }
  }

  return (
    <AppLayout title="Gestión de Productos">
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Productos
                </h2>
                <p className="text-muted-foreground">Gestiona el catálogo de productos con estilo</p>
              </div>
            </div>
          </div>
          <GradientButton onClick={handleNewProduct} className="flex items-center space-x-2 animate-pulse-glow">
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
            <Sparkles className="h-4 w-4 ml-1" />
          </GradientButton>
        </div>

        {/* Success/Error Messages with enhanced styling */}
        {success && (
          <AnimatedCard className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-300 font-medium">{success}</p>
              </div>
            </CardContent>
          </AnimatedCard>
        )}

        {error && (
          <AnimatedCard className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardContent className="pt-4">
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Enhanced Product Form */}
        {showForm && (
          <AnimatedCard hoverEffect="glow" className="glass">
            <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</span>
              </CardTitle>
              <CardDescription className="text-white/80">
                {editingProduct ? "Actualiza la información del producto" : "Completa los datos del nuevo producto"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Nombre del Producto *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del producto"
                      className="focus-ring"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm font-semibold">
                      Unidad de Medida *
                    </Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="m3, ton, kg, etc."
                      className="focus-ring"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción detallada del producto"
                    rows={3}
                    className="focus-ring resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit" className="text-sm font-semibold">
                    Precio por Unidad *
                  </Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pricePerUnit || ""}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="focus-ring"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <GradientButton
                    type="submit"
                    disabled={isSubmitting || !formData.name || !formData.unit || formData.pricePerUnit <= 0}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSkeleton className="w-4 h-4 mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {editingProduct ? "Actualizar" : "Crear Producto"}
                      </>
                    )}
                  </GradientButton>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingProduct(null)
                    }}
                    className="transition-smooth"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Enhanced Search */}
        <AnimatedCard hoverEffect="lift" className="glass">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por nombre, descripción o unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg focus-ring"
              />
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Enhanced Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <AnimatedCard className="glass">
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-lg">No se encontraron productos</p>
                  <p className="text-sm text-muted-foreground mt-2">Intenta con otros términos de búsqueda</p>
                </CardContent>
              </AnimatedCard>
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <AnimatedCard
                key={product.id}
                hoverEffect="lift"
                animateIn
                delay={index * 100}
                className="glass overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {product.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">Unidad: {product.unit}</p>
                    </div>
                    <Badge
                      variant={product.isActive ? "default" : "secondary"}
                      className={product.isActive ? "bg-gradient-primary" : ""}
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{product.description}</p>
                  )}

                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4 rounded-xl">
                    <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      ${product.pricePerUnit.toFixed(2)}
                    </p>
                    <p className="text-sm text-primary/80 font-medium">por {product.unit}</p>
                  </div>

                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={product.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(product)}
                      className="flex items-center space-x-1 transition-smooth"
                    >
                      {product.isActive ? <Trash2 className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      <span>{product.isActive ? "Desactivar" : "Activar"}</span>
                    </Button>
                  </div>
                </CardContent>
              </AnimatedCard>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
