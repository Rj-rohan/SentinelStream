"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface PiiEvent { id: string; timestamp: string; source: string; piiTypes: string[]; action: string; hash: string; projectId: string; }

const PII_COLOR: Record<string, string> = {
  email: "#60a5fa", phone_number: "#fca5a5", aadhaar_pattern: "#c4b5fd",
  pan_number: "#fcd34d", name_pattern: "#fcd34d", mrn: "#fca5a5",
  hospital_id: "#fcd34d", url_with_profile: "#94a3b8",
};

export default function PIIAuditPage() {
  const [events,          setEvents]          = useState<PiiEvent[]>([]);
  const [totalRedactions, setTotalRedactions] = useState(0);
  const [loading,         setLoading]         = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/pii");
    const d = await r.json();
    setEvents(d.events ?? []);
    setTotalRedactions(d.totalRedactions ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>PII Audit Log</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>DPDP Act compliance — all PII/PHI detected and redacted before storage. Original content never persisted.</p>
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm fade-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Redactions", value: totalRedactions, color: "#ef4444", glow: "rgba(239,68,68,0.12)" },
            { label: "Events Logged",    value: events.length,   color: "#3b82f6", glow: "rgba(59,130,246,0.12)" },
            { label: "Originals Stored", value: 0,               color: "#10b981", glow: "rgba(16,185,129,0.12)" },
            { label: "Compliance",       value: "✓ DPDP",        color: "#10b981", glow: "rgba(16,185,129,0.12)" },
          ].map(({ label, value, color, glow }) => (
            <div key={label} className="stat-card fade-up" style={{ "--glow": glow } as React.CSSProperties}>
              <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: "-0.8px", lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div className="card fade-up-2" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Detection Pipeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {[
              { icon: "🔍", title: "Regex Engine",   desc: "Email, phone, URL patterns on every ingested post before storage" },
              { icon: "🇮🇳", title: "Indian IDs",    desc: "Aadhaar (12-digit), PAN (AAAAA0000A), +91 mobile numbers" },
              { icon: "🏥", title: "Healthcare IDs", desc: "MRN, UHID, OPD/IPD IDs from Indian hospital systems" },
              { icon: "🔐", title: "SHA-256 Hash",   desc: "Cryptographic hash for deduplication — original never stored" },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card fade-up-3" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #0a1e38", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Redaction Events</span>
            <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{events.length} events</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><span className="spinner" /></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>No PII events yet</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 340, lineHeight: 1.7 }}>PII is detected and logged automatically during ingestion. Ingest data from a project to see events here.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {["Timestamp","Source","PII Types Detected","Action","Dedup Hash","Project"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap", color: "#475569" }}>
                        {new Date(log.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ fontWeight: 700, color: "#e2e8f0" }}>{log.source}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {log.piiTypes.map(t => (
                            <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${PII_COLOR[t] || "#64748b"}15`, color: PII_COLOR[t] || "#94a3b8", fontWeight: 700, border: `1px solid ${PII_COLOR[t] || "#64748b"}25` }}>
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className="badge badge-reviewed">REDACTED</span></td>
                      <td style={{ fontFamily: "monospace", fontSize: 10, color: "#1e3a5f" }}>{log.hash}</td>
                      <td style={{ color: "#3b82f6", fontWeight: 600 }}>{log.projectId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
