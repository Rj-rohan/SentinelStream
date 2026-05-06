"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface Source { id: string; name: string; type: string; status: string; engine: string; postsIngested: number; lastSync: string | null; latency: string; url?: string; schema?: Record<string, string>; agentTrace?: string[]; }
interface AgentStep { step: number; action: string; status: string; detail: string; reasoning?: string; }

const STATUS_COLOR: Record<string, string> = { active: "#10b981", analyzing: "#f59e0b", pending: "#64748b", error: "#ef4444" };
const STATUS_BG: Record<string, string> = { active: "rgba(16,185,129,0.1)", analyzing: "rgba(245,158,11,0.1)", pending: "rgba(100,116,139,0.1)", error: "rgba(239,68,68,0.1)" };

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [latency, setLatency] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [schema, setSchema] = useState<Record<string, string> | null>(null);
  const [agentError, setAgentError] = useState("");

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data.sources ?? []);
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setAgentSteps([]); setSchema(null); setAgentError("");
    const res = await fetch("/api/sources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name, latency }),
    });
    const data = await res.json();
    setAgentSteps(data.agentSteps ?? []);
    setSchema(data.schema ?? null);
    setAgentError(data.error ?? "");
    setLoading(false);
    fetchSources();
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: "0 auto" }} className="animate-in">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>Source Onboarding</h1>
          <p style={{ fontSize: 13, color: "var(--muted2)", marginTop: 2 }}>Agentic DOM analyzer powered by Gemini 1.5 Flash — paste any forum URL to auto-generate an extraction adapter</p>
        </div>

        <div className="grid-2" style={{ marginBottom: 24, alignItems: "start" }}>
          {/* Form */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Agentic Source Onboarding</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 20, lineHeight: 1.6 }}>
              Gemini 1.5 Flash visits the URL, analyzes the DOM structure, identifies post containers, author fields, timestamps, and pagination — then generates and validates an extraction schema automatically.
            </p>

            <form onSubmit={handleOnboard}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--muted2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Forum / Community URL *</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://forum.example.com/health-discussions" required style={{ width: "100%", padding: "10px 12px", fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--muted2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Source Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marathi Diabetes Community" required style={{ width: "100%", padding: "10px 12px", fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--muted2)", display: "block", marginBottom: 8, fontWeight: 500 }}>Ingestion Latency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["realtime", "daily", "weekly"].map((l) => (
                    <button key={l} type="button" onClick={() => setLatency(l)} style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 500, border: `1px solid ${latency === l ? "var(--accent)" : "var(--border2)"}`, background: latency === l ? "rgba(59,130,246,0.12)" : "transparent", color: latency === l ? "#60a5fa" : "var(--muted2)", fontFamily: "inherit" }}>{l}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? <><span className="spinner" /> Agent Analyzing…</> : <>🚀 Launch Agent</>}
              </button>
            </form>

            {/* Agent Steps */}
            {agentSteps.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent Reasoning Trace</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {agentSteps.map((step) => (
                    <div key={step.step} style={{ padding: "10px 12px", borderRadius: 8, background: step.status === "failed" ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${step.status === "failed" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}` }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: step.reasoning ? 4 : 0 }}>
                        <span style={{ fontSize: 13, color: step.status === "failed" ? "#f87171" : "#34d399" }}>{step.status === "failed" ? "✗" : "✓"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: step.status === "failed" ? "#f87171" : "#34d399" }}>Step {step.step}: {step.action}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted2)", paddingLeft: 21 }}>{step.detail}</div>
                      {step.reasoning && <div style={{ fontSize: 11, color: "#a78bfa", paddingLeft: 21, marginTop: 3, fontStyle: "italic" }}>↳ {step.reasoning}</div>}
                    </div>
                  ))}
                  {loading && <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}><span className="spinner" style={{ width: 12, height: 12 }} /> Processing…</div>}
                </div>

                {schema && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Generated Extraction Schema</div>
                    <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: 14, fontFamily: "monospace", fontSize: 11, lineHeight: 1.7, border: "1px solid var(--border)" }}>
                      {Object.entries(schema).map(([k, v]) => (
                        <div key={k}><span style={{ color: "#60a5fa" }}>{k}</span><span style={{ color: "var(--muted2)" }}>: </span><span style={{ color: "#34d399" }}>&quot;{String(v)}&quot;</span></div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 8, fontSize: 12, color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                      ✓ Adapter committed to engine registry — source is now active
                    </div>
                  </div>
                )}
                {agentError && <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, fontSize: 12, color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>✗ {agentError}</div>}
              </div>
            )}
          </div>

          {/* Registered Sources */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Registered Sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sources.map((src) => (
                <div key={src.id} style={{ padding: "14px 16px", borderRadius: 10, background: "var(--card2)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{src.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: STATUS_BG[src.status] || "rgba(100,116,139,0.1)", color: STATUS_COLOR[src.status] || "var(--muted2)" }}>
                      {src.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>Engine: {src.engine}</span>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>Type: {src.type}</span>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>Latency: {src.latency}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{src.postsIngested.toLocaleString()} posts</span>
                    {src.lastSync && <span style={{ fontSize: 11, color: "var(--muted)" }}>Last sync: {new Date(src.lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                  {src.url && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, wordBreak: "break-all" }}>{src.url}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline steps */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Agentic Onboarding Pipeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {[
              { n: "01", title: "Fetch & Render", desc: "HTTP fetch with rotating user-agents, robots.txt compliance" },
              { n: "02", title: "DOM Analysis", desc: "Gemini 1.5 Flash reasons about HTML structure and identifies selectors" },
              { n: "03", title: "Schema Generation", desc: "CSS selectors for post container, author, timestamp, body, pagination" },
              { n: "04", title: "Validation", desc: "Schema validated against sample pages. Reflects if score < 70%" },
              { n: "05", title: "Registration", desc: "Adapter committed to engine registry with full reasoning trace" },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(99,102,241,0.4)", marginBottom: 6, letterSpacing: "-1px" }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
