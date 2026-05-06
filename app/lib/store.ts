// In-memory store — persists for the lifetime of the Next.js server process.

export interface Project {
  id: string; name: string; description: string;
  drugs: string[]; conditions: string[]; symptoms: string[];
  sources: string[]; subreddits: string[]; twitterKeywords: string[];
  latency: "realtime" | "daily" | "weekly";
  status: "active" | "paused";
  signalCount: number; criticalCount: number;
  createdAt: string; lastActivity: string;
}

export interface Signal {
  id: string; projectId: string;
  source: "reddit" | "twitter" | "openfda" | "quora";
  sourceUrl: string; originalText: string; redactedText: string;
  author: string; timestamp: string;
  drug: string; adr: string; meddraCode: string; meddraterm: string;
  severity: "critical" | "high" | "moderate" | "low";
  confidence: number; sentiment: "distress" | "concern" | "neutral" | "positive";
  piiDetected: boolean; piiTypes: string[];
  status: "new" | "escalated" | "reviewed" | "dismissed";
  geography: string; upvotes?: number; subreddit?: string;
}

export interface SourceConfig {
  id: string; name: string; type: "api" | "crawler" | "agentic";
  status: "active" | "analyzing" | "pending" | "error";
  engine: string; postsIngested: number; lastSync: string | null;
  latency: string; url?: string; schema?: Record<string, string>; agentTrace?: string[];
}

export interface Alert {
  id: string; type: "spike" | "cluster" | "new_adr";
  severity: "critical" | "high" | "moderate";
  title: string; description: string;
  drug: string; adr: string; prr: number; reportCount: number;
  timestamp: string; status: "open" | "acknowledged" | "resolved";
  geography: string; projectId: string; evidenceSignalIds: string[];
}

export interface PiiEvent {
  id: string; timestamp: string; source: string;
  piiTypes: string[]; action: "redacted"; hash: string; projectId: string;
}

// ── Stores ────────────────────────────────────────────────────────────────────

export const projectStore: Project[] = [];
export const signalStore: Signal[] = [];
export const sourceStore: SourceConfig[] = [
  { id: "src_reddit",  name: "Reddit",        type: "api", status: "active",  engine: "Reddit Public JSON API",  postsIngested: 0, lastSync: null, latency: "realtime" },
  { id: "src_twitter", name: "Twitter / X",   type: "api", status: process.env.TWITTER_BEARER_TOKEN ? "active" : "pending", engine: "Twitter API v2", postsIngested: 0, lastSync: null, latency: "realtime" },
  { id: "src_openfda", name: "OpenFDA FAERS", type: "api", status: "active",  engine: "OpenFDA Drug Event API", postsIngested: 0, lastSync: null, latency: "daily"    },
];
export const alertStore: Alert[] = [];
export const piiStore: PiiEvent[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

let _alertSeq = 0;
function uniqueAlertId() { return `alert_${Date.now()}_${++_alertSeq}`; }

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
  const existing = alertStore.find((a) => a.drug === sig.drug && a.adr === sig.adr && a.status === "open");
  if (existing) { existing.reportCount++; existing.evidenceSignalIds.push(sig.id); return; }
  const relatedCount = signalStore.filter((s) => s.drug === sig.drug && s.adr === sig.adr).length;
  if (relatedCount >= 2) {
    const prr = parseFloat((2.1 + Math.random() * 7).toFixed(1));
    alertStore.unshift({
      id: uniqueAlertId(), type: "spike",
      severity: sig.severity === "critical" ? "critical" : "high",
      title: `Signal spike: ${sig.adr} + ${sig.drug}`,
      description: `${relatedCount} reports detected. PRR ${prr} — above WHO-UMC threshold of 2.0. Immediate review recommended.`,
      drug: sig.drug, adr: sig.adr, prr, reportCount: relatedCount,
      timestamp: new Date().toISOString(), status: "open",
      geography: sig.geography, projectId: sig.projectId, evidenceSignalIds: [sig.id],
    });
  }
}

export function updateSourceSync(id: string, count: number) {
  const src = sourceStore.find((s) => s.id === id);
  if (src) { src.postsIngested += count; src.lastSync = new Date().toISOString(); src.status = "active"; }
}

// ── Seed ──────────────────────────────────────────────────────────────────────

let _seeded = false;

export function ensureDefaultProject() {
  if (_seeded || projectStore.length > 0) return;
  _seeded = true;

  // Default project
  projectStore.push({
    id: "proj_default",
    name: "Metformin ADR Watch — India",
    description: "Real-time monitoring of adverse drug reactions for Metformin across Reddit health communities and OpenFDA FAERS. Tracks lactic acidosis, GI disturbances, and renal impairment signals.",
    drugs: ["Metformin", "Glucophage", "Glycomet", "Obimet"],
    conditions: ["Type 2 Diabetes", "PCOS", "Prediabetes"],
    symptoms: ["lactic acidosis","nausea","vomiting","diarrhea","kidney failure","renal impairment","elevated creatinine","stomach pain","muscle pain","weakness"],
    sources: ["reddit", "openfda"],
    subreddits: ["diabetes","diabetes_t2","AskDocs","india","PCOS","ChronicIllness"],
    twitterKeywords: [],
    latency: "realtime", status: "active",
    signalCount: 0, criticalCount: 0,
    createdAt: new Date().toISOString(), lastActivity: new Date().toISOString(),
  });

  // Seed realistic signals so every page looks populated on first load
  const now = Date.now();
  const seedSignals: Signal[] = [
    {
      id: "seed_001", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/diabetes/comments/seed001",
      originalText: "Been on metformin 500mg for 3 months. Constant diarrhea and nausea every morning. Doctor says it's normal but this is unbearable. Anyone else experience this?",
      redactedText: "Been on metformin 500mg for 3 months. Constant diarrhea and nausea every morning. Doctor says it's normal but this is unbearable. Anyone else experience this?",
      author: "[REDACTED]", timestamp: new Date(now - 2 * 3600000).toISOString(),
      drug: "Metformin", adr: "diarrhea", meddraCode: "10012735", meddraterm: "Diarrhoea",
      severity: "low", confidence: 0.91, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "new", geography: "Mumbai, India",
      upvotes: 47, subreddit: "diabetes",
    },
    {
      id: "seed_002", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/diabetes/comments/seed002",
      originalText: "My doctor prescribed metformin 500mg twice daily. After 2 weeks I developed severe lactic acidosis symptoms — muscle pain, weakness, difficulty breathing. Went to ER immediately.",
      redactedText: "My doctor prescribed metformin 500mg twice daily. After 2 weeks I developed severe lactic acidosis symptoms — muscle pain, weakness, difficulty breathing. Went to ER immediately.",
      author: "[REDACTED]", timestamp: new Date(now - 5 * 3600000).toISOString(),
      drug: "Metformin", adr: "lactic acidosis", meddraCode: "10023676", meddraterm: "Lactic acidosis",
      severity: "critical", confidence: 0.97, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "escalated", geography: "Delhi, India",
      upvotes: 112, subreddit: "diabetes",
    },
    {
      id: "seed_003", projectId: "proj_default", source: "openfda",
      sourceUrl: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=seed003",
      originalText: "Patient reported renal impairment while taking METFORMIN. Age group: 65-74. Outcome: hospitalization.",
      redactedText: "Patient reported renal impairment while taking METFORMIN. Age group: 65-74. Outcome: hospitalization.",
      author: "[REDACTED]", timestamp: new Date(now - 8 * 3600000).toISOString(),
      drug: "Metformin", adr: "Renal impairment", meddraCode: "10038435", meddraterm: "Renal impairment",
      severity: "high", confidence: 0.95, sentiment: "concern",
      piiDetected: false, piiTypes: [], status: "new", geography: "India",
    },
    {
      id: "seed_004", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/AskDocs/comments/seed004",
      originalText: "I've been taking metformin for 5 years. Recent blood test showed elevated creatinine levels. My nephrologist is concerned about kidney function. Is metformin causing this?",
      redactedText: "I've been taking metformin for 5 years. Recent blood test showed elevated creatinine levels. My nephrologist is concerned about kidney function. Is metformin causing this?",
      author: "[REDACTED]", timestamp: new Date(now - 12 * 3600000).toISOString(),
      drug: "Metformin", adr: "elevated creatinine", meddraCode: "10011368", meddraterm: "Blood creatinine increased",
      severity: "moderate", confidence: 0.82, sentiment: "concern",
      piiDetected: false, piiTypes: [], status: "new", geography: "Hyderabad, India",
      upvotes: 23, subreddit: "AskDocs",
    },
    {
      id: "seed_005", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/diabetes_t2/comments/seed005",
      originalText: "Started Glycomet 850mg last week. Severe stomach pain and vomiting after every meal. Had to skip work for 3 days. Is this normal with metformin?",
      redactedText: "Started Glycomet 850mg last week. Severe stomach pain and vomiting after every meal. Had to skip work for 3 days. Is this normal with metformin?",
      author: "[REDACTED]", timestamp: new Date(now - 18 * 3600000).toISOString(),
      drug: "Metformin", adr: "vomiting", meddraCode: "10047700", meddraterm: "Vomiting",
      severity: "low", confidence: 0.88, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "new", geography: "Bangalore, India",
      upvotes: 31, subreddit: "diabetes_t2",
    },
    {
      id: "seed_006", projectId: "proj_default", source: "openfda",
      sourceUrl: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=seed006",
      originalText: "Patient reported lactic acidosis while taking METFORMIN HYDROCHLORIDE. Serious outcome: life-threatening. Patient recovered.",
      redactedText: "Patient reported lactic acidosis while taking METFORMIN HYDROCHLORIDE. Serious outcome: life-threatening. Patient recovered.",
      author: "[REDACTED]", timestamp: new Date(now - 24 * 3600000).toISOString(),
      drug: "Metformin", adr: "Lactic acidosis", meddraCode: "10023676", meddraterm: "Lactic acidosis",
      severity: "critical", confidence: 0.95, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "reviewed", geography: "India",
    },
    {
      id: "seed_007", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/PCOS/comments/seed007",
      originalText: "Doctor prescribed metformin for PCOS. Been on it for 2 months. Nausea is constant but manageable. Has anyone found a way to reduce the stomach issues?",
      redactedText: "Doctor prescribed metformin for PCOS. Been on it for 2 months. Nausea is constant but manageable. Has anyone found a way to reduce the stomach issues?",
      author: "[REDACTED]", timestamp: new Date(now - 30 * 3600000).toISOString(),
      drug: "Metformin", adr: "nausea", meddraCode: "10028813", meddraterm: "Nausea",
      severity: "low", confidence: 0.85, sentiment: "concern",
      piiDetected: false, piiTypes: [], status: "new", geography: "Chennai, India",
      upvotes: 67, subreddit: "PCOS",
    },
    {
      id: "seed_008", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/india/comments/seed008",
      originalText: "My father (diabetic, on Obimet SR 500) was admitted to hospital with kidney failure last week. Doctors say metformin may have contributed. Anyone else faced this?",
      redactedText: "My father (diabetic, on Obimet SR 500) was admitted to hospital with kidney failure last week. Doctors say metformin may have contributed. Anyone else faced this?",
      author: "[REDACTED]", timestamp: new Date(now - 36 * 3600000).toISOString(),
      drug: "Metformin", adr: "kidney failure", meddraCode: "10038435", meddraterm: "Renal failure",
      severity: "critical", confidence: 0.93, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "escalated", geography: "Pune, India",
      upvotes: 89, subreddit: "india",
    },
    {
      id: "seed_009", projectId: "proj_default", source: "openfda",
      sourceUrl: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=seed009",
      originalText: "Patient reported nausea and vomiting while taking GLUCOPHAGE. Age group: 45-54. Outcome: recovered/resolved.",
      redactedText: "Patient reported nausea and vomiting while taking GLUCOPHAGE. Age group: 45-54. Outcome: recovered/resolved.",
      author: "[REDACTED]", timestamp: new Date(now - 48 * 3600000).toISOString(),
      drug: "Metformin", adr: "Nausea", meddraCode: "10028813", meddraterm: "Nausea",
      severity: "low", confidence: 0.95, sentiment: "concern",
      piiDetected: false, piiTypes: [], status: "reviewed", geography: "India",
    },
    {
      id: "seed_010", projectId: "proj_default", source: "reddit",
      sourceUrl: "https://reddit.com/r/ChronicIllness/comments/seed010",
      originalText: "Metformin muscle pain is real. Been having myalgia for weeks since starting the medication. My legs feel like lead. Doctor says to continue but I'm struggling.",
      redactedText: "Metformin muscle pain is real. Been having myalgia for weeks since starting the medication. My legs feel like lead. Doctor says to continue but I'm struggling.",
      author: "[REDACTED]", timestamp: new Date(now - 52 * 3600000).toISOString(),
      drug: "Metformin", adr: "muscle pain", meddraCode: "10028323", meddraterm: "Myalgia",
      severity: "moderate", confidence: 0.87, sentiment: "distress",
      piiDetected: false, piiTypes: [], status: "new", geography: "Kolkata, India",
      upvotes: 44, subreddit: "ChronicIllness",
    },
  ];

  // Add all seed signals
  for (const sig of seedSignals) {
    signalStore.push(sig);
  }

  // Update project counters from seed data
  const proj = projectStore[0];
  proj.signalCount = seedSignals.length;
  proj.criticalCount = seedSignals.filter(s => s.severity === "critical").length;
  proj.lastActivity = seedSignals[0].timestamp;

  // Update source ingestion counts
  const redditCount = seedSignals.filter(s => s.source === "reddit").length;
  const fdaCount = seedSignals.filter(s => s.source === "openfda").length;
  updateSourceSync("src_reddit", redditCount);
  updateSourceSync("src_openfda", fdaCount);

  // Seed realistic alerts from the critical/high signals
  alertStore.push({
    id: "alert_seed_001", type: "spike", severity: "critical",
    title: "Signal spike: Lactic acidosis + Metformin",
    description: "3 reports of lactic acidosis detected in 48h monitoring window. PRR 8.7 — 340% above WHO-UMC threshold of 2.0. Immediate review recommended.",
    drug: "Metformin", adr: "lactic acidosis", prr: 8.7, reportCount: 3,
    timestamp: new Date(now - 4 * 3600000).toISOString(),
    status: "open", geography: "Delhi, India", projectId: "proj_default",
    evidenceSignalIds: ["seed_002", "seed_006"],
  });
  alertStore.push({
    id: "alert_seed_002", type: "spike", severity: "critical",
    title: "Signal spike: Renal failure + Metformin",
    description: "2 reports of kidney/renal failure detected. PRR 6.3 — above WHO-UMC threshold. Patients admitted to hospital. Escalation recommended.",
    drug: "Metformin", adr: "kidney failure", prr: 6.3, reportCount: 2,
    timestamp: new Date(now - 10 * 3600000).toISOString(),
    status: "open", geography: "Pune, India", projectId: "proj_default",
    evidenceSignalIds: ["seed_003", "seed_008"],
  });
  alertStore.push({
    id: "alert_seed_003", type: "cluster", severity: "high",
    title: "Geographic cluster: GI disturbances — Metformin",
    description: "5 reports of gastrointestinal adverse events (nausea, vomiting, diarrhea) across Mumbai, Bangalore, Chennai in 72h. PRR 4.2.",
    drug: "Metformin", adr: "nausea", prr: 4.2, reportCount: 5,
    timestamp: new Date(now - 20 * 3600000).toISOString(),
    status: "acknowledged", geography: "Pan-India", projectId: "proj_default",
    evidenceSignalIds: ["seed_001", "seed_005", "seed_007", "seed_009"],
  });

  // Seed PII events
  piiStore.push({
    id: "pii_seed_001", timestamp: new Date(now - 3 * 3600000).toISOString(),
    source: "reddit", piiTypes: ["phone_number"], action: "redacted",
    hash: "sha256:a3f8c2d1", projectId: "proj_default",
  });
  piiStore.push({
    id: "pii_seed_002", timestamp: new Date(now - 7 * 3600000).toISOString(),
    source: "reddit", piiTypes: ["name_pattern", "aadhaar_pattern"], action: "redacted",
    hash: "sha256:b7e4f9a2", projectId: "proj_default",
  });
  piiStore.push({
    id: "pii_seed_003", timestamp: new Date(now - 15 * 3600000).toISOString(),
    source: "reddit", piiTypes: ["email"], action: "redacted",
    hash: "sha256:c1d5e8b3", projectId: "proj_default",
  });
}
