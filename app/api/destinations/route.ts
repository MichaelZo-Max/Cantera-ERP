import { NextResponse } from "next/server"
import { mockDestinations } from "@/lib/mock-data"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * @route GET /api/destinations
 * @desc  Listar destinos (opcional: ?clientId=ID)
 */
export async function GET(request: Request) {
  await sleep(200)
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("clientId")

  const data = mockDestinations.filter((d) => d.isActive && (!clientId || d.clientId === clientId))
  return NextResponse.json(data)
}
