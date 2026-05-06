import { NextResponse } from "next/server";
import { signalStore } from "../../lib/store";
import { ingestRedditForProject } from "../../lib/reddit";
import { ingestOpenFDAForProject } from "../../lib/openfda";
import { ingestTwitterForProject } from "../../lib/twitter";
import { projectStore } from "../../lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const severity = searchParams.get("severity");
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const refresh = searchParams.get("refresh");

  // If refresh=true, trigger a fresh ingestion for the project
  if (refresh === "true" && projectId) {
    const project = projectStore.find((p) => p.id === projectId);
    if (project) {
      await Promise.all([
        ingestRedditForProject(projectId),
        ingestOpenFDAForProject(projectId),
        project.sources.includes("twitter") ? ingestTwitterForProject(projectId) : Promise.resolve(0),
      ]);
    }
  }

  let filtered = [...signalStore];
  if (projectId) filtered = filtered.filter((s) => s.projectId === projectId);
  if (severity) filtered = filtered.filter((s) => s.severity === severity);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (source) filtered = filtered.filter((s) => s.source === source);

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
