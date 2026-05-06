"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface PiiEvent { id: string; timestamp: string; source: string; piiTypes: string[]; action: string; hash: string; projectId: string; }

const PII_COLOR: Record<string, string> = {
  email: "#60a5fa", phone_number: "#f87171", aadhaar_pattern: "#a78bfa",
  pan_number: "#fbbf24", name_pattern: "#fbbf24", mrn: "#f87171",
  hospital_id: "#fbbf24", url_with_profile: "#94a3b8",
};

export default function PIIAuditPage() {
  const [events, setEvents] = useState<PiiEvent[]>([]);
  const [totalRedactions, setTotalRedactions] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/pii");
    const data = await res.json();
    setEvents(data.events ?? []);
    setTotalRedactions(data.totalRedactions ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>PII Audit Log</h1>
            <p style={{ fontSize: 13, color: "var(--muted2)", marginTop: 2 }}>DPDP Act compliance — all PII/PHI detected and redacted before storage. Original content never persisted.</p>
          </div>
          <button onClick={fetchData} className="btn btn-ghost btn-sm">↻ Refresh</button>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Redactions", value: totalRedactions, color: "#ef4444" },
            { label: "Events Logged", value: events.length, color: "#3b82f6" },
            { label: "Originals Stored", value: 0, color: "#10b981" },
            { label: "Compliance", value: "✓ DPDP", color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Detection Pipeline</div>
          <div className="grid-4">
            {[
              { icon: "🔍", title: "Regex Engine", desc: "Email, phone, URL patterns on every ingested post" },
              { icon: "🇮🇳", title: "Indian IDs", desc: "Aadhaar (12-digit), PAN (AAAAA0000A), +91 mobile" },
              { icon: "🏥", title: "Healthcare IDs", desc: "MRN, UHID, OPD/IPD IDs from Indian hospital systems" },
              { icon: "🔐", title: "SHA-256 Hash", desc: "Cryptographic hash for dedup — original never stored" },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Redaction Events</span>
            <span style={{ fontSize: 12, color: "var(--muted2)" }}>{events.length} events</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}><span className="spinner" /></div>
          ) : events.length === 0 ? (
            <div style={{ padding: "40px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
              <p style={{ color: "var(--muted2)", fontSize: 13 }}>No PII events yet. PII is detected and logged automatically during ingestion.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--card2)" }}>
                    {["Timestamp", "Source", "PII Types Detected", "Action", "Dedup Hash", "Project"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "var(--muted2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--card2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>{new Date(log.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{log.source}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {log.piiTypes.map((t) => (
                            <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${PII_COLOR[t] || "#64748b"}18`, color: PII_COLOR[t] || "#94a3b8", fontWeight: 700, border: `1px solid ${PII_COLOR[t] || "#64748b"}30` }}>
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.12)", color: "#34d399", fontWeight: 700 }}>REDACTED</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>{log.hash}</td>
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#60a5fa" }}>{log.projectId}</td>
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
