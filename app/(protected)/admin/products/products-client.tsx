// app/(protected)/admin/products/products-client.tsx
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, ProductFormat, UnitBase } from "@/lib/types";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";

// --- Componente Anidado para el Modal de Formatos ---
function FormatsDialog({
  product,
  open,
  onOpenChange,
  onFormatUpdate,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormatUpdate: () => void;
}) {
  const [formats, setFormats] = useState<ProductFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFormatForm, setShowFormatForm] = useState(false);
  const [editingFormat, setEditingFormat] = useState<ProductFormat | null>(null);
  const [formatData, setFormatData] = useState({
    sku: "",
    pricePerUnit: 0,
    unitBase: "M3" as UnitBase,
    baseUnitFactor: 1,
  });

  const fetchFormats = useCallback(async () => {
    if (product) {
      setLoading(true);
      try {
        const res = await fetch(`/api/product-formats?productId=${product.id}`);
        if (!res.ok) throw new Error("No se pudieron cargar los formatos");
        const data = await res.json();
        setFormats(data);
      } catch (error) {
        toast.error("Error al cargar formatos.");
      } finally {
        setLoading(false);
      }
    }
  }, [product]);

  useEffect(() => {
    if (open) {
      fetchFormats();
    }
  }, [open, fetchFormats]);

  const handleNewFormat = () => {
    setEditingFormat(null);
    setFormatData({ sku: "", pricePerUnit: 0, unitBase: "M3", baseUnitFactor: 1 });
    setShowFormatForm(true);
  };

  const handleEditFormat = (format: ProductFormat) => {
    setEditingFormat(format);
    setFormatData({
      sku: format.sku || "",
      pricePerUnit: format.pricePerUnit || 0,
      unitBase: format.unidadBase,
      baseUnitFactor: format.factorUnidadBase,
    });
    setShowFormatForm(true);
  };

  const handleSaveFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editingFormat ? `/api/product-formats/${editingFormat.id}` : "/api/product-formats";
    const method = editingFormat ? "PATCH" : "POST";
    const payload = {
      sku: formatData.sku,
      price_per_unit: formatData.pricePerUnit,
      unit_base: formatData.unitBase,
      base_unit_factor: formatData.baseUnitFactor,
      product_id: product?.id,
      is_active: editingFormat ? editingFormat.activo : undefined,
    };

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Formato ${editingFormat ? "actualizado" : "creado"} con éxito.`);
      setShowFormatForm(false);
      fetchFormats();
      onFormatUpdate();
    } catch (error: any) {
      toast.error("Error al guardar formato", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Formatos de: {product.nombre}</DialogTitle>
          <DialogDescription>Gestiona las unidades de venta y precios para este producto.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loading ? <p>Cargando formatos...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>SKU/Descripción</TableHead><TableHead>Unidad</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {formats.map((format) => (
                  <TableRow key={format.id}>
                    <TableCell className="font-medium">{format.sku}</TableCell>
                    <TableCell>{format.unidadBase}</TableCell>
                    <TableCell>${format.pricePerUnit?.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={format.activo ? "default" : "secondary"}>{format.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEditFormat(format)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handleNewFormat}><Plus className="h-4 w-4 mr-2" />Nuevo Formato</Button>
        </DialogFooter>
        <Dialog open={showFormatForm} onOpenChange={setShowFormatForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editingFormat ? "Editar Formato" : "Nuevo Formato"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveFormat} className="space-y-4 pt-4">
              <div className="space-y-2"><Label htmlFor="sku">SKU / Descripción</Label><Input id="sku" value={formatData.sku} onChange={(e) => setFormatData({ ...formatData, sku: e.target.value })} placeholder="Ej: Arena a Granel (m³)" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="unitBase">Unidad Base</Label><Select value={formatData.unitBase} onValueChange={(v: UnitBase) => setFormatData({ ...formatData, unitBase: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M3">M3</SelectItem><SelectItem value="TON">Tonelada</SelectItem><SelectItem value="SACO">Saco</SelectItem><SelectItem value="UNIDAD">Unidad</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="pricePerUnit">Precio Unitario</Label><Input id="pricePerUnit" type="number" value={formatData.pricePerUnit} onChange={(e) => setFormatData({ ...formatData, pricePerUnit: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setShowFormatForm(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsClientUI({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [providers, setProviders] = useState<{ id: string; nombre: string }[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [selectedProductForFormats, setSelectedProductForFormats] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ refProveedor: "", nombre: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const fetchProductsAndProviders = useCallback(async () => {
    try {
      const [productsRes, providersRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/providers", { cache: "no-store" }),
      ]);
      if (!productsRes.ok) throw new Error(await productsRes.text());
      if (!providersRes.ok) throw new Error(await providersRes.text());
      
      setProducts(await productsRes.json());
      setProviders(await providersRes.json());
    } catch (e: any) {
      toast.error("Error al recargar datos", { description: e.message });
    }
  }, []);
  
  useEffect(() => {
    fetchProductsAndProviders();
  }, [fetchProductsAndProviders]);

  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({ refProveedor: "", nombre: "", description: "" });
    setApiError(null);
    setShowProductDialog(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({ 
        refProveedor: String(product.refProveedor || ''),
        nombre: product.nombre, 
        description: product.description || "" 
    });
    setApiError(null);
    setShowProductDialog(true);
  };

  const handleManageFormats = (product: Product) => {
    setSelectedProductForFormats(product);
    setShowFormatDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    const method = editingProduct ? "PATCH" : "POST";
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(await res.text() || "Error al guardar el producto");
      
      fetchProductsAndProviders();

      toast.success(editingProduct ? "Producto actualizado" : "Producto creado");
      setShowProductDialog(false);
    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (product: Product) => {
    confirm({
        title: `¿Estás seguro?`,
        description: `Esta acción ${product.is_active ? "desactivará" : "activará"} el producto "${product.nombre}".`,
        confirmText: product.is_active ? "Desactivar" : "Activar",
        variant: product.is_active ? "destructive" : "default",
      },
      async () => {
        try {
          const res = await fetch(`/api/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !product.is_active }) });
          if (!res.ok) throw new Error(await res.text());
          await fetchProductsAndProviders();
          toast.success(`Producto ${!product.is_active ? "activado" : "desactivado"}.`);
        } catch (err: any) {
          toast.error("Error al cambiar el estado", { description: err.message });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
        <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleCancel}
        title={options?.title || ""}
        description={options?.description || ""}
        onConfirm={handleConfirm}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
      />
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg"><Package className="h-6 w-6 text-white" /></div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Productos</h2>
                <p className="text-muted-foreground">Gestiona el catálogo de productos y sus formatos</p>
              </div>
            </div>
          </div>
          <GradientButton onClick={handleNewProduct} className="flex items-center space-x-2 animate-pulse-glow">
            <Plus className="h-4 w-4" /><span>Nuevo Producto</span>
          </GradientButton>
        </div>

        {/* Search Bar */}
        <AnimatedCard hoverEffect="lift" className="glass">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input placeholder="Buscar por nombre o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 text-lg focus-ring" />
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
              <AnimatedCard key={product.id} hoverEffect="lift" animateIn delay={index * 100} className="glass overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">{product.nombre}</CardTitle>
                    </div>
                    <Badge variant={product.is_active ? "default" : "secondary"} className={product.is_active ? "bg-gradient-primary" : ""}>{product.is_active ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow flex flex-col">
                  {product.description && <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-grow">{product.description}</p>}
                  <div className="flex space-x-2 pt-4 border-t mt-auto">
                    <Button variant="outline" size="sm" onClick={() => handleManageFormats(product)} className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-accent/10"><Layers className="h-3 w-3" /><span>Formatos</span></Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} className="flex items-center space-x-1 transition-smooth hover:bg-primary/5"><Edit className="h-3 w-3" /><span>Editar</span></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(product)} className="transition-smooth">
                      {product.is_active ? <Trash2 className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                    </Button>
                  </div>
                </CardContent>
              </AnimatedCard>
            ))
          )}
        </div>

        {/* Product Create/Edit Dialog */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
              <DialogDescription>{editingProduct ? "Actualiza la información del producto." : "Completa los datos del nuevo producto."}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refProveedor" className="font-semibold">Proveedor *</Label>
                  <Select value={formData.refProveedor} onValueChange={(value) => setFormData({ ...formData, refProveedor: value })} required>
                    <SelectTrigger id="refProveedor" className="focus-ring">
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={String(provider.id)}>
                          {provider.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="font-semibold">Nombre *</Label>
                  <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Arena Fina" required className="focus-ring" />
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="description" className="font-semibold">Descripción</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción detallada del producto (opcional)" rows={3} className="focus-ring" /></div>
              {apiError && <p className="text-sm text-red-500">{apiError}</p>}
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowProductDialog(false)}>Cancelar</Button>
                <GradientButton type="submit" disabled={isSubmitting || !formData.nombre || !formData.refProveedor}>
                  {isSubmitting ? (<><LoadingSkeleton className="w-4 h-4 mr-2" />Guardando...</>) : (<><Save className="h-4 w-4 mr-2" />{editingProduct ? "Guardar Cambios" : "Crear Producto"}</>)}
                </GradientButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Formats Management Dialog */}
        <FormatsDialog product={selectedProductForFormats} open={showFormatDialog} onOpenChange={setShowFormatDialog} onFormatUpdate={fetchProductsAndProviders} />
      </div>
    );
}