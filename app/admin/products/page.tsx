"use client"

import type React from "react"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { mockProducts } from "@/lib/mock-data"
import type { Product } from "@/lib/types"
import { Package, Plus, Search, Edit, Trash2, CheckCircle } from "lucide-react"

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Productos</h2>
            <p className="text-muted-foreground">Gestiona el catálogo de productos</p>
          </div>
          <Button onClick={handleNewProduct} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Product Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
              <CardDescription>
                {editingProduct ? "Actualiza la información del producto" : "Completa los datos del nuevo producto"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del producto"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad de Medida *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="m3, ton, kg, etc."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción detallada del producto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Precio por Unidad *</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pricePerUnit || ""}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name || !formData.unit || formData.pricePerUnit <= 0}
                  >
                    {isSubmitting ? "Guardando..." : editingProduct ? "Actualizar" : "Crear Producto"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingProduct(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, descripción o unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No se encontraron productos</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Unidad: {product.unit}</p>
                    </div>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
                  )}

                  <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                    <p className="text-lg font-bold text-primary">${product.pricePerUnit.toFixed(2)}</p>
                    <p className="text-sm text-primary/80">por {product.unit}</p>
                  </div>

                  <div className="flex space-x-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center space-x-1 flex-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={product.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(product)}
                      className="flex items-center space-x-1"
                    >
                      {product.isActive ? <Trash2 className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      <span>{product.isActive ? "Desactivar" : "Activar"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
