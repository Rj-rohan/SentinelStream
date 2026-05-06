"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";

interface AnalyticsData {
  signalTrend: Array<Record<string, string | number>>;
  topADRs: Array<{ term: string; count: number; drug: string; prr: number }>;
  sourceBreakdown: Array<{ source: string; count: number; pct: number }>;
  geographyData: Array<{ city: string; count: number }>;
  severityCounts: { critical: number; high: number; moderate: number; low: number };
  totalSignals: number;
  fdaStats: Record<string, { totalReports: number; topReactions: Array<{ term: string; count: number }> }>;
}

const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"];

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/analytics");
    setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 260 }} />)}
        </div>
      </div>
    </AppShell>
  );

  if (!data) return null;
  const { topADRs, sourceBreakdown, geographyData, severityCounts, totalSignals, fdaStats, signalTrend } = data;
  const maxGeo   = Math.max(...geographyData.map(g => g.count), 1);
  const allDrugs = Array.from(new Set(signalTrend.flatMap(d => Object.keys(d).filter(k => k !== "date" && k !== "total"))));
  const maxTrend = Math.max(...signalTrend.map(d => (d.total as number) || 0), 1);

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>Analytics</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>PRR disproportionality · Signal trends · OpenFDA FAERS statistics</p>
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm fade-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>

        {totalSignals === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>No analytics data yet</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 340, lineHeight: 1.7 }}>Ingest data from a project to see signal trends, PRR scores, and geographic distribution.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Severity stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Total Signals",   value: totalSignals,                                    color: "#8b5cf6", glow: "rgba(139,92,246,0.12)" },
                { label: "Critical",        value: severityCounts.critical,                         color: "#ef4444", glow: "rgba(239,68,68,0.12)"  },
                { label: "High",            value: severityCounts.high,                             color: "#f59e0b", glow: "rgba(245,158,11,0.12)" },
                { label: "Moderate + Low",  value: severityCounts.moderate + severityCounts.low,    color: "#3b82f6", glow: "rgba(59,130,246,0.12)" },
              ].map(({ label, value, color, glow }) => (
                <div key={label} className="stat-card fade-up" style={{ "--glow": glow } as React.CSSProperties}>
                  <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: "-1px", lineHeight: 1, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Trend chart */}
              <div className="card fade-up-2" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Signal Volume — Last 7 Days</div>
                {allDrugs.length > 0 && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                    {allDrugs.slice(0, 5).map((drug, i) => (
                      <div key={drug} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: 11, color: "#475569" }}>{drug}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, paddingBottom: 20, position: "relative" }}>
                  {[0.25,0.5,0.75,1].map(p => (
                    <div key={p} style={{ position: "absolute", left: 0, right: 0, bottom: `${p*110+20}px`, borderTop: "1px dashed #0a1e38", pointerEvents: "none" }} />
                  ))}
                  {signalTrend.map(d => (
                    <div key={d.date as string} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 110 }}>
                        {allDrugs.slice(0, 5).map((drug, i) => {
                          const val = (d[drug] as number) || 0;
                          return <div key={drug} style={{ width: 9, height: `${Math.max((val/maxTrend)*110, val>0?3:0)}px`, background: COLORS[i%COLORS.length], borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />;
                        })}
                      </div>
                      <span style={{ fontSize: 9, color: "#1e3a5f", position: "absolute", bottom: 0 }}>{(d.date as string).split(" ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source breakdown */}
              <div className="card fade-up-2" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Source Distribution</div>
                {sourceBreakdown.length === 0 ? (
                  <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: 20 }}>No data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {sourceBreakdown.map((s, i) => (
                      <div key={s.source}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, textTransform: "capitalize" }}>{s.source}</span>
                          <span style={{ fontSize: 13, color: "#475569" }}>{s.count} <span style={{ color: COLORS[i%COLORS.length], fontWeight: 800 }}>({s.pct}%)</span></span>
                        </div>
                        <div className="progress-track" style={{ height: 8 }}>
                          <div className="progress-fill" style={{ width: `${s.pct}%`, background: COLORS[i%COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Top ADRs */}
              <div className="card fade-up-3" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Top ADRs — PRR Disproportionality</div>
                <div style={{ fontSize: 11, color: "#1e3a5f", marginBottom: 14, fontWeight: 600 }}>PRR ≥ 2.0 = WHO-UMC signal threshold</div>
                {topADRs.length === 0 ? (
                  <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: 20 }}>No ADR data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topADRs.map(adr => (
                      <div key={`${adr.term}-${adr.drug}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#060e1c", border: "1px solid #0a1e38" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adr.term}</div>
                          <div style={{ fontSize: 11, color: "#334155" }}>{adr.drug} · {adr.count} reports</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: adr.prr >= 5 ? "#fca5a5" : adr.prr >= 3 ? "#fcd34d" : "#6ee7b7", letterSpacing: "-0.5px" }}>{adr.prr}</div>
                          <div style={{ fontSize: 9, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>PRR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geography */}
              <div className="card fade-up-3" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Geographic Distribution — India</div>
                {geographyData.length === 0 ? (
                  <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: 20 }}>No geography data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {geographyData.map(({ city, count }) => (
                      <div key={city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#475569", width: 110, flexShrink: 0, textAlign: "right" }}>{city}</span>
                        <div className="progress-track" style={{ flex: 1, height: 20 }}>
                          <div className="progress-fill" style={{ width: `${(count/maxGeo)*100}%`, background: "linear-gradient(90deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", paddingLeft: 7, minWidth: count > 0 ? 24 : 0 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 800 }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* OpenFDA FAERS */}
            {Object.keys(fdaStats).length > 0 && (
              <div className="card fade-up-4" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>OpenFDA FAERS — Historical Adverse Event Reports</div>
                <div style={{ fontSize: 11, color: "#1e3a5f", marginBottom: 16, fontWeight: 600 }}>Real FDA data from the Adverse Event Reporting System</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
                  {Object.entries(fdaStats).map(([drug, stats]) => (
                    <div key={drug} style={{ padding: 16, background: "#060e1c", borderRadius: 12, border: "1px solid #0a1e38" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>{drug}</span>
                        <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 800 }}>{stats.totalReports.toLocaleString()} reports</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {stats.topReactions.slice(0, 6).map(r => (
                          <div key={r.term} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>{r.term}</span>
                            <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>{r.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
