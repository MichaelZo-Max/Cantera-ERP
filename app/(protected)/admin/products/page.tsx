import { AppLayout } from "@/components/app-layout";
import { ProductsClientUI } from "./products-client";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type ApiResponse = {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function getProducts(
  page: number,
  limit: number,
  q?: string
): Promise<ApiResponse> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (q) {
      params.set("q", q);
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/api/products?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      throw new Error("Failed to fetch products");
    }
    return res.json();
  } catch (error) {
    console.error("Error loading products on server:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page =
    typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const limit =
    typeof searchParams.limit === "string" ? Number(searchParams.limit) : 9; // Ajustado a 9 para una cuadrícula de 3x3
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const productsData = await getProducts(page, limit, q);

  return (
    <AppLayout title="Gestión de Productos">
      {/* Pasamos los datos y el conteo de páginas con los nombres de props correctos */}
      <ProductsClientUI
        data={productsData.data}
        pageCount={productsData.totalPages}
      />
    </AppLayout>
  );
}

