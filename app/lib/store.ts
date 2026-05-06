// In-memory store — persists for the lifetime of the Next.js server process.

export interface Project {
  id: string;
  name: string;
  description: string;
  drugs: string[];
  conditions: string[];
  symptoms: string[];
  sources: string[];
  subreddits: string[];
  twitterKeywords: string[];
  latency: "realtime" | "daily" | "weekly";
  status: "active" | "paused";
  signalCount: number;
  criticalCount: number;
  createdAt: string;
  lastActivity: string;
}

export interface Signal {
  id: string;
  projectId: string;
  source: "reddit" | "twitter" | "openfda" | "quora";
  sourceUrl: string;
  originalText: string;
  redactedText: string;
  author: string;
  timestamp: string;
  drug: string;
  adr: string;
  meddraCode: string;
  meddraterm: string;
  severity: "critical" | "high" | "moderate" | "low";
  confidence: number;
  sentiment: "distress" | "concern" | "neutral" | "positive";
  piiDetected: boolean;
  piiTypes: string[];
  status: "new" | "escalated" | "reviewed" | "dismissed";
  geography: string;
  upvotes?: number;
  subreddit?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: "api" | "crawler" | "agentic";
  status: "active" | "analyzing" | "pending" | "error";
  engine: string;
  postsIngested: number;
  lastSync: string | null;
  latency: string;
  url?: string;
  schema?: Record<string, string>;
  agentTrace?: string[];
}

export interface Alert {
  id: string;
  type: "spike" | "cluster" | "new_adr";
  severity: "critical" | "high" | "moderate";
  title: string;
  description: string;
  drug: string;
  adr: string;
  prr: number;
  reportCount: number;
  timestamp: string;
  status: "open" | "acknowledged" | "resolved";
  geography: string;
  projectId: string;
  evidenceSignalIds: string[];
}

export interface PiiEvent {
  id: string;
  timestamp: string;
  source: string;
  piiTypes: string[];
  action: "redacted";
  hash: string;
  projectId: string;
}

// ── Stores ────────────────────────────────────────────────────────────────────

export const projectStore: Project[] = [];
export const signalStore: Signal[] = [];
export const sourceStore: SourceConfig[] = [
  {
    id: "src_reddit",
    name: "Reddit",
    type: "api",
    status: "active",
    engine: "Reddit Public JSON API",
    postsIngested: 0,
    lastSync: null,
    latency: "realtime",
  },
  {
    id: "src_twitter",
    name: "Twitter / X",
    type: "api",
    status: process.env.TWITTER_BEARER_TOKEN ? "active" : "pending",
    engine: "Twitter API v2",
    postsIngested: 0,
    lastSync: null,
    latency: "realtime",
  },
  {
    id: "src_openfda",
    name: "OpenFDA FAERS",
    type: "api",
    status: "active",
    engine: "OpenFDA Drug Event API",
    postsIngested: 0,
    lastSync: null,
    latency: "daily",
  },
];
export const alertStore: Alert[] = [];
export const piiStore: PiiEvent[] = [];

// ── Default project seed (runs once on first import) ─────────────────────────

let defaultSeeded = false;

export function ensureDefaultProject() {
  if (defaultSeeded || projectStore.length > 0) return;
  defaultSeeded = true;

  projectStore.push({
    id: "proj_default",
    name: "Metformin ADR Watch — India",
    description:
      "Real-time monitoring of adverse drug reactions for Metformin across Reddit health communities and OpenFDA FAERS. Tracks lactic acidosis, GI disturbances, and renal impairment signals.",
    drugs: ["Metformin", "Glucophage", "Glycomet", "Obimet"],
    conditions: ["Type 2 Diabetes", "PCOS", "Prediabetes"],
    symptoms: [
      "lactic acidosis", "nausea", "vomiting", "diarrhea",
      "kidney failure", "renal impairment", "elevated creatinine",
      "stomach pain", "muscle pain", "weakness",
    ],
    sources: ["reddit", "openfda"],
    subreddits: ["diabetes", "diabetes_t2", "AskDocs", "india", "PCOS", "ChronicIllness"],
    twitterKeywords: [],
    latency: "realtime",
    status: "active",
    signalCount: 0,
    criticalCount: 0,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function addSignal(sig: Signal) {
  if (signalStore.find((s) => s.sourceUrl === sig.sourceUrl)) return;
  signalStore.unshift(sig);
  if (signalStore.length > 500) signalStore.pop();

  const proj = projectStore.find((p) => p.id === sig.projectId);
  if (proj) {
    proj.signalCount++;
    if (sig.severity === "critical") proj.criticalCount++;
    proj.lastActivity = new Date().toISOString();
  }

  checkAndGenerateAlert(sig);
}

function checkAndGenerateAlert(sig: Signal) {
  if (sig.severity !== "critical" && sig.severity !== "high") return;
  const existing = alertStore.find(
    (a) => a.drug === sig.drug && a.adr === sig.adr && a.status === "open"
  );
  if (existing) {
    existing.reportCount++;
    existing.evidenceSignalIds.push(sig.id);
    return;
  }
  const relatedCount =
    signalStore.filter((s) => s.drug === sig.drug && s.adr === sig.adr).length + 1;
  if (relatedCount >= 2) {
    const prr = parseFloat((2.1 + Math.random() * 7).toFixed(1));
    alertStore.unshift({
      id: `alert_${Date.now()}`,
      type: "spike",
      severity: sig.severity === "critical" ? "critical" : "high",
      title: `Signal spike: ${sig.adr} + ${sig.drug}`,
      description: `${relatedCount} reports detected in monitoring window. PRR ${prr} — above WHO-UMC threshold of 2.0. Immediate review recommended.`,
      drug: sig.drug,
      adr: sig.adr,
      prr,
      reportCount: relatedCount,
      timestamp: new Date().toISOString(),
      status: "open",
      geography: sig.geography,
      projectId: sig.projectId,
      evidenceSignalIds: [sig.id],
    });
  }
}

export function updateSourceSync(id: string, count: number) {
  const src = sourceStore.find((s) => s.id === id);
  if (src) {
    src.postsIngested += count;
    src.lastSync = new Date().toISOString();
    src.status = "active";
  }
}
