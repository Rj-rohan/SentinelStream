import { NextResponse } from "next/server";
import { signalStore, alertStore, projectStore } from "../../lib/store";
import { getDrugEventStats } from "../../lib/openfda";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const relevantSignals = projectId
    ? signalStore.filter((s) => s.projectId === projectId)
    : signalStore;

  // Signal trend — last 7 days
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  });

  const signalTrend = days.map((date) => {
    const dayStart = new Date(date + " " + new Date().getFullYear()).getTime();
    const dayEnd = dayStart + 86400000;
    const daySigs = relevantSignals.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= dayStart && t < dayEnd;
    });

    // Group by drug
    const byDrug: Record<string, number> = {};
    for (const sig of daySigs) {
      byDrug[sig.drug] = (byDrug[sig.drug] ?? 0) + 1;
    }
    return { date, ...byDrug, total: daySigs.length };
  });

  // Top ADRs with PRR calculation
  const adrCounts: Record<string, { count: number; drug: string }> = {};
  for (const sig of relevantSignals) {
    const key = `${sig.adr}||${sig.drug}`;
    if (!adrCounts[key]) adrCounts[key] = { count: 0, drug: sig.drug };
    adrCounts[key].count++;
  }

  const totalSignals = relevantSignals.length || 1;
  const topADRs = Object.entries(adrCounts)
    .map(([key, val]) => {
      const [term] = key.split("||");
      // Simplified PRR: observed proportion / expected proportion (baseline 0.01)
      const observedProportion = val.count / totalSignals;
      const prr = parseFloat((observedProportion / 0.01).toFixed(1));
      return { term, count: val.count, drug: val.drug, prr: Math.min(prr, 15) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const sig of relevantSignals) {
    sourceCounts[sig.source] = (sourceCounts[sig.source] ?? 0) + 1;
  }
  const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
    pct: Math.round((count / totalSignals) * 100),
  }));

  // Geography
  const geoCounts: Record<string, number> = {};
  for (const sig of relevantSignals) {
    const city = sig.geography.split(",")[0].trim();
    geoCounts[city] = (geoCounts[city] ?? 0) + 1;
  }
  const geographyData = Object.entries(geoCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Severity breakdown
  const severityCounts = {
    critical: relevantSignals.filter((s) => s.severity === "critical").length,
    high: relevantSignals.filter((s) => s.severity === "high").length,
    moderate: relevantSignals.filter((s) => s.severity === "moderate").length,
    low: relevantSignals.filter((s) => s.severity === "low").length,
  };

  // OpenFDA stats for top drugs in project
  let fdaStats: Record<string, { totalReports: number; topReactions: Array<{ term: string; count: number }> }> = {};
  if (projectId) {
    const project = projectStore.find((p) => p.id === projectId);
    if (project) {
      for (const drug of project.drugs.slice(0, 2)) {
        fdaStats[drug] = await getDrugEventStats(drug);
      }
    }
  }

  return NextResponse.json({
    signalTrend,
    topADRs,
    sourceBreakdown,
    geographyData,
    severityCounts,
    totalSignals,
    openAlerts: alertStore.filter((a) => a.status === "open").length,
    fdaStats,
  });
}
