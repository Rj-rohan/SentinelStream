"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Signal { id: string; projectId: string; drug: string; adr: string; meddraCode: string; meddraterm: string; severity: string; confidence: number; sentiment: string; source: string; sourceUrl: string; geography: string; timestamp: string; redactedText: string; piiDetected: boolean; piiTypes: string[]; status: string; upvotes?: number; subreddit?: string; }

const SEV: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#fca5a5", bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.15)"  },
  high:     { color: "#fcd34d", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.15)" },
  moderate: { color: "#93c5fd", bg: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.15)" },
  low:      { color: "#6ee7b7", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.15)" },
};
const SRC: Record<string, { icon: string; label: string; color: string }> = {
  reddit:  { icon: "🟠", label: "Reddit",        color: "#ff6314" },
  twitter: { icon: "𝕏",  label: "Twitter/X",     color: "#1d9bf0" },
  openfda: { icon: "🏥", label: "OpenFDA FAERS", color: "#10b981" },
  quora:   { icon: "🔵", label: "Quora",          color: "#a82400" },
};

function SignalFeedInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [signals,     setSignals]     = useState<Signal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [sevFilter,   setSevFilter]   = useState("all");
  const [srcFilter,   setSrcFilter]   = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [selected,    setSelected]    = useState<Signal | null>(null);

  const fetchSignals = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const p = new URLSearchParams();
    if (projectId) p.set("projectId", projectId);
    const res  = await fetch(`/api/signals?${p}`);
    const data = await res.json();
    setSignals(data.signals ?? []);
    setLoading(false); setRefreshing(false);
  }, [projectId]);

  // Trigger background ingest then poll for new signals
  const triggerIngest = useCallback(async () => {
    setRefreshing(true);
    if (projectId) {
      await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      // Poll every 4s for up to 60s
      let polls = 0;
      const poll = setInterval(async () => {
        polls++;
        await fetchSignals();
        const st = await fetch(`/api/ingest?projectId=${projectId}`);
        const sd = await st.json();
        if (!sd.running || polls >= 15) {
          clearInterval(poll);
          setRefreshing(false);
        }
      }, 4000);
    } else {
      await fetchSignals();
      setRefreshing(false);
    }
  }, [projectId, fetchSignals]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/signals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (selected?.id === id) setSelected(s => s ? { ...s, status } : null);
  }

  const filtered = signals.filter(s => {
    if (sevFilter    !== "all" && s.severity !== sevFilter)    return false;
    if (srcFilter    !== "all" && s.source   !== srcFilter)    return false;
    if (statusFilter !== "all" && s.status   !== statusFilter) return false;
    return true;
  });

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>Signal Feed</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>NLP-extracted adverse events · MedDRA mapped · PII redacted</p>
          </div>
          <button onClick={triggerIngest} disabled={refreshing} className="btn btn-primary btn-sm fade-up">
            {refreshing ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Fetching…</> : <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Fetch New Signals
            </>}
          </button>
        </div>

        {/* Filter bar */}
        <div className="card fade-up-2" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Filter</span>
          <div style={{ width: 1, height: 16, background: "#0a1e38" }} />
          {[
            { label: "Severity", value: sevFilter,    set: setSevFilter,    opts: ["all","critical","high","moderate","low"] },
            { label: "Source",   value: srcFilter,    set: setSrcFilter,    opts: ["all","reddit","twitter","openfda"] },
            { label: "Status",   value: statusFilter, set: setStatusFilter, opts: ["all","new","escalated","reviewed","dismissed"] },
          ].map(({ label, value, set, opts }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#334155" }}>{label}</span>
              <select value={value} onChange={e => set(e.target.value)} style={{ padding: "5px 10px", fontSize: 12, borderRadius: 8, cursor: "pointer", background: "#060e1c", border: "1px solid #0a1e38", color: "#94a3b8" }}>
                {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${label}s` : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#1e3a5f", fontWeight: 700 }}>{filtered.length}</span>
            <span style={{ fontSize: 12, color: "#334155" }}>signals</span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>No signals found</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 340, lineHeight: 1.7 }}>Go to Projects and click &quot;Ingest Now&quot; to fetch real data from Reddit and OpenFDA.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16, alignItems: "start" }}>

            {/* Signal list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((sig, i) => {
                const sev = SEV[sig.severity] || SEV.low;
                const src = SRC[sig.source] || { icon: "📡", label: sig.source, color: "#64748b" };
                const isSelected = selected?.id === sig.id;
                return (
                  <div key={sig.id} onClick={() => setSelected(isSelected ? null : sig)}
                    className={`card-interactive${isSelected ? " selected" : ""} fade-up`}
                    style={{ padding: "16px 18px", animationDelay: `${Math.min(i * 0.03, 0.2)}s` }}>

                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        {/* Source badge */}
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: sev.bg, border: `1px solid ${sev.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17 }}>
                          {src.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.2px" }}>{sig.drug}</span>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>{sig.adr}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#1e3a5f", marginTop: 2 }}>
                            <span style={{ color: src.color, fontWeight: 600 }}>{src.label}</span>
                            {sig.subreddit && <span style={{ color: "#1e3a5f" }}> · r/{sig.subreddit}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <span className={`badge badge-${sig.severity}`}>{sig.severity}</span>
                        <span className={`badge badge-${sig.status}`}>{sig.status}</span>
                      </div>
                    </div>

                    {/* Text */}
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 12, paddingLeft: 46 }}>
                      {sig.redactedText.slice(0, 200)}{sig.redactedText.length > 200 ? "…" : ""}
                    </p>

                    {/* Meta row */}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingLeft: 46 }}>
                      <span style={{ fontSize: 11, color: "#334155" }}>📍 {sig.geography}</span>
                      <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>MedDRA {sig.meddraCode}</span>
                      <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{(sig.confidence*100).toFixed(0)}% conf</span>
                      {sig.upvotes !== undefined && <span style={{ fontSize: 11, color: "#334155" }}>▲ {sig.upvotes}</span>}
                      <span style={{ fontSize: 11, color: "#1e3a5f", marginLeft: "auto" }}>
                        {new Date(sig.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="card fade-up" style={{ overflow: "hidden", position: "sticky", top: 80 }}>
                {/* Severity bar */}
                <div style={{ height: 3, background: SEV[selected.severity]?.color || "#3b82f6" }} />

                <div className="section-header">
                  <span className="section-title">Signal Detail</span>
                  <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon btn-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div style={{ padding: "14px 18px" }}>
                  {/* Key-value rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
                    {[
                      ["Drug",         selected.drug],
                      ["ADR",          selected.adr],
                      ["MedDRA Term",  selected.meddraterm],
                      ["MedDRA Code",  selected.meddraCode],
                      ["Severity",     selected.severity],
                      ["Confidence",   `${(selected.confidence*100).toFixed(1)}%`],
                      ["Sentiment",    selected.sentiment],
                      ["Source",       SRC[selected.source]?.label || selected.source],
                      ["Geography",    selected.geography],
                      ["PII Detected", selected.piiDetected ? `Yes — ${selected.piiTypes.join(", ")}` : "None"],
                      ["Status",       selected.status],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #060e1c" }}>
                        <span style={{ fontSize: 11, color: "#334155", fontWeight: 600, flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8", textAlign: "right", fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Post text */}
                  <div style={{ background: "#060e1c", borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: "1px solid #0a1e38" }}>
                    <div style={{ fontSize: 10, color: "#1e3a5f", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Post Text (PII Redacted)</div>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{selected.redactedText}</p>
                  </div>

                  {selected.sourceUrl && (
                    <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ width: "100%", textDecoration: "none", marginBottom: 10, justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View Original Post
                    </a>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => updateStatus(selected.id, "escalated")} className="btn btn-danger btn-sm">Escalate</button>
                    <button onClick={() => updateStatus(selected.id, "reviewed")} className="btn btn-success btn-sm">Reviewed</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SignalsPage() {
  return (
    <Suspense fallback={<AppShell><div style={{ color: "#334155", padding: 40, textAlign: "center" }}>Loading…</div></AppShell>}>
      <SignalFeedInner />
    </Suspense>
  );
}
