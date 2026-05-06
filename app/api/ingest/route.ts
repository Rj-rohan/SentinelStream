import { NextResponse } from "next/server";
import { projectStore } from "../../lib/store";
import { ingestRedditForProject } from "../../lib/reddit";
import { ingestOpenFDAForProject } from "../../lib/openfda";
import { ingestTwitterForProject } from "../../lib/twitter";

// Track which projects are currently ingesting so we don't double-run
const ingestingProjects = new Set<string>();

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, sources } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = projectStore.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // If already ingesting, return status immediately
  if (ingestingProjects.has(projectId)) {
    return NextResponse.json({ status: "already_running", projectId });
  }

  const toIngest: string[] = sources ?? project.sources;

  // Mark as ingesting
  ingestingProjects.add(projectId);

  // Run ingestion in background — respond immediately so UI doesn't hang
  Promise.all([
    toIngest.includes("reddit")
      ? ingestRedditForProject(projectId)
      : Promise.resolve(0),
    toIngest.includes("openfda")
      ? ingestOpenFDAForProject(projectId)
      : Promise.resolve(0),
    toIngest.includes("twitter")
      ? ingestTwitterForProject(projectId)
      : Promise.resolve(0),
  ])
    .catch(console.error)
    .finally(() => ingestingProjects.delete(projectId));

  return NextResponse.json({
    status: "started",
    projectId,
    message: "Ingestion started in background. Refresh signals in 15–30 seconds.",
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  return NextResponse.json({
    running: projectId ? ingestingProjects.has(projectId) : ingestingProjects.size > 0,
    activeProjects: Array.from(ingestingProjects),
  });
}
