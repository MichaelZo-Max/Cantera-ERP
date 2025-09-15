// app/api/deliveries/[id]/route.ts
import { NextResponse } from "next/server";
import { executeQuery, TYPES } from "@/lib/db";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const despachoId = parseInt(params.id, 10);
    if (isNaN(despachoId)) {
      return new NextResponse("ID de despacho inválido", { status: 400 });
    }

    const formData = await request.formData();
    const status = formData.get("status") as string;
    const notes = formData.get("notes") as string | null;
    const userId = formData.get("userId") as string;
    const photoFile = formData.get("photoFile") as File | null;

    // --- LÓGICA DE FOTO (sin cambios) ---
    let photoUrl: string | null = null;
    if (photoFile) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const filename = `${Date.now()}_${photoFile.name.replace(/\s/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads");

      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);

      photoUrl = `/uploads/${filename}`;
    }
    // --- FIN LÓGICA FOTO ---

    if (status === "CARGADA") {
      const itemsJson = formData.get("items") as string;
      if (!userId || !itemsJson) {
        return new NextResponse("Faltan datos para confirmar la carga", {
          status: 400,
        });
      }

      // Llamada al procedimiento almacenado que encapsula toda la lógica
      await executeQuery(
        "EXEC RIP.SP_CONFIRMAR_CARGA @despachoId, @userId, @notes, @photoUrl, @itemsJson",
        [
          { name: "despachoId", type: TYPES.Int, value: despachoId },
          { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
          { name: "notes", type: TYPES.NVarChar, value: notes },
          { name: "photoUrl", type: TYPES.NVarChar, value: photoUrl },
          { name: "itemsJson", type: TYPES.NVarChar, value: itemsJson },
        ]
      );
    } else if (status === "SALIDA_OK") {
      if (!userId)
        return new NextResponse("ID de usuario requerido", { status: 400 });
      const sql = `UPDATE RIP.APP_DESPACHOS
                   SET status='SALIDA_OK',
                       exited_by=@userId,
                       exited_at=GETDATE(),
                       notes=ISNULL(@notes, notes),
                       ${photoUrl ? "exit_photo_url=@photoUrl," : ""}
                       updated_at=GETDATE()
                   WHERE id=@id`;
      const p = [
        { name: "id", type: TYPES.Int, value: despachoId },
        { name: "notes", type: TYPES.NVarChar, value: notes ?? null },
        { name: "userId", type: TYPES.Int, value: parseInt(userId, 10) },
      ];
      if (photoUrl) {
        p.push({ name: "photoUrl", type: TYPES.NVarChar, value: photoUrl });
      }
      await executeQuery(sql, p);
    } else {
      return new NextResponse("Estado no manejado", { status: 400 });
    }

    revalidateTag("deliveries");
    revalidateTag("orders");

    const finalDeliveryState = await executeQuery(
      'SELECT * FROM RIP.VW_APP_DESPACHOS WHERE delivery_id = @id', 
      [{ name: 'id', type: TYPES.Int, value: despachoId }]
    );

    return NextResponse.json(finalDeliveryState[0]);
  } catch (e) {
    console.error("[API_DELIVERIES_PATCH]", e);
    return new NextResponse("Error al actualizar el despacho", { status: 500 });
  }
}
