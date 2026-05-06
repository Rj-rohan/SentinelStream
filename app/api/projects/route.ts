import { NextResponse } from "next/server";
import { projectStore, ensureDefaultProject } from "../../lib/store";
import type { Project } from "../../lib/store";
import { ingestRedditForProject } from "../../lib/reddit";
import { ingestOpenFDAForProject } from "../../lib/openfda";
import { ingestTwitterForProject } from "../../lib/twitter";

// Seed default project and kick off initial ingestion once
let initialIngestionDone = false;

async function maybeRunInitialIngestion() {
  ensureDefaultProject();
  if (initialIngestionDone) return;
  initialIngestionDone = true;
  const defaultProj = projectStore.find((p) => p.id === "proj_default");
  if (defaultProj) {
    // Run in background — don't await
    Promise.all([
      ingestRedditForProject("proj_default"),
      ingestOpenFDAForProject("proj_default"),
    ]).catch(console.error);
  }
}

export async function GET() {
  await maybeRunInitialIngestion();
  return NextResponse.json({ projects: projectStore, total: projectStore.length });
}

export async function POST(req: Request) {
  ensureDefaultProject();
  const body = await req.json();

  if (!body.name || !body.drugs?.length) {
    return NextResponse.json({ error: "name and drugs are required" }, { status: 400 });
  }

  const project: Project = {
    id: `proj_${Date.now()}`,
    name: body.name,
    description: body.description ?? "",
    drugs: body.drugs,
    conditions: body.conditions ?? [],
    symptoms: body.symptoms ?? [],
    sources: body.sources ?? ["reddit", "openfda"],
    subreddits: body.subreddits ?? [],
    twitterKeywords: body.twitterKeywords ?? [],
    latency: body.latency ?? "daily",
    status: "active",
    signalCount: 0,
    criticalCount: 0,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  projectStore.push(project);

  // Background ingestion
  Promise.all([
    project.sources.includes("reddit") ? ingestRedditForProject(project.id) : Promise.resolve(0),
    project.sources.includes("openfda") ? ingestOpenFDAForProject(project.id) : Promise.resolve(0),
    project.sources.includes("twitter") ? ingestTwitterForProject(project.id) : Promise.resolve(0),
  ]).catch(console.error);

  return NextResponse.json({ project }, { status: 201 });
}
