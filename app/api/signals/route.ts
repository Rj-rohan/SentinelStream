import { NextResponse } from "next/server";
import { signalStore, projectStore } from "../../lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const severity  = searchParams.get("severity");
  const status    = searchParams.get("status");
  const source    = searchParams.get("source");

  let filtered = [...signalStore];
  if (projectId) filtered = filtered.filter((s) => s.projectId === projectId);
  if (severity)  filtered = filtered.filter((s) => s.severity  === severity);
  if (status)    filtered = filtered.filter((s) => s.status    === status);
  if (source)    filtered = filtered.filter((s) => s.source    === source);

  return NextResponse.json({ signals: filtered, total: filtered.length });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status } = body;
  const sig = signalStore.find((s) => s.id === id);
  if (!sig) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  sig.status = status;
  return NextResponse.json({ signal: sig });
}
