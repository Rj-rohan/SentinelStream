// OpenFDA Drug Adverse Event API — real FAERS data, completely free, no key required.
// Docs: https://open.fda.gov/apis/drug/event/

import { db_projects, db_signals, db_sources, checkAndGenerateAlert } from "./db";
import type { Signal } from "./db";

const BASE = "https://api.fda.gov/drug/event.json";

interface FDAEvent {
  safetyreportid: string;
  receivedate: string;
  patient?: {
    reaction?: Array<{ reactionmeddrapt: string; reactionoutcome?: string }>;
    drug?: Array<{
      medicinalproduct?: string;
      drugindication?: string;
      drugcharacterization?: string;
    }>;
    patientagegroup?: string;
    patientsex?: string;
  };
  primarysource?: { reportercountry?: string; qualification?: string };
  seriousnessdeath?: string;
  seriousnesshospitalization?: string;
  seriousnesslifethreatening?: string;
  narrativeincludeclinical?: string;
}

function mapOutcomeToSeverity(event: FDAEvent): "critical" | "high" | "moderate" | "low" {
  if (event.seriousnessdeath === "1") return "critical";
  if (event.seriousnesslifethreatening === "1") return "critical";
  if (event.seriousnesshospitalization === "1") return "high";
  const reactions = event.patient?.reaction ?? [];
  for (const r of reactions) {
    const outcome = r.reactionoutcome;
    if (outcome === "5") return "critical"; // fatal
    if (outcome === "1") return "high"; // recovered
  }
  return "moderate";
}

export async function ingestOpenFDAForDrug(
  drugName: string,
  projectId: string,
  limit = 20
): Promise<number> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY;
    const keyParam = apiKey ? `&api_key=${apiKey}` : "";
    const url = `${BASE}?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&limit=${limit}&sort=receivedate:desc${keyParam}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return 0;

    const data = await res.json();
    const events: FDAEvent[] = data?.results ?? [];
    let ingested = 0;

    for (const event of events) {
      const reactions = event.patient?.reaction ?? [];
      const drugs = event.patient?.drug ?? [];

      if (!reactions.length) continue;

      const primaryReaction = reactions[0];
      const primaryDrug = drugs.find(
        (d) =>
          d.medicinalproduct?.toLowerCase().includes(drugName.toLowerCase()) &&
          d.drugcharacterization === "1"
      ) ?? drugs[0];

      if (!primaryDrug?.medicinalproduct) continue;

      const narrative = event.narrativeincludeclinical ?? "";
      const reactionText = reactions.map((r) => r.reactionmeddrapt).join(", ");
      const text = narrative
        ? narrative.slice(0, 800)
        : `Patient reported ${reactionText} while taking ${primaryDrug.medicinalproduct}. ${event.patient?.patientagegroup ? `Age group: ${event.patient.patientagegroup}.` : ""}`;

      const severity = mapOutcomeToSeverity(event);
      const country = event.primarysource?.reportercountry ?? "INDIA";

      const sig: Signal = {
        id: `fda_${event.safetyreportid}`,
        projectId,
        source: "openfda",
        sourceUrl: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${event.safetyreportid}`,
        originalText: text,
        redactedText: text,
        author: "[REDACTED]",
        timestamp: event.receivedate
          ? `${event.receivedate.slice(0, 4)}-${event.receivedate.slice(4, 6)}-${event.receivedate.slice(6, 8)}T00:00:00Z`
          : new Date().toISOString(),
        drug: primaryDrug.medicinalproduct ?? drugName,
        adr: primaryReaction.reactionmeddrapt ?? "Adverse event",
        meddraCode: "10000000",
        meddraterm: primaryReaction.reactionmeddrapt ?? "Adverse event",
        severity,
        confidence: 0.95,
        sentiment: severity === "critical" ? "distress" : "concern",
        piiDetected: false,
        piiTypes: [],
        status: "new",
        geography: country === "IN" || country === "INDIA" ? "India" : country,
      };

      if (db_signals.exists(sig.sourceUrl)) continue;
      db_signals.insert(sig);
      db_projects.incrementSignal(projectId, sig.severity === "critical");
      checkAndGenerateAlert(sig);
      ingested++;
    }

    if (ingested > 0) db_sources.syncUpdate("src_openfda", ingested);
    return ingested;
  } catch {
    return 0;
  }
}

export async function ingestOpenFDAForProject(projectId: string): Promise<number> {
  const project = db_projects.get(projectId);
  if (!project) return 0;

  let total = 0;
  for (const drug of project.drugs.slice(0, 3)) {
    total += await ingestOpenFDAForDrug(drug, projectId, 15);
    await new Promise((r) => setTimeout(r, 300));
  }
  return total;
}

// Get drug event statistics from OpenFDA for analytics
export async function getDrugEventStats(drugName: string): Promise<{
  totalReports: number;
  topReactions: Array<{ term: string; count: number }>;
}> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY;
    const keyParam = apiKey ? `&api_key=${apiKey}` : "";
    const url = `${BASE}?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&count=patient.reaction.reactionmeddrapt.exact&limit=10${keyParam}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { totalReports: 0, topReactions: [] };

    const data = await res.json();
    return {
      totalReports: data.meta?.results?.total ?? 0,
      topReactions: (data.results ?? []).map((r: { term: string; count: number }) => ({
        term: r.term,
        count: r.count,
      })),
    };
  } catch {
    return { totalReports: 0, topReactions: [] };
  }
}
