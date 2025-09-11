// app/(protected)/reports/page.tsx

export const dynamic = 'force-dynamic'

import { AppLayout } from "@/components/app-layout";
import { ReportsClientUI } from "./reports-client"; // Importamos el nuevo componente

// Esta página ahora es un Server Component.
// En el futuro, aquí es donde cargarías los datos para los reportes.
export default async function ReportsPage() {
  // const reportData = await getReportData(); // Ejemplo futuro

  return (
    <AppLayout title="Reportes">
      {/* Renderizamos el componente de cliente.
        En el futuro, le pasarías los datos así:
        <ReportsClientUI initialData={reportData} />
      */}
      <ReportsClientUI />
    </AppLayout>
  );
}