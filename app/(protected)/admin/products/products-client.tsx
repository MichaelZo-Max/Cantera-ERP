// app/(protected)/admin/products/products-client.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/ui/animated-card";
import type { Product } from "@/lib/types";
import { Package, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

// Componente simplificado a solo lectura
export function ProductsClientUI({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      ),
    [products, searchTerm]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header simplificado, sin botón de "Nuevo Producto" */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Consulta de Productos
              </h2>
              <p className="text-muted-foreground">
                Catálogo de productos de solo lectura
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar (se mantiene) */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Grilla de Productos (solo lectura) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="No hay productos para mostrar"
                  description="El catálogo de productos está vacío o no se pudo cargar."
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <AnimatedCard
              key={product.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      {product.nombre}
                    </CardTitle>
                    <p className="text-sm font-semibold text-primary mt-1">
                      ${(product.price_per_unit || 0).toFixed(2)} / {product.unit}
                    </p>
                  </div>
                  <Badge
                    variant={product.is_active ? "default" : "secondary"}
                    className={product.is_active ? "bg-gradient-primary" : ""}
                  >
                    {product.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col">
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-grow">
                    {product.description}
                  </p>
                )}
              </CardContent>
            </AnimatedCard>
          ))
        )}
      </div>
    </div>
  );
}