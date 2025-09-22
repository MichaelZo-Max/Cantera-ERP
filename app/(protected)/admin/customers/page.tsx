// app/(protected)/admin/customers/page.tsx
import { AppLayout } from "@/components/app-layout";
import type { Client } from "@/lib/types";
import { CustomersClientUI } from "./customers-client";

export const dynamic = "force-dynamic";

type ApiResponse = {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function getCustomers(
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
    const res = await fetch(`${baseUrl}/api/customers?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      throw new Error("Failed to fetch customers");
    }
    return res.json();
  } catch (error) {
    console.error("Error loading customers on server:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page =
    typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const limit =
    typeof searchParams.limit === "string" ? Number(searchParams.limit) : 10;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const customersData = await getCustomers(page, limit, q);

  return (
    <AppLayout title="Gestión de Clientes">
      <CustomersClientUI
        data={customersData.data}
        pageCount={customersData.totalPages}
      />
    </AppLayout>
  );
}