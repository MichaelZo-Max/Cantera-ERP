// app/(protected)/admin/products/page.tsx

export const dynamic = "force-dynamic";

import { AppLayout } from "@/components/app-layout";
import type { Product } from "@/lib/types";
import { ProductsClientUI } from "./products-client"; // Importamos el nuevo componente

// Función para cargar los datos en el servidor
async function getProducts(): Promise<{ products: Product[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/products`, {
      next: {
        revalidate: 60, // Revalida cada 60 segundos
        tags: ["products"],
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch products");
    }
    const products = await res.json();
    return { products };
  } catch (error) {
    console.error("Error cargando productos en el servidor:", error);
    return { products: [] };
  }
}

// Esta página ahora es un Server Component
export default async function ProductsPage() {
  const { products } = await getProducts();

  return (
    <AppLayout title="Gestión de Productos">
      {/* Pasamos los datos iniciales al componente de cliente */}
      <ProductsClientUI initialProducts={products} />
    </AppLayout>
  );
}
