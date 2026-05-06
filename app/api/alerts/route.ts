import { NextResponse } from "next/server";
import { alertStore } from "../../lib/store";

export async function GET() {
  return NextResponse.json({ alerts: alertStore, total: alertStore.length });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status } = body;
  const alert = alertStore.find((a) => a.id === id);
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  alert.status = status;
  return NextResponse.json({ alert });
}
