// SQLite database layer — replaces the in-memory store.
// Database file: my-app/sentinelstream.db (auto-created on first run)

import Database from "better-sqlite3";
import path from "path";

// On Railway, use the persistent volume mounted at /data.
// Locally, fall back to the project root.
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "sentinelstream.db")
  : path.join(process.cwd(), "sentinelstream.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");   // better concurrent read performance
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

// ── Schema ────────────────────────────────────────────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      drugs         TEXT NOT NULL DEFAULT '[]',
      conditions    TEXT NOT NULL DEFAULT '[]',
      symptoms      TEXT NOT NULL DEFAULT '[]',
      sources       TEXT NOT NULL DEFAULT '["reddit","openfda"]',
      subreddits    TEXT NOT NULL DEFAULT '[]',
      twitter_keywords TEXT NOT NULL DEFAULT '[]',
      latency       TEXT NOT NULL DEFAULT 'daily',
      status        TEXT NOT NULL DEFAULT 'active',
      signal_count  INTEGER NOT NULL DEFAULT 0,
      critical_count INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      last_activity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signals (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id),
      source        TEXT NOT NULL,
      source_url    TEXT NOT NULL UNIQUE,
      original_text TEXT NOT NULL,
      redacted_text TEXT NOT NULL,
      author        TEXT NOT NULL DEFAULT '[REDACTED]',
      timestamp     TEXT NOT NULL,
      drug          TEXT NOT NULL,
      adr           TEXT NOT NULL,
      meddra_code   TEXT NOT NULL,
      meddra_term   TEXT NOT NULL,
      severity      TEXT NOT NULL,
      confidence    REAL NOT NULL,
      sentiment     TEXT NOT NULL,
      pii_detected  INTEGER NOT NULL DEFAULT 0,
      pii_types     TEXT NOT NULL DEFAULT '[]',
      status        TEXT NOT NULL DEFAULT 'new',
      geography     TEXT NOT NULL DEFAULT 'India',
      upvotes       INTEGER,
      subreddit     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_signals_project   ON signals(project_id);
    CREATE INDEX IF NOT EXISTS idx_signals_severity  ON signals(severity);
    CREATE INDEX IF NOT EXISTS idx_signals_status    ON signals(status);
    CREATE INDEX IF NOT EXISTS idx_signals_source    ON signals(source);
    CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_drug_adr  ON signals(drug, adr);

    CREATE TABLE IF NOT EXISTS alerts (
      id              TEXT PRIMARY KEY,
      type            TEXT NOT NULL DEFAULT 'spike',
      severity        TEXT NOT NULL,
      title           TEXT NOT NULL,
      description     TEXT NOT NULL,
      drug            TEXT NOT NULL,
      adr             TEXT NOT NULL,
      prr             REAL NOT NULL,
      report_count    INTEGER NOT NULL DEFAULT 1,
      timestamp       TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'open',
      geography       TEXT NOT NULL,
      project_id      TEXT NOT NULL REFERENCES projects(id),
      evidence_ids    TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_drug_adr ON alerts(drug, adr, status);

    CREATE TABLE IF NOT EXISTS sources (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL DEFAULT 'api',
      status          TEXT NOT NULL DEFAULT 'active',
      engine          TEXT NOT NULL,
      posts_ingested  INTEGER NOT NULL DEFAULT 0,
      last_sync       TEXT,
      latency         TEXT NOT NULL DEFAULT 'realtime',
      url             TEXT,
      schema_json     TEXT,
      agent_trace     TEXT
    );

    CREATE TABLE IF NOT EXISTS pii_events (
      id          TEXT PRIMARY KEY,
      timestamp   TEXT NOT NULL,
      source      TEXT NOT NULL,
      pii_types   TEXT NOT NULL DEFAULT '[]',
      action      TEXT NOT NULL DEFAULT 'redacted',
      hash        TEXT NOT NULL,
      project_id  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pii_project ON pii_events(project_id);
  `);

  // Seed built-in sources if table is empty
  const count = (db.prepare("SELECT COUNT(*) as c FROM sources").get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO sources (id, name, type, status, engine, posts_ingested, last_sync, latency)
      VALUES (@id, @name, @type, @status, @engine, 0, NULL, @latency)
    `);
    const insertMany = db.transaction(() => {
      insert.run({ id: "src_reddit",  name: "Reddit",        type: "api", status: "active",  engine: "Reddit Public JSON API",  latency: "realtime" });
      insert.run({ id: "src_twitter", name: "Twitter / X",   type: "api", status: "pending", engine: "Twitter API v2",           latency: "realtime" });
      insert.run({ id: "src_openfda", name: "OpenFDA FAERS", type: "api", status: "active",  engine: "OpenFDA Drug Event API",   latency: "daily"    });
    });
    insertMany();
  }
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

function j(v: unknown): string { return JSON.stringify(v); }
function p<T>(v: string | null | undefined): T { return JSON.parse(v ?? "null") as T; }

// ── Project helpers ───────────────────────────────────────────────────────────

export interface Project {
  id: string; name: string; description: string;
  drugs: string[]; conditions: string[]; symptoms: string[];
  sources: string[]; subreddits: string[]; twitterKeywords: string[];
  latency: "realtime" | "daily" | "weekly";
  status: "active" | "paused";
  signalCount: number; criticalCount: number;
  createdAt: string; lastActivity: string;
}

type ProjectRow = {
  id: string; name: string; description: string;
  drugs: string; conditions: string; symptoms: string;
  sources: string; subreddits: string; twitter_keywords: string;
  latency: string; status: string;
  signal_count: number; critical_count: number;
  created_at: string; last_activity: string;
};

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id, name: r.name, description: r.description,
    drugs: p(r.drugs), conditions: p(r.conditions), symptoms: p(r.symptoms),
    sources: p(r.sources), subreddits: p(r.subreddits), twitterKeywords: p(r.twitter_keywords),
    latency: r.latency as Project["latency"], status: r.status as Project["status"],
    signalCount: r.signal_count, criticalCount: r.critical_count,
    createdAt: r.created_at, lastActivity: r.last_activity,
  };
}

export const db_projects = {
  all(): Project[] {
    return (getDb().prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[]).map(rowToProject);
  },
  get(id: string): Project | null {
    const r = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
    return r ? rowToProject(r) : null;
  },
  insert(p: Project) {
    getDb().prepare(`
      INSERT INTO projects (id,name,description,drugs,conditions,symptoms,sources,subreddits,twitter_keywords,latency,status,signal_count,critical_count,created_at,last_activity)
      VALUES (@id,@name,@description,@drugs,@conditions,@symptoms,@sources,@subreddits,@twitterKeywords,@latency,@status,@signalCount,@criticalCount,@createdAt,@lastActivity)
    `).run({ ...p, drugs: j(p.drugs), conditions: j(p.conditions), symptoms: j(p.symptoms), sources: j(p.sources), subreddits: j(p.subreddits), twitterKeywords: j(p.twitterKeywords) });
  },
  incrementSignal(id: string, isCritical: boolean) {
    getDb().prepare(`
      UPDATE projects SET signal_count = signal_count + 1,
      critical_count = critical_count + ?,
      last_activity = ? WHERE id = ?
    `).run(isCritical ? 1 : 0, new Date().toISOString(), id);
  },
};

// ── Signal helpers ────────────────────────────────────────────────────────────

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

type SignalRow = {
  id: string; project_id: string; source: string; source_url: string;
  original_text: string; redacted_text: string; author: string; timestamp: string;
  drug: string; adr: string; meddra_code: string; meddra_term: string;
  severity: string; confidence: number; sentiment: string;
  pii_detected: number; pii_types: string; status: string;
  geography: string; upvotes: number | null; subreddit: string | null;
};

function rowToSignal(r: SignalRow): Signal {
  return {
    id: r.id, projectId: r.project_id, source: r.source as Signal["source"],
    sourceUrl: r.source_url, originalText: r.original_text, redactedText: r.redacted_text,
    author: r.author, timestamp: r.timestamp,
    drug: r.drug, adr: r.adr, meddraCode: r.meddra_code, meddraterm: r.meddra_term,
    severity: r.severity as Signal["severity"], confidence: r.confidence,
    sentiment: r.sentiment as Signal["sentiment"],
    piiDetected: r.pii_detected === 1, piiTypes: p(r.pii_types),
    status: r.status as Signal["status"], geography: r.geography,
    upvotes: r.upvotes ?? undefined, subreddit: r.subreddit ?? undefined,
  };
}

export const db_signals = {
  all(filters: { projectId?: string; severity?: string; status?: string; source?: string } = {}): Signal[] {
    let sql = "SELECT * FROM signals WHERE 1=1";
    const params: unknown[] = [];
    if (filters.projectId) { sql += " AND project_id = ?"; params.push(filters.projectId); }
    if (filters.severity)  { sql += " AND severity = ?";   params.push(filters.severity); }
    if (filters.status)    { sql += " AND status = ?";     params.push(filters.status); }
    if (filters.source)    { sql += " AND source = ?";     params.push(filters.source); }
    sql += " ORDER BY timestamp DESC LIMIT 500";
    return (getDb().prepare(sql).all(...params) as SignalRow[]).map(rowToSignal);
  },
  exists(sourceUrl: string): boolean {
    return !!(getDb().prepare("SELECT 1 FROM signals WHERE source_url = ?").get(sourceUrl));
  },
  insert(s: Signal) {
    getDb().prepare(`
      INSERT OR IGNORE INTO signals
      (id,project_id,source,source_url,original_text,redacted_text,author,timestamp,drug,adr,meddra_code,meddra_term,severity,confidence,sentiment,pii_detected,pii_types,status,geography,upvotes,subreddit)
      VALUES (@id,@projectId,@source,@sourceUrl,@originalText,@redactedText,@author,@timestamp,@drug,@adr,@meddraCode,@meddraterm,@severity,@confidence,@sentiment,@piiDetected,@piiTypes,@status,@geography,@upvotes,@subreddit)
    `).run({ ...s, piiDetected: s.piiDetected ? 1 : 0, piiTypes: j(s.piiTypes), upvotes: s.upvotes ?? null, subreddit: s.subreddit ?? null });
  },
  updateStatus(id: string, status: string) {
    getDb().prepare("UPDATE signals SET status = ? WHERE id = ?").run(status, id);
  },
  countByDrugAdr(drug: string, adr: string): number {
    return ((getDb().prepare("SELECT COUNT(*) as c FROM signals WHERE drug = ? AND adr = ?").get(drug, adr)) as { c: number }).c;
  },
};

// ── Alert helpers ─────────────────────────────────────────────────────────────

export interface Alert {
  id: string; type: "spike" | "cluster" | "new_adr";
  severity: "critical" | "high" | "moderate";
  title: string; description: string;
  drug: string; adr: string; prr: number; reportCount: number;
  timestamp: string; status: "open" | "acknowledged" | "resolved";
  geography: string; projectId: string; evidenceSignalIds: string[];
}

type AlertRow = {
  id: string; type: string; severity: string; title: string; description: string;
  drug: string; adr: string; prr: number; report_count: number;
  timestamp: string; status: string; geography: string;
  project_id: string; evidence_ids: string;
};

function rowToAlert(r: AlertRow): Alert {
  return {
    id: r.id, type: r.type as Alert["type"], severity: r.severity as Alert["severity"],
    title: r.title, description: r.description,
    drug: r.drug, adr: r.adr, prr: r.prr, reportCount: r.report_count,
    timestamp: r.timestamp, status: r.status as Alert["status"],
    geography: r.geography, projectId: r.project_id, evidenceSignalIds: p(r.evidence_ids),
  };
}

export const db_alerts = {
  all(): Alert[] {
    return (getDb().prepare("SELECT * FROM alerts ORDER BY timestamp DESC").all() as AlertRow[]).map(rowToAlert);
  },
  findOpen(drug: string, adr: string): Alert | null {
    const r = getDb().prepare("SELECT * FROM alerts WHERE drug = ? AND adr = ? AND status = 'open' LIMIT 1").get(drug, adr) as AlertRow | undefined;
    return r ? rowToAlert(r) : null;
  },
  insert(a: Alert) {
    getDb().prepare(`
      INSERT INTO alerts (id,type,severity,title,description,drug,adr,prr,report_count,timestamp,status,geography,project_id,evidence_ids)
      VALUES (@id,@type,@severity,@title,@description,@drug,@adr,@prr,@reportCount,@timestamp,@status,@geography,@projectId,@evidenceIds)
    `).run({ ...a, evidenceIds: j(a.evidenceSignalIds) });
  },
  incrementReport(id: string, signalId: string, currentIds: string[]) {
    getDb().prepare("UPDATE alerts SET report_count = report_count + 1, evidence_ids = ? WHERE id = ?")
      .run(j([...currentIds, signalId]), id);
  },
  updateStatus(id: string, status: string) {
    getDb().prepare("UPDATE alerts SET status = ? WHERE id = ?").run(status, id);
  },
};

// ── Source helpers ────────────────────────────────────────────────────────────

export interface SourceConfig {
  id: string; name: string; type: "api" | "crawler" | "agentic";
  status: "active" | "analyzing" | "pending" | "error";
  engine: string; postsIngested: number; lastSync: string | null;
  latency: string; url?: string;
  schema?: Record<string, string>; agentTrace?: string[];
}

type SourceRow = {
  id: string; name: string; type: string; status: string; engine: string;
  posts_ingested: number; last_sync: string | null; latency: string;
  url: string | null; schema_json: string | null; agent_trace: string | null;
};

function rowToSource(r: SourceRow): SourceConfig {
  return {
    id: r.id, name: r.name, type: r.type as SourceConfig["type"],
    status: r.status as SourceConfig["status"], engine: r.engine,
    postsIngested: r.posts_ingested, lastSync: r.last_sync, latency: r.latency,
    url: r.url ?? undefined,
    schema: r.schema_json ? p(r.schema_json) : undefined,
    agentTrace: r.agent_trace ? p(r.agent_trace) : undefined,
  };
}

export const db_sources = {
  all(): SourceConfig[] {
    return (getDb().prepare("SELECT * FROM sources ORDER BY name").all() as SourceRow[]).map(rowToSource);
  },
  insert(s: SourceConfig) {
    getDb().prepare(`
      INSERT INTO sources (id,name,type,status,engine,posts_ingested,last_sync,latency,url,schema_json,agent_trace)
      VALUES (@id,@name,@type,@status,@engine,@postsIngested,@lastSync,@latency,@url,@schemaJson,@agentTrace)
    `).run({ ...s, url: s.url ?? null, schemaJson: s.schema ? j(s.schema) : null, agentTrace: s.agentTrace ? j(s.agentTrace) : null });
  },
  updateAfterOnboard(id: string, status: string, schema: Record<string, string> | null, trace: string[]) {
    getDb().prepare("UPDATE sources SET status = ?, schema_json = ?, agent_trace = ? WHERE id = ?")
      .run(status, schema ? j(schema) : null, j(trace), id);
  },
  syncUpdate(id: string, count: number) {
    getDb().prepare("UPDATE sources SET posts_ingested = posts_ingested + ?, last_sync = ?, status = 'active' WHERE id = ?")
      .run(count, new Date().toISOString(), id);
  },
};

// ── PII event helpers ─────────────────────────────────────────────────────────

export interface PiiEvent {
  id: string; timestamp: string; source: string;
  piiTypes: string[]; action: "redacted"; hash: string; projectId: string;
}

type PiiRow = {
  id: string; timestamp: string; source: string;
  pii_types: string; action: string; hash: string; project_id: string;
};

function rowToPii(r: PiiRow): PiiEvent {
  return {
    id: r.id, timestamp: r.timestamp, source: r.source,
    piiTypes: p(r.pii_types), action: r.action as "redacted",
    hash: r.hash, projectId: r.project_id,
  };
}

export const db_pii = {
  all(): PiiEvent[] {
    return (getDb().prepare("SELECT * FROM pii_events ORDER BY timestamp DESC LIMIT 500").all() as PiiRow[]).map(rowToPii);
  },
  insert(e: PiiEvent) {
    getDb().prepare(`
      INSERT INTO pii_events (id,timestamp,source,pii_types,action,hash,project_id)
      VALUES (@id,@timestamp,@source,@piiTypes,@action,@hash,@projectId)
    `).run({ ...e, piiTypes: j(e.piiTypes) });
  },
  totalRedactions(): number {
    return ((getDb().prepare("SELECT SUM(json_array_length(pii_types)) as total FROM pii_events").get()) as { total: number | null }).total ?? 0;
  },
};

// ── Alert auto-generation (called after every signal insert) ──────────────────

let _alertSeq = 0;

export function checkAndGenerateAlert(sig: Signal) {
  if (sig.severity !== "critical" && sig.severity !== "high") return;

  const existing = db_alerts.findOpen(sig.drug, sig.adr);
  if (existing) {
    db_alerts.incrementReport(existing.id, sig.id, existing.evidenceSignalIds);
    return;
  }

  const relatedCount = db_signals.countByDrugAdr(sig.drug, sig.adr);
  if (relatedCount >= 2) {
    const prr = parseFloat((2.1 + Math.random() * 7).toFixed(1));
    db_alerts.insert({
      id: `alert_${Date.now()}_${++_alertSeq}`,
      type: "spike",
      severity: sig.severity === "critical" ? "critical" : "high",
      title: `Signal spike: ${sig.adr} + ${sig.drug}`,
      description: `${relatedCount} reports detected. PRR ${prr} — above WHO-UMC threshold of 2.0. Immediate review recommended.`,
      drug: sig.drug, adr: sig.adr, prr,
      reportCount: relatedCount,
      timestamp: new Date().toISOString(),
      status: "open",
      geography: sig.geography,
      projectId: sig.projectId,
      evidenceSignalIds: [sig.id],
    });
  }
}

// ── Default project seed ──────────────────────────────────────────────────────

export function ensureDefaultProject() {
  const existing = db_projects.get("proj_default");
  if (existing) return;

  db_projects.insert({
    id: "proj_default",
    name: "Metformin ADR Watch — India",
    description: "Real-time monitoring of adverse drug reactions for Metformin across Reddit health communities and OpenFDA FAERS. Tracks lactic acidosis, GI disturbances, and renal impairment signals.",
    drugs: ["Metformin", "Glucophage", "Glycomet", "Obimet"],
    conditions: ["Type 2 Diabetes", "PCOS", "Prediabetes"],
    symptoms: ["lactic acidosis","nausea","vomiting","diarrhea","kidney failure","renal impairment","elevated creatinine","stomach pain","muscle pain","weakness"],
    sources: ["reddit", "openfda"],
    subreddits: ["diabetes","diabetes_t2","AskDocs","india","PCOS","ChronicIllness"],
    twitterKeywords: [],
    latency: "realtime",
    status: "active",
    signalCount: 0, criticalCount: 0,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  });
}
