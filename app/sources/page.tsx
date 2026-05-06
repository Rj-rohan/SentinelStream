"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface Source { id: string; name: string; type: string; status: string; engine: string; postsIngested: number; lastSync: string | null; latency: string; url?: string; schema?: Record<string, string>; }
interface AgentStep { step: number; action: string; status: string; detail: string; reasoning?: string; }

const STATUS_DOT: Record<string, string> = { active: "#10b981", analyzing: "#f59e0b", pending: "#334155", error: "#ef4444" };

export default function SourcesPage() {
  const [sources,    setSources]    = useState<Source[]>([]);
  const [url,        setUrl]        = useState("");
  const [name,       setName]       = useState("");
  const [latency,    setLatency]    = useState("daily");
  const [loading,    setLoading]    = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [schema,     setSchema]     = useState<Record<string, string> | null>(null);
  const [agentError, setAgentError] = useState("");

  const loadSources = useCallback(async () => {
    const r = await fetch("/api/sources");
    const d = await r.json();
    setSources(d.sources ?? []);
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setAgentSteps([]); setSchema(null); setAgentError("");
    const res  = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, name, latency }) });
    const data = await res.json();
    setAgentSteps(data.agentSteps ?? []);
    setSchema(data.schema ?? null);
    setAgentError(data.error ?? "");
    setLoading(false);
    loadSources();
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }} className="fade-up">
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>Source Onboarding</h1>
          <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>Agentic DOM analyzer powered by Gemini 1.5 Flash — paste any forum URL to auto-generate an extraction adapter</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, alignItems: "start" }}>
          {/* Form */}
          <div className="card fade-up-2" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 0 16px rgba(79,70,229,0.3)" }}>🤖</div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>Agentic Source Onboarding</span>
            </div>
            <p style={{ fontSize: 12, color: "#334155", marginBottom: 20, lineHeight: 1.7 }}>
              Gemini 1.5 Flash visits the URL, analyzes the DOM, identifies post containers, author fields, timestamps, and pagination — then generates and validates an extraction schema automatically.
            </p>

            <form onSubmit={handleOnboard}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Forum / Community URL *</label>
                <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://forum.example.com/health-discussions" required />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Source Name *</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marathi Diabetes Community" required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Ingestion Latency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["realtime","daily","weekly"].map(l => (
                    <button key={l} type="button" onClick={() => setLatency(l)} className={`chip${latency === l ? " active" : ""}`}>{l}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? <><span className="spinner" /> Agent Analyzing…</> : <>🚀 Launch Agent</>}
              </button>
            </form>

            {/* Agent trace */}
            {agentSteps.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Agent Reasoning Trace</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {agentSteps.map(step => (
                    <div key={step.step} style={{ padding: "10px 12px", borderRadius: 9, background: step.status === "failed" ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)", border: `1px solid ${step.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.12)"}` }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: step.status === "failed" ? "#fca5a5" : "#6ee7b7", fontWeight: 700 }}>{step.status === "failed" ? "✗" : "✓"}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: step.status === "failed" ? "#fca5a5" : "#6ee7b7" }}>Step {step.step}: {step.action}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", paddingLeft: 20, marginTop: 2 }}>{step.detail}</div>
                      {step.reasoning && <div style={{ fontSize: 11, color: "#a78bfa", paddingLeft: 20, marginTop: 2, fontStyle: "italic" }}>↳ {step.reasoning}</div>}
                    </div>
                  ))}
                  {loading && (
                    <div style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", fontSize: 12, color: "#fcd34d", display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="spinner" style={{ width: 12, height: 12 }} /> Processing…
                    </div>
                  )}
                </div>

                {schema && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Generated Extraction Schema</div>
                    <div style={{ background: "#020810", borderRadius: 10, padding: 14, fontFamily: "monospace", fontSize: 11, lineHeight: 1.8, border: "1px solid #0a1e38" }}>
                      {Object.entries(schema).map(([k, v]) => (
                        <div key={k}><span style={{ color: "#60a5fa" }}>{k}</span><span style={{ color: "#334155" }}>: </span><span style={{ color: "#6ee7b7" }}>&quot;{String(v)}&quot;</span></div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, padding: "9px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 8, fontSize: 12, color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.15)" }}>
                      ✓ Adapter committed to engine registry — source is now active
                    </div>
                  </div>
                )}
                {agentError && (
                  <div style={{ marginTop: 8, padding: "9px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, fontSize: 12, color: "#fca5a5", border: "1px solid rgba(239,68,68,0.15)" }}>✗ {agentError}</div>
                )}
              </div>
            )}
          </div>

          {/* Registered sources */}
          <div className="card fade-up-3" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Registered Sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sources.map(src => (
                <div key={src.id} style={{ padding: "14px 16px", borderRadius: 12, background: "#060e1c", border: "1px solid #0a1e38", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#1e3a5f")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#0a1e38")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{src.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[src.status] || "#334155", boxShadow: src.status === "active" ? "0 0 6px #10b981" : "none" }} />
                      <span className={`badge badge-${src.status}`}>{src.status}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#334155" }}>{src.engine}</span>
                    <span style={{ fontSize: 11, color: "#1e3a5f" }}>·</span>
                    <span style={{ fontSize: 11, color: "#334155" }}>{src.type}</span>
                    <span style={{ fontSize: 11, color: "#1e3a5f" }}>·</span>
                    <span style={{ fontSize: 11, color: "#334155" }}>{src.latency}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#3b82f6", letterSpacing: "-0.3px" }}>{src.postsIngested.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: "#1e3a5f", marginLeft: 4 }}>posts</span></span>
                    {src.lastSync && <span style={{ fontSize: 11, color: "#1e3a5f" }}>Last: {new Date(src.lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                  {src.url && <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 6, wordBreak: "break-all" }}>{src.url}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="card fade-up-4" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Agentic Onboarding Pipeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            {[
              { n: "01", title: "Fetch & Render",    desc: "HTTP fetch with rotating user-agents, robots.txt compliance" },
              { n: "02", title: "DOM Analysis",       desc: "Gemini 1.5 Flash reasons about HTML structure and identifies selectors" },
              { n: "03", title: "Schema Generation",  desc: "CSS selectors for post container, author, timestamp, body, pagination" },
              { n: "04", title: "Validation",         desc: "Schema validated against sample pages. Reflects if score < 70%" },
              { n: "05", title: "Registration",       desc: "Adapter committed to engine registry with full reasoning trace" },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.12)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(99,102,241,0.3)", marginBottom: 8, letterSpacing: "-1px" }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
