"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface Alert { id: string; type: string; severity: string; title: string; description: string; drug: string; adr: string; prr: number; reportCount: number; timestamp: string; status: string; geography: string; }

const SEV_STYLE: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  critical: { color: "#fca5a5", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.15)", bar: "linear-gradient(90deg,#ef4444,#f87171)" },
  high:     { color: "#fcd34d", bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.15)", bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  moderate: { color: "#93c5fd", bg: "rgba(59,130,246,0.05)", border: "rgba(59,130,246,0.15)", bar: "linear-gradient(90deg,#3b82f6,#60a5fa)" },
};

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/alerts");
    const d = await r.json();
    setAlerts(d.alerts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const open = alerts.filter(a => a.status === "open").length;
  const ack  = alerts.filter(a => a.status === "acknowledged").length;
  const res  = alerts.filter(a => a.status === "resolved").length;

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>Alerts</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>Auto-generated from PRR disproportionality — fires when ≥2 signals share the same drug+ADR pair</p>
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm fade-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Open",         count: open, color: "#ef4444", glow: "rgba(239,68,68,0.15)" },
            { label: "Acknowledged", count: ack,  color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
            { label: "Resolved",     count: res,  color: "#10b981", glow: "rgba(16,185,129,0.15)" },
          ].map(({ label, count, color, glow }) => (
            <div key={label} className="stat-card fade-up" style={{ "--glow": glow } as React.CSSProperties}>
              <div style={{ fontSize: 36, fontWeight: 900, color, letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>No alerts yet</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 360, lineHeight: 1.7 }}>Alerts are auto-generated when multiple signals share the same drug+ADR combination with PRR above 2.0.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {alerts.map((alert, i) => {
              const sty = SEV_STYLE[alert.severity] || SEV_STYLE.moderate;
              return (
                <div key={alert.id} className="card fade-up" style={{ overflow: "hidden", animationDelay: `${i * 0.04}s` }}>
                  {/* Top bar */}
                  <div style={{ height: 3, background: sty.bar }} />

                  <div style={{ padding: "18px 20px" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: sty.bg, border: `1px solid ${sty.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                          {alert.severity === "critical" ? "🔴" : alert.severity === "high" ? "🟡" : "🔵"}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 3, letterSpacing: "-0.3px", lineHeight: 1.3 }}>{alert.title}</h3>
                          <span style={{ fontSize: 11, color: "#1e3a5f" }}>{new Date(alert.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <span className={`badge badge-${alert.status}`} style={{ flexShrink: 0 }}>{alert.status}</span>
                    </div>

                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>{alert.description}</p>

                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8, marginBottom: 16 }}>
                      {[["Drug",alert.drug],["ADR",alert.adr],["PRR Score",String(alert.prr)],["Reports",String(alert.reportCount)],["Geography",alert.geography],["Type",alert.type]].map(([k,v]) => (
                        <div key={k} style={{ padding: "9px 11px", borderRadius: 10, background: "#060e1c", border: "1px solid #0a1e38" }}>
                          <div style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: k === "PRR Score" ? sty.color : "#e2e8f0", letterSpacing: "-0.2px" }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* PRR bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>PRR Score <span style={{ color: "#334155" }}>(WHO-UMC threshold: 2.0)</span></span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: sty.color }}>{alert.prr}</span>
                      </div>
                      <div className="progress-track" style={{ height: 8 }}>
                        <div className="progress-fill" style={{ width: `${Math.min((alert.prr/15)*100,100)}%`, background: sty.bar }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {alert.status === "open" && <button onClick={() => updateStatus(alert.id,"acknowledged")} className="btn btn-warning btn-sm">Acknowledge</button>}
                      {alert.status !== "resolved" && <button onClick={() => updateStatus(alert.id,"resolved")} className="btn btn-success btn-sm">Mark Resolved</button>}
                      <button className="btn btn-danger btn-sm">Escalate to CDSCO</button>
                      <button className="btn btn-ghost btn-sm">Export Report</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
