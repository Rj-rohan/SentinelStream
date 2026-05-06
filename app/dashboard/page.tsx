"use client";
import AppShell from "../components/AppShell";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface Project { id: string; name: string; status: string; signalCount: number; criticalCount: number; lastActivity: string; drugs: string[]; }
interface Signal  { id: string; drug: string; adr: string; severity: string; source: string; geography: string; timestamp: string; redactedText: string; meddraCode: string; status: string; confidence: number; }
interface Alert   { id: string; title: string; severity: string; prr: number; reportCount: number; geography: string; status: string; drug: string; adr: string; }
interface Source  { id: string; name: string; status: string; engine: string; postsIngested: number; lastSync: string | null; }

const SEV: Record<string, { color: string; bg: string; ring: string }> = {
  critical: { color: "#fca5a5", bg: "rgba(239,68,68,0.08)",  ring: "rgba(239,68,68,0.2)"  },
  high:     { color: "#fcd34d", bg: "rgba(245,158,11,0.08)", ring: "rgba(245,158,11,0.2)" },
  moderate: { color: "#93c5fd", bg: "rgba(59,130,246,0.08)", ring: "rgba(59,130,246,0.2)" },
  low:      { color: "#6ee7b7", bg: "rgba(16,185,129,0.08)", ring: "rgba(16,185,129,0.2)" },
};
const SRC_ICON: Record<string, string> = { reddit: "🟠", twitter: "𝕏", openfda: "🏥", quora: "🔵" };

function StatCard({ label, value, sub, color, glow, icon }: { label: string; value: string | number; sub?: string; color: string; glow: string; icon: React.ReactNode }) {
  return (
    <div className="stat-card fade-up" style={{ "--glow": glow } as React.CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}14`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px", lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function SeverityStrip({ signals }: { signals: Signal[] }) {
  const c = { critical: 0, high: 0, moderate: 0, low: 0 };
  signals.forEach(s => { if (s.severity in c) c[s.severity as keyof typeof c]++; });
  const total = signals.length || 1;
  const items = (["critical","high","moderate","low"] as const).filter(k => c[k] > 0);
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", gap: 1, marginBottom: 10 }}>
        {items.map(k => <div key={k} style={{ flex: c[k]/total, background: SEV[k].color, minWidth: 4 }} />)}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {items.map(k => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: SEV[k].color }} />
            <span style={{ fontSize: 11, color: "#475569" }}><span style={{ color: SEV[k].color, fontWeight: 700 }}>{c[k]}</span> {k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [signals,  setSignals]  = useState<Signal[]>([]);
  const [alerts,   setAlerts]   = useState<Alert[]>([]);
  const [sources,  setSources]  = useState<Source[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [ts, setTs] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [p,s,a,src] = await Promise.all([fetch("/api/projects"),fetch("/api/signals"),fetch("/api/alerts"),fetch("/api/sources")]);
      const [pd,sd,ad,srcd] = await Promise.all([p.json(),s.json(),a.json(),src.json()]);
      setProjects(pd.projects ?? []); setSignals(sd.signals ?? []);
      setAlerts(ad.alerts ?? []); setSources(srcd.sources ?? []);
      setTs(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const newSigs    = signals.filter(s => s.status === "new").length;
  const critSigs   = signals.filter(s => s.severity === "critical").length;
  const openAlerts = alerts.filter(a => a.status === "open").length;
  const activeSrc  = sources.filter(s => s.status === "active").length;

  if (loading) return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 340 }} />)}
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px", lineHeight: 1.1 }}>Pharmacovigilance Dashboard</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>India · Real-time social listening & FAERS signal detection</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="fade-up">
            {ts && <span style={{ fontSize: 11, color: "#1e3a5f" }}>Updated {ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
            <button onClick={load} className="btn btn-ghost btn-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard label="Active Projects" value={projects.filter(p=>p.status==="active").length} sub={`${projects.length} total`} color="#3b82f6" glow="rgba(59,130,246,0.12)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>} />
          <StatCard label="New Signals" value={newSigs} sub={`${signals.length} total ingested`} color="#8b5cf6" glow="rgba(139,92,246,0.12)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
          <StatCard label="Critical Signals" value={critSigs} sub="Require immediate review" color="#ef4444" glow="rgba(239,68,68,0.12)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
          <StatCard label="Open Alerts" value={openAlerts} sub={`${activeSrc} sources active`} color="#f59e0b" glow="rgba(245,158,11,0.12)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} />
        </div>

        {/* Empty / loading state */}
        {signals.length === 0 && (
          <div className="card fade-up-2" style={{ marginBottom: 24 }}>
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", marginBottom: 8, letterSpacing: "-0.3px" }}>Ingesting live data…</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 380, lineHeight: 1.7, marginBottom: 20 }}>
                The default project is fetching real signals from Reddit health communities and OpenFDA FAERS. This takes 15–30 seconds on first load.
              </p>
              <button onClick={load} className="btn btn-primary btn-sm">
                <span className="spinner" style={{ width: 13, height: 13 }} /> Check for signals
              </button>
            </div>
          </div>
        )}

        {signals.length > 0 && (
          <>
            {/* Severity strip */}
            <div className="card fade-up-2" style={{ padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>Signal Severity Distribution</span>
                <span style={{ fontSize: 12, color: "#1e3a5f", fontWeight: 600 }}>{signals.length} signals</span>
              </div>
              <SeverityStrip signals={signals} />
            </div>

            {/* Main grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Recent Signals */}
              <div className="card fade-up-2" style={{ overflow: "hidden" }}>
                <div className="section-header">
                  <span className="section-title">Recent Signals</span>
                  <Link href="/signals" className="section-link">View all →</Link>
                </div>
                <div style={{ padding: "6px 8px" }}>
                  {signals.slice(0, 6).map((sig, i) => (
                    <div key={sig.id} style={{ display: "flex", gap: 12, padding: "10px 10px", borderRadius: 10, transition: "background 0.12s", cursor: "default", animationDelay: `${i * 0.04}s` }}
                      className="fade-up"
                      onMouseEnter={e => (e.currentTarget.style.background = "#060e1c")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: SEV[sig.severity]?.bg || "#0a1628", border: `1px solid ${SEV[sig.severity]?.ring || "#0f2744"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                        {SRC_ICON[sig.source] || "📡"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sig.drug} <span style={{ color: "#334155", fontWeight: 400 }}>→</span> <span style={{ color: "#a78bfa" }}>{sig.adr}</span>
                          </span>
                          <span className={`badge badge-${sig.severity}`} style={{ flexShrink: 0 }}>{sig.severity}</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "#334155" }}>📍 {sig.geography}</span>
                          <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>MedDRA {sig.meddraCode}</span>
                          <span style={{ fontSize: 11, color: "#334155" }}>{(sig.confidence*100).toFixed(0)}% conf</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Alerts */}
                <div className="card fade-up-3" style={{ overflow: "hidden" }}>
                  <div className="section-header">
                    <span className="section-title">Active Alerts</span>
                    <Link href="/alerts" className="section-link">View all →</Link>
                  </div>
                  <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {alerts.length === 0 ? (
                      <div style={{ padding: "16px 8px", textAlign: "center", color: "#1e3a5f", fontSize: 13 }}>No alerts generated yet</div>
                    ) : alerts.slice(0, 3).map(alert => (
                      <div key={alert.id} style={{ padding: "11px 13px", borderRadius: 10, background: alert.severity === "critical" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)", border: `1px solid ${alert.severity === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.4 }}>{alert.title}</span>
                          <span className={`badge badge-${alert.status}`} style={{ flexShrink: 0 }}>{alert.status}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <span style={{ fontSize: 11, color: alert.severity === "critical" ? "#fca5a5" : "#fcd34d", fontWeight: 800 }}>PRR {alert.prr}</span>
                          <span style={{ fontSize: 11, color: "#334155" }}>{alert.reportCount} reports</span>
                          <span style={{ fontSize: 11, color: "#334155" }}>📍 {alert.geography}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="card fade-up-4" style={{ overflow: "hidden" }}>
                  <div className="section-header">
                    <span className="section-title">Projects</span>
                    <Link href="/projects" className="section-link">Manage →</Link>
                  </div>
                  <div style={{ padding: "6px 8px" }}>
                    {projects.map(proj => (
                      <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 10, transition: "background 0.12s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#060e1c")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: proj.status === "active" ? "#10b981" : "#f59e0b", flexShrink: 0, boxShadow: proj.status === "active" ? "0 0 6px #10b981" : "0 0 6px #f59e0b" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</div>
                          <div style={{ fontSize: 11, color: "#334155" }}>{proj.signalCount} signals · {proj.criticalCount} critical</div>
                        </div>
                        <span className={`badge badge-${proj.status}`}>{proj.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sources */}
        <div className="card fade-up-4" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14 }}>Data Source Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            {sources.map(src => (
              <div key={src.id} style={{ padding: "14px 16px", borderRadius: 12, background: "#060e1c", border: "1px solid #0a1e38", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#1e3a5f")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#0a1e38")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{src.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: src.status === "active" ? "#10b981" : src.status === "analyzing" ? "#f59e0b" : "#1e3a5f", boxShadow: src.status === "active" ? "0 0 6px #10b981" : "none" }} />
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#1e3a5f", marginBottom: 8, fontWeight: 500 }}>{src.engine}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#3b82f6", letterSpacing: "-0.5px", lineHeight: 1 }}>{src.postsIngested.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 2 }}>posts ingested</div>
                {src.lastSync && <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 4 }}>Last: {new Date(src.lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
