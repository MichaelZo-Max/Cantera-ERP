// app/(protected)/reports/reports-client.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

// Este componente contendrá la UI y la futura lógica interactiva (filtros, etc.)
export function ReportsClientUI() {
  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <BarChart className="h-10 w-10 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl font-bold mb-2">
            Módulo de Reportes
          </CardTitle>
          <p className="text-muted-foreground max-w-md mx-auto">
            Próximamente podrás visualizar y exportar reportes detallados de
            ventas, despachos, inventario y más.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}