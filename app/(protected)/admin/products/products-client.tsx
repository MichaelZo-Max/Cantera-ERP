"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/ui/animated-card";
import type { Product } from "@/lib/types";
import { Package,Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function ProductsClientUI({
  data,
  pageCount,
}: {
  data: Product[];
  pageCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get("page")) || 1;
  const currentQuery = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Efecto corregido para actualizar la URL solo cuando la búsqueda cambia
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Solo actualizamos la URL si el término de búsqueda debounced es diferente
    // al que ya está en la URL, para evitar bucles de renderizado.
    if (debouncedSearchTerm !== currentQuery) {
      if (debouncedSearchTerm) {
        params.set("q", debouncedSearchTerm);
      } else {
        params.delete("q");
      }
      // Volver a la página 1 solo cuando se realiza una nueva búsqueda
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearchTerm, currentQuery, pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
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

      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por nombre o descripcion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="No se encontraron productos"
                  description="Intenta con otra búsqueda o revisa el catálogo más tarde."
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          data.map((product, index) => (
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
                      {product.name}
                    </CardTitle>
                    <p className="text-sm font-semibold text-primary mt-1">
                      ${(product.price_per_unit || 0).toFixed(2)} / Unidad
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

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
            <span className="text-sm text-muted-foreground px-4">
              Página {currentPage} de {pageCount}
            </span>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < pageCount)
                    handlePageChange(currentPage + 1);
                }}
                className={
                  currentPage === pageCount
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}