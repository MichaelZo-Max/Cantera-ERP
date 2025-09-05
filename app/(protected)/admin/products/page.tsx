// app/(protected)/admin/products/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Product } from "@/lib/types";
import { ProductsClientUI } from "./products-client"; // Importamos el nuevo componente

// Función para cargar los datos en el servidor
async function getProducts(): Promise<{ products: Product[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/products`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al cargar los productos");
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