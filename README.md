# SentinelStream

**An Agentic Multi-Source Intelligence Platform for Real-Time Patient Safety & Pharmacovigilance Signal Detection**

> Theme 6 — Real-Time Social Listening for Patient Experience & Safety Signals  
> Built for India's pharmacovigilance ecosystem (PvPI / CDSCO / WHO-UMC compatible)

---

## What It Does

India's pharmacovigilance system relies on slow, narrow spontaneous reporting. Patients complain about side-effects on Reddit before they file a formal report. They post on health forums about a bad batch before the regulator hears about it.

SentinelStream closes that gap. It continuously ingests patient-generated conversations from Reddit, OpenFDA FAERS, and Twitter/X, runs a clinical NLP pipeline over every post, maps extracted adverse events to MedDRA codes, redacts all PII before storage, and surfaces statistically unusual spikes as auditable alerts — in real time.

---

## Live Demo

```
cd my-app
npm install
npm run dev
# Open http://localhost:3000
```

A default project (**Metformin ADR Watch — India**) is seeded automatically and begins ingesting real data from Reddit health communities and OpenFDA FAERS within 15–30 seconds of first load.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, React Server Components) |
| Styling | Tailwind CSS v4 + custom design system |
| NLP Pipeline | Rule-based NER + MedDRA LLT dictionary (server-side TypeScript) |
| Reddit Ingestion | Reddit Public JSON API (no auth required) |
| FDA Data | OpenFDA Drug Event API (`api.fda.gov/drug/event.json`) |
| Twitter Ingestion | Twitter API v2 (optional, requires Bearer Token) |
| Agentic Onboarding | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| In-memory Store | TypeScript module-level arrays (FIFO, 500 signal cap) |
| Language Detection | Unicode range matching (Hindi, Tamil, Telugu) |

---

## Features

### 1. Project-Based Monitoring Workspaces

Each **Project** is a self-contained monitoring workspace configured once by a safety officer.

- Define **drugs** to watch (generic names + brand aliases — e.g. Metformin, Glucophage, Glycomet)
- Define **conditions** (Type 2 Diabetes, PCOS, Hypertension)
- Define **symptoms** to prioritise (lactic acidosis, renal impairment, blurred vision)
- Choose **data sources** (Reddit, OpenFDA FAERS, Twitter/X)
- Set custom **subreddits** to monitor (e.g. `r/diabetes`, `r/AskDocs`, `r/india`)
- Choose **latency tier**: Real-time · Daily · Weekly
- **Ingest Now** button triggers an immediate on-demand ingestion run
- A default project (**Metformin ADR Watch — India**) is seeded on first server start

---

### 2. Multi-Source Data Ingestion

#### Reddit (Public JSON API — no auth required)
- Fetches from `reddit.com/r/{sub}/new.json` and `/search.json`
- Searches 30+ health subreddits: `diabetes`, `diabetes_t2`, `AskDocs`, `medical`, `ChronicPain`, `HeartDisease`, `kidney`, `PCOS`, `india`, `IndianHealthcare`, and more
- Searches each subreddit for project drug names
- Also fetches general new posts and runs NLP over all of them
- Polite rate limiting: 500ms delay between subreddits
- Captures: post text, title, subreddit, upvote score, permalink, timestamp

#### OpenFDA FAERS (Free API — no auth required for basic use)
- Queries `api.fda.gov/drug/event.json` for real FDA adverse event reports
- Pulls the 15 most recent reports per drug, sorted by receive date
- Maps FDA outcome codes to severity: `seriousnessdeath=1` → critical, `seriousnesshospitalization=1` → high
- Uses real MedDRA PT terms directly from FAERS data
- Confidence score: 0.95 (FDA data is authoritative)
- Also queries reaction frequency counts for the Analytics page
- Supports `OPENFDA_API_KEY` for higher rate limits (240 req/min vs 40)

#### Twitter / X (Optional — requires Bearer Token)
- Uses Twitter API v2 recent search endpoint
- Builds pharmacovigilance-focused queries: `(drug OR "brand name") (side effect OR adverse OR reaction OR "stopped taking" OR "bad reaction")`
- Filters retweets, limits to English
- 1 second delay between queries to respect rate limits

---

### 3. Clinical NLP Pipeline

Every ingested post passes through a server-side NLP pipeline before storage.

#### Drug Named Entity Recognition
- Dictionary of **500+ drug names and brand aliases** covering:
  - Antidiabetics: Metformin, Glucophage, Glycomet, Sitagliptin, Januvia, Glimepiride, Insulin
  - Cardiovascular: Amlodipine, Norvasc, Atorvastatin, Lipitor, Losartan, Cozaar, Metoprolol, Atenolol
  - Antibiotics: Amoxicillin, Azithromycin, Ciprofloxacin, Doxycycline
  - Analgesics: Paracetamol, Crocin, Ibuprofen, Brufen, Tramadol, Morphine
  - Psychiatric: Sertraline, Zoloft, Fluoxetine, Prozac, Quetiapine, Seroquel, Alprazolam, Xanax
  - Oncology: Imatinib, Gleevec, Trastuzumab, Herceptin, Paclitaxel, Cisplatin, Doxorubicin
  - Immunosuppressants: Tacrolimus, Cyclosporine, Methotrexate, Adalimumab, Humira, Infliximab
  - 100+ more across all therapeutic categories
- Project-specific drugs are checked first (higher priority)

#### Adverse Drug Reaction NER with MedDRA Mapping
- Dictionary of **80+ ADR terms** mapped to real **MedDRA LLT/PT codes** with severity classification:

| Severity | Examples |
|---|---|
| Critical | Lactic acidosis (10023676), Stevens-Johnson syndrome (10042033), Anaphylaxis (10002198), Cardiac arrest (10007515), Seizure (10039906), Suicidal ideation (10042458) |
| High | Bradycardia (10006093), Hepatotoxicity (10019851), Stroke (10042244), Pulmonary embolism (10037377), Hypoglycaemia (10020993), Chest pain (10008479), Dyspnoea (10013968) |
| Moderate | Visual impairment (10047571), Peripheral oedema (10034570), Palpitations (10033557), Elevated creatinine (10011368), Depression (10012378), Fever (10016558) |
| Low | Nausea (10028813), Diarrhoea (10012735), Headache (10019211), Fatigue (10016256), Rash (10037844), Myalgia (10028323) |

#### Adverse Event Classification
- A post is only flagged as a reportable adverse event if **both** a drug AND an ADR are detected in the same text
- Prevents false positives from posts that mention drugs without symptoms

#### Confidence Scoring
- Base: 0.50
- Drug detected: +0.20
- ADR detected: +0.20
- Clinical context keywords (side effect, adverse, reaction): +0.05
- Prescription context (doctor, prescribed, mg, dose): +0.05
- Maximum: 0.99

#### Sentiment Analysis
- **Distress**: unbearable, terrible, emergency, ER, admitted, life-threatening, excruciating, agony
- **Concern**: worried, scared, should I stop, is this normal, anyone else, side effect
- **Positive**: better, improved, working well
- **Neutral**: default

#### Geography Extraction
- Matches against **60+ Indian cities**: Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, Lucknow, Surat, Chandigarh, Kochi, Thiruvananthapuram, and more
- Also reads Reddit post flair text for location hints
- Falls back to "India" if no city detected

---

### 4. PII / PHI Detection & Redaction (DPDP Act Compliance)

Every post is scanned for PII **before** storage. Original text is never persisted — only the redacted version and a SHA-256 deduplication hash.

| Pattern | Description |
|---|---|
| `email` | Standard email addresses |
| `phone_number` | Indian mobile numbers (+91 format and 10-digit) |
| `aadhaar_pattern` | 12-digit Aadhaar numbers (starting 2–9) |
| `pan_number` | PAN card format (AAAAA0000A) |
| `name_pattern` | "my name is / I am / I'm [Name]" |
| `mrn` | Medical Record Numbers (MRN, Patient ID, Reg No) |
| `hospital_id` | UHID, OPD, IPD identifiers |
| `url_with_profile` | URLs containing `/u/username` |

Detected PII is replaced with `[TYPE_REDACTED]` tokens. Every redaction event is logged to the PII Audit Log with timestamp, source, PII types, action, and SHA-256 hash.

---

### 5. PRR-Based Alert Generation

Alerts are auto-generated using a simplified **Proportional Reporting Ratio (PRR)** calculation — the same disproportionality measure used by WHO-UMC and EMA.

- An alert fires when **≥2 signals share the same drug + ADR pair**
- PRR is calculated as: `observed proportion / expected baseline (0.01)`
- Alerts above PRR 2.0 (WHO-UMC threshold) are flagged
- Each alert includes: drug, ADR, PRR score, report count, geography, evidence signal IDs
- Severity: critical (PRR ≥ 5) · high (PRR ≥ 3) · moderate (PRR ≥ 2)
- Duplicate prevention: existing open alerts for the same drug+ADR are updated (report count incremented) rather than creating duplicates
- Alert IDs use a monotonic sequence counter to guarantee uniqueness even during batch ingestion

Alert actions available:
- **Acknowledge** — moves to acknowledged state
- **Mark Resolved** — closes the alert
- **Escalate to CDSCO** — (UI action, extensible to email/webhook)
- **Export Report** — (UI action, extensible to PDF/CIOMS-I format)

---

### 6. Agentic Source Onboarding

A non-technical analyst can onboard any health forum as a new data source by pasting a URL — no engineering required.

**Pipeline (5 steps):**

1. **Fetch & Render** — HTTP fetch with `SentinelStream/1.0` User-Agent, robots.txt compliant, 10s timeout
2. **DOM Analysis** — Sends first 6,000 chars of HTML to **Gemini 1.5 Flash** with a structured prompt asking for CSS selectors
3. **Schema Generation** — Gemini returns: `postContainer`, `authorField`, `timestampField`, `bodyField`, `titleField`, `replyField`, `paginationPattern`, `detectedLanguage`, `validationScore`, `reasoning`
4. **Validation** — Score ≥ 70% = PASS; below = WARN with manual review recommendation
5. **Registration** — Adapter committed to engine registry with full reasoning trace visible to analyst

**Fallback heuristics** (when no Gemini key or Gemini fails):
- Discourse: `.topic-post`, `.cooked` (score: 88%)
- phpBB: `.post`, `.content` (score: 85%)
- vBulletin: `.postbit`, `.postcontent` (score: 82%)
- WordPress: `.comment`, `.comment-body` (score: 75%)
- StackExchange: `.question-summary`, `.excerpt` (score: 90%)
- Reddit: `.Post`, `[data-click-id='text']` (score: 92%)
- Quora: `.q-box`, `.q-text p` (score: 70%)

**Indian language detection**: Unicode range matching for Hindi (U+0900–U+097F), Tamil (U+0B80–U+0BFF), Telugu (U+0C00–U+0C7F)

---

### 7. Analytics Dashboard

Real-time analytics computed from live signal data:

- **Signal Volume Trend** — 7-day bar chart grouped by drug
- **Source Distribution** — breakdown by Reddit / OpenFDA / Twitter with percentage bars
- **Top ADRs with PRR** — ranked by report count, colour-coded by PRR severity (green < 3, amber 3–5, red ≥ 5)
- **Geographic Distribution** — horizontal bar chart of Indian cities
- **OpenFDA FAERS Historical Stats** — total historical report count + top 6 reactions per drug from the FDA database

---

### 8. Signal Feed

Full filterable feed of all ingested adverse event signals:

- Filter by: Severity · Source · Status
- Each signal shows: drug → ADR, source icon, subreddit, geography, MedDRA code, confidence %, upvote count, timestamp
- Click any signal to open a detail panel with all NLP fields, full redacted post text, and a direct link to the original post
- Actions: **Escalate** · **Mark Reviewed**
- Status lifecycle: `new` → `escalated` / `reviewed` / `dismissed`

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects; seeds default project + triggers initial ingestion on first call |
| `POST` | `/api/projects` | Create a new project; triggers background ingestion immediately |
| `GET` | `/api/signals` | List signals; filterable by `projectId`, `severity`, `status`, `source`; `refresh=true` triggers live fetch |
| `PATCH` | `/api/signals` | Update signal status (`escalated`, `reviewed`, `dismissed`) |
| `GET` | `/api/analytics` | Computed analytics: trend, PRR, source breakdown, geography, OpenFDA stats |
| `GET` | `/api/alerts` | List all alerts |
| `PATCH` | `/api/alerts` | Update alert status (`acknowledged`, `resolved`) |
| `GET` | `/api/sources` | List registered data sources |
| `POST` | `/api/sources` | Trigger agentic onboarding for a new URL |
| `GET` | `/api/pii` | PII audit log with total redaction count |
| `POST` | `/api/ingest` | Manually trigger ingestion for a specific project and source set |

---

## Environment Variables

Create `my-app/.env.local`:

```env
# Reddit — no auth needed (public JSON API works without keys)
REDDIT_USER_AGENT=SentinelStream/1.0 (pharmacovigilance research)

# Twitter/X API v2 Bearer Token — leave blank to skip Twitter ingestion
# Get from: https://developer.twitter.com/en/portal/dashboard
TWITTER_BEARER_TOKEN=

# Gemini API Key — for agentic source onboarding DOM analysis
# Falls back to heuristic CSS selector detection if not set
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here

# OpenFDA API Key — optional, increases rate limit from 40 to 240 req/min
# Get from: https://open.fda.gov/apis/authentication/
OPENFDA_API_KEY=your_openfda_key_here
```

**What works without any keys:**
- Reddit ingestion (public JSON API, no auth)
- OpenFDA FAERS ingestion (free tier, 40 req/min)
- Agentic onboarding (heuristic fallback)
- All NLP, PII detection, alert generation, analytics

---

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── alerts/route.ts        # GET alerts, PATCH status
│   │   ├── analytics/route.ts     # Computed analytics + OpenFDA stats
│   │   ├── ingest/route.ts        # Manual ingestion trigger
│   │   ├── pii/route.ts           # PII audit log
│   │   ├── projects/route.ts      # CRUD projects + auto-ingestion
│   │   ├── signals/route.ts       # Signal feed + status updates
│   │   └── sources/route.ts       # Source registry + agentic onboarding
│   ├── components/
│   │   ├── AppShell.tsx           # Layout: sidebar + topbar + mobile drawer
│   │   └── Sidebar.tsx            # Navigation with live badge counts
│   ├── lib/
│   │   ├── agent.ts               # Gemini 1.5 Flash agentic DOM analyzer
│   │   ├── nlp.ts                 # Drug NER, ADR NER, MedDRA mapping, PII detection
│   │   ├── openfda.ts             # OpenFDA FAERS ingestion engine
│   │   ├── reddit.ts              # Reddit public JSON API ingestion engine
│   │   ├── store.ts               # In-memory data store + default project seed
│   │   └── twitter.ts             # Twitter API v2 ingestion engine
│   ├── alerts/page.tsx            # Alerts page
│   ├── analytics/page.tsx         # Analytics dashboard
│   ├── dashboard/page.tsx         # Main dashboard
│   ├── pii-audit/page.tsx         # PII audit log
│   ├── projects/page.tsx          # Project management
│   ├── signals/page.tsx           # Signal feed
│   ├── sources/page.tsx           # Source onboarding
│   ├── globals.css                # Design system (dark theme, components)
│   └── layout.tsx                 # Root layout
├── .env.local                     # API keys (not committed)
└── package.json
```

---

## Data Flow

```
Reddit / OpenFDA / Twitter
        │
        ▼
  Ingestion Engine
  (reddit.ts / openfda.ts / twitter.ts)
        │
        ▼
  NLP Pipeline (nlp.ts)
  ├── PII Detection & Redaction
  ├── Drug NER (500+ aliases)
  ├── ADR NER (80+ MedDRA terms)
  ├── AE Classification (drug + ADR required)
  ├── Confidence Scoring
  ├── Sentiment Analysis
  └── Geography Extraction
        │
        ▼
  In-Memory Store (store.ts)
  ├── signalStore (max 500, FIFO)
  ├── alertStore (PRR auto-generation)
  ├── piiStore (audit log)
  └── projectStore (counters updated)
        │
        ▼
  API Routes → Next.js Frontend
```

---

## Indian Context & Compliance

- **MedDRA v26.1** — LLT to PT mapping compatible with PvPI reporting formats
- **DPDP Act** — PII redacted at ingestion, originals never stored, SHA-256 hash for dedup
- **Indian drug brands** — Glycomet, Obimet, Crocin, Brufen, Ecosprin, Pantocid, Amlong, and more in the drug dictionary
- **Indian cities** — 60+ cities for geographic signal clustering
- **Indian ID patterns** — Aadhaar, PAN, +91 mobile numbers in PII detection
- **Indian health subreddits** — `r/india`, `r/IndianHealthcare`, `r/india_medical` monitored by default
- **Latency tiers** — Real-time for AIIMS-level deployments, weekly digest for district health offices on thin connections

---

## Getting Started

```bash
# 1. Install dependencies
cd my-app
npm install

# 2. Add API keys (optional — works without any keys)
# Edit my-app/.env.local

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
# The default Metformin project starts ingesting automatically
```

The dashboard will show a loading state for 15–30 seconds while the first ingestion run completes, then populate with real signals from Reddit and OpenFDA FAERS.

---

## Roadmap (Production)

- PostgreSQL + TimescaleDB for persistent time-series signal storage
- Kafka event bus between ingestion and analysis layers
- scispaCy + UMLS linker for production-grade biomedical NER
- Playwright-based crawler for Quora, 1mg reviews, regional language forums
- CIOMS-I / E2B(R3) export for direct PvPI submission
- Helm chart for Kubernetes deployment
- Webhook / email alerts for CDSCO escalation
- Multi-tenant support for hospital pharmacy & therapeutics committees
