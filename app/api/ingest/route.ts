import { NextResponse } from "next/server";
import { projectStore } from "../../lib/store";
import { ingestRedditForProject } from "../../lib/reddit";
import { ingestOpenFDAForProject } from "../../lib/openfda";
import { ingestTwitterForProject } from "../../lib/twitter";

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

  const toIngest: string[] = sources ?? project.sources;
  const results: Record<string, number> = {};

  await Promise.all([
    toIngest.includes("reddit")
      ? ingestRedditForProject(projectId).then((n) => { results.reddit = n; })
      : Promise.resolve(),
    toIngest.includes("openfda")
      ? ingestOpenFDAForProject(projectId).then((n) => { results.openfda = n; })
      : Promise.resolve(),
    toIngest.includes("twitter")
      ? ingestTwitterForProject(projectId).then((n) => { results.twitter = n; })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ingested: results,
    total: Object.values(results).reduce((a, b) => a + b, 0),
    projectId,
  });
}
