import { NextResponse } from "next/server"
import { mockProductFormats } from "@/lib/mock-data"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * @route GET /api/product-formats
 * @desc  Listar formatos de producto (opcional: ?productId=ID)
 */
export async function GET(request: Request) {
  await sleep(300)
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("productId")

  const data = mockProductFormats.filter((f) => f.activo && (!productId || f.productId === productId))
  return NextResponse.json(data)
}
