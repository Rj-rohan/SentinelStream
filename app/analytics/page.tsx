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
  openAlerts: number;
  fdaStats: Record<string, { totalReports: number; topReactions: Array<{ term: string; count: number }> }>;
}

const DRUG_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/analytics");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="grid-4">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}</div>
        <div className="grid-2">{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />)}</div>
      </div>
    </AppShell>
  );

  if (!data) return null;
  const { topADRs, sourceBreakdown, geographyData, severityCounts, totalSignals, fdaStats, signalTrend } = data;
  const maxGeo = Math.max(...geographyData.map(g => g.count), 1);
  const allDrugs = Array.from(new Set(signalTrend.flatMap(d => Object.keys(d).filter(k => k !== "date" && k !== "total"))));
  const maxTrend = Math.max(...signalTrend.map(d => (d.total as number) || 0), 1);

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: "0 auto" }} className="animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>Analytics</h1>
            <p style={{ fontSize: 13, color: "var(--muted2)", marginTop: 2 }}>PRR disproportionality · Signal trends · OpenFDA FAERS statistics</p>
          </div>
          <button onClick={fetchData} className="btn btn-ghost btn-sm">↻ Refresh</button>
        </div>

        {totalSignals === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ color: "var(--muted2)", fontSize: 14 }}>No signal data yet. Ingest data from a project to see analytics.</p>
          </div>
        ) : (
          <>
            {/* Severity stats */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
              {[
                { label: "Total Signals", value: totalSignals, color: "#8b5cf6" },
                { label: "Critical", value: severityCounts.critical, color: "#ef4444" },
                { label: "High", value: severityCounts.high, color: "#f59e0b" },
                { label: "Moderate + Low", value: severityCounts.moderate + severityCounts.low, color: "#3b82f6" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* Trend Chart */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Signal Volume — Last 7 Days</div>
                {allDrugs.length > 0 && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                    {allDrugs.slice(0, 5).map((drug, i) => (
                      <div key={drug} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: DRUG_COLORS[i % DRUG_COLORS.length] }} />
                        <span style={{ fontSize: 11, color: "var(--muted2)" }}>{drug}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, paddingBottom: 20, position: "relative" }}>
                  {/* Y-axis guide lines */}
                  {[0.25, 0.5, 0.75, 1].map(pct => (
                    <div key={pct} style={{ position: "absolute", left: 0, right: 0, bottom: `${pct * 110 + 20}px`, borderTop: "1px dashed var(--border)", pointerEvents: "none" }} />
                  ))}
                  {signalTrend.map((d) => (
                    <div key={d.date as string} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 110 }}>
                        {allDrugs.slice(0, 5).map((drug, i) => {
                          const val = (d[drug] as number) || 0;
                          return <div key={drug} style={{ width: 9, height: `${Math.max((val / maxTrend) * 110, val > 0 ? 3 : 0)}px`, background: DRUG_COLORS[i % DRUG_COLORS.length], borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />;
                        })}
                      </div>
                      <span style={{ fontSize: 9, color: "var(--muted)", position: "absolute", bottom: 0 }}>{(d.date as string).split(" ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Breakdown */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Source Distribution</div>
                {sourceBreakdown.length === 0 ? (
                  <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: 20 }}>No data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {sourceBreakdown.map((s, i) => (
                      <div key={s.source}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, textTransform: "capitalize" }}>{s.source}</span>
                          <span style={{ fontSize: 13, color: "var(--muted2)" }}>{s.count} <span style={{ color: DRUG_COLORS[i % DRUG_COLORS.length], fontWeight: 700 }}>({s.pct}%)</span></span>
                        </div>
                        <div style={{ background: "var(--card2)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 6, background: DRUG_COLORS[i % DRUG_COLORS.length], transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* Top ADRs with PRR */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Top ADRs — PRR Disproportionality</div>
                <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 14 }}>PRR ≥ 2.0 = WHO-UMC signal threshold</div>
                {topADRs.length === 0 ? (
                  <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: 20 }}>No ADR data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topADRs.map((adr) => (
                      <div key={`${adr.term}-${adr.drug}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--card2)", border: "1px solid var(--border)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adr.term}</div>
                          <div style={{ fontSize: 11, color: "var(--muted2)" }}>{adr.drug} · {adr.count} reports</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: adr.prr >= 5 ? "#f87171" : adr.prr >= 3 ? "#fbbf24" : "#34d399" }}>
                            {adr.prr}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>PRR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geography */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Geographic Distribution — India</div>
                {geographyData.length === 0 ? (
                  <div style={{ color: "var(--muted2)", fontSize: 13, textAlign: "center", padding: 20 }}>No geography data yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {geographyData.map(({ city, count }) => (
                      <div key={city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--muted2)", width: 110, flexShrink: 0, textAlign: "right" }}>{city}</span>
                        <div style={{ flex: 1, background: "var(--card2)", borderRadius: 4, height: 20, overflow: "hidden" }}>
                          <div style={{ width: `${(count / maxGeo) * 100}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #6366f1)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 7, minWidth: count > 0 ? 24 : 0, transition: "width 0.5s ease" }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{count}</span>
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
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>OpenFDA FAERS — Historical Adverse Event Reports</div>
                <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16 }}>Real FDA data from the Adverse Event Reporting System (FAERS)</div>
                <div className="grid-2">
                  {Object.entries(fdaStats).map(([drug, stats]) => (
                    <div key={drug} style={{ padding: 16, background: "var(--card2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{drug}</span>
                        <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700 }}>{stats.totalReports.toLocaleString()} reports</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {stats.topReactions.slice(0, 6).map((r) => (
                          <div key={r.term} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text2)" }}>{r.term}</span>
                            <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>{r.count.toLocaleString()}</span>
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
