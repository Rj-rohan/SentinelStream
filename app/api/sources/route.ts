import { NextResponse } from "next/server";
import { sourceStore } from "../../lib/store";
import { runAgenticOnboarding } from "../../lib/agent";

export async function GET() {
  return NextResponse.json({ sources: sourceStore, total: sourceStore.length });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { url, name, latency } = body;

  if (!url || !name) {
    return NextResponse.json({ error: "url and name are required" }, { status: 400 });
  }

  // Add to store as "analyzing"
  const newSource = {
    id: `src_${Date.now()}`,
    name,
    type: "agentic" as const,
    status: "analyzing" as const,
    engine: "Agentic DOM Analyzer",
    postsIngested: 0,
    lastSync: null,
    latency: latency ?? "daily",
    url,
  };
  sourceStore.push(newSource);

  // Run agentic analysis
  const { steps, schema, error } = await runAgenticOnboarding(url, name);

  // Update source in store
  const src = sourceStore.find((s) => s.id === newSource.id);
  if (src) {
    src.status = error ? "error" : "active";
    if (schema) src.schema = schema as unknown as Record<string, string>;
    src.agentTrace = steps.map((s) => `Step ${s.step} [${s.action}]: ${s.detail}`);
  }

  return NextResponse.json({
    source: src ?? newSource,
    agentSteps: steps,
    schema,
    error,
  }, { status: error ? 422 : 201 });
}
