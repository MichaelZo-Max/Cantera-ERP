"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedCard } from "@/components/ui/animated-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import type { Product } from "@/lib/types"
import { Package, Plus, Search, Edit, Trash2, CheckCircle, Sparkles, Save } from "lucide-react"
import { toast } from "sonner"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        setProducts(await res.json());
      } catch (e: any) {
        setApiError(e?.message ?? "Error al cargar los productos");
        toast.error("Error al cargar productos", { description: e.message });
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleNewProduct = () => {
    setEditingProduct(null)
    setFormData({
      codigo: "",
      nombre: "",
      description: "",
    })
    setApiError(null)
    setShowDialog(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      codigo: product.codigo,
      nombre: product.nombre,
      description: product.description || "",
    })
    setApiError(null)
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setApiError(null)

    const method = editingProduct ? 'PATCH' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el producto");
      }

      const savedProduct = await res.json();
      
      if (editingProduct) {
        setProducts(products.map(p => p.id === savedProduct.id ? savedProduct : p));
        toast.success("Producto actualizado exitosamente.");
      } else {
        setProducts(prevProducts => [...prevProducts, savedProduct]);
        toast.success("Producto creado exitosamente.");
      }

      setShowDialog(false);
    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleStatus = async (product: Product) => {
    const isActive = product.isActive;
    if (!confirm(`¿Estás seguro de que quieres ${isActive ? "desactivar" : "activar"} este producto?`)) {
        return;
    }
    
    const originalProducts = [...products];
    setProducts(products.map(p => p.id === product.id ? { ...p, isActive: !isActive } : p));

    try {
        const res = await fetch(`/api/products/${product.id}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !isActive }), // Solo enviamos el cambio de estado
        });
        if(!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText);
        }
        
        toast.success(`Producto ${!isActive ? "activado" : "desactivado"} exitosamente.`);
    } catch (err: any) {
        setProducts(originalProducts);
        setApiError(err.message || "Error al cambiar el estado del producto");
        toast.error("Error al cambiar el estado", { description: err.message });
    }
  }
  
  if (loading) {
    return (
      <AppLayout title="Gestión de Productos">
        <div className="p-6 text-center">Cargando productos...</div>
      </AppLayout>
    );
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

        <AnimatedCard hoverEffect="lift" className="glass">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por nombre, descripción o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg focus-ring"
              />
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <AnimatedCard className="glass">
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-lg">No se encontraron productos</p>
                  <p className="text-sm text-muted-foreground mt-2">Intenta con otros términos de búsqueda o crea uno nuevo.</p>
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
                        {product.nombre}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">Código: {product.codigo}</p>
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

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                    </DialogTitle>
                    <DialogDescription>
                        {editingProduct ? "Actualiza la información del producto." : "Completa los datos del nuevo producto."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="codigo" className="font-semibold">Código *</Label>
                            <Input id="codigo" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="Ej: ARE-001" required className="focus-ring"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nombre" className="font-semibold">Nombre *</Label>
                            <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Arena Fina" required className="focus-ring"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="font-semibold">Descripción</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción detallada del producto (opcional)" rows={3} className="focus-ring"/>
                    </div>
                    {apiError && (
                      <p className="text-sm text-red-500">{apiError}</p>
                    )}
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                        <GradientButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {editingProduct ? "Guardar Cambios" : "Crear Producto"}
                                </>
                            )}
                        </GradientButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  )
}