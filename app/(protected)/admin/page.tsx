// app/(protected)/admin/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";

/**
 * Página principal de Administración.
 * Redirige automáticamente a la primera sección de catálogos (productos).
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <AppLayout title="Administración">
      <div className="text-center p-8">
        <p>Redirigiendo a la página principal...</p>
      </div>
    </AppLayout>
  );
}