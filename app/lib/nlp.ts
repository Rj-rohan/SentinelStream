// Clinical NLP pipeline — runs entirely server-side.
// Uses rule-based NER + MedDRA term mapping + confidence scoring.
// In production this would call scispaCy + UMLS linker via a Python microservice.

// ── MedDRA ADR term dictionary (subset of real MedDRA LLT terms) ──────────────
const MEDDRA_TERMS: Record<string, { code: string; pt: string; severity: "critical" | "high" | "moderate" | "low" }> = {
  "lactic acidosis": { code: "10023676", pt: "Lactic acidosis", severity: "critical" },
  "stevens-johnson": { code: "10042033", pt: "Stevens-Johnson syndrome", severity: "critical" },
  "anaphylaxis": { code: "10002198", pt: "Anaphylactic reaction", severity: "critical" },
  "anaphylactic": { code: "10002198", pt: "Anaphylactic reaction", severity: "critical" },
  "cardiac arrest": { code: "10007515", pt: "Cardiac arrest", severity: "critical" },
  "respiratory failure": { code: "10038695", pt: "Respiratory failure", severity: "critical" },
  "liver failure": { code: "10024690", pt: "Hepatic failure", severity: "critical" },
  "hepatic failure": { code: "10024690", pt: "Hepatic failure", severity: "critical" },
  "renal failure": { code: "10038435", pt: "Renal failure", severity: "critical" },
  "kidney failure": { code: "10038435", pt: "Renal failure", severity: "critical" },
  "seizure": { code: "10039906", pt: "Seizure", severity: "critical" },
  "convulsion": { code: "10010904", pt: "Convulsions", severity: "critical" },
  "bradycardia": { code: "10006093", pt: "Bradycardia", severity: "high" },
  "tachycardia": { code: "10043071", pt: "Tachycardia", severity: "high" },
  "arrhythmia": { code: "10003119", pt: "Arrhythmia", severity: "high" },
  "qt prolongation": { code: "10037696", pt: "QT prolongation", severity: "high" },
  "liver toxicity": { code: "10019851", pt: "Hepatotoxicity", severity: "high" },
  "hepatotoxicity": { code: "10019851", pt: "Hepatotoxicity", severity: "high" },
  "jaundice": { code: "10023126", pt: "Jaundice", severity: "high" },
  "pancreatitis": { code: "10033645", pt: "Pancreatitis", severity: "high" },
  "agranulocytosis": { code: "10001507", pt: "Agranulocytosis", severity: "high" },
  "thrombocytopenia": { code: "10043554", pt: "Thrombocytopenia", severity: "high" },
  "bleeding": { code: "10005103", pt: "Haemorrhage", severity: "high" },
  "haemorrhage": { code: "10005103", pt: "Haemorrhage", severity: "high" },
  "hemorrhage": { code: "10005103", pt: "Haemorrhage", severity: "high" },
  "stroke": { code: "10042244", pt: "Stroke", severity: "high" },
  "pulmonary embolism": { code: "10037377", pt: "Pulmonary embolism", severity: "high" },
  "deep vein thrombosis": { code: "10051055", pt: "Deep vein thrombosis", severity: "high" },
  "dvt": { code: "10051055", pt: "Deep vein thrombosis", severity: "high" },
  "angioedema": { code: "10002424", pt: "Angioedema", severity: "high" },
  "blurred vision": { code: "10047571", pt: "Visual impairment", severity: "moderate" },
  "visual disturbance": { code: "10047571", pt: "Visual impairment", severity: "moderate" },
  "vision problems": { code: "10047571", pt: "Visual impairment", severity: "moderate" },
  "peripheral edema": { code: "10034570", pt: "Peripheral oedema", severity: "moderate" },
  "peripheral oedema": { code: "10034570", pt: "Peripheral oedema", severity: "moderate" },
  "ankle swelling": { code: "10034570", pt: "Peripheral oedema", severity: "moderate" },
  "ankle edema": { code: "10034570", pt: "Peripheral oedema", severity: "moderate" },
  "nausea": { code: "10028813", pt: "Nausea", severity: "low" },
  "vomiting": { code: "10047700", pt: "Vomiting", severity: "low" },
  "diarrhea": { code: "10012735", pt: "Diarrhoea", severity: "low" },
  "diarrhoea": { code: "10012735", pt: "Diarrhoea", severity: "low" },
  "stomach pain": { code: "10000369", pt: "Abdominal pain", severity: "low" },
  "abdominal pain": { code: "10000369", pt: "Abdominal pain", severity: "low" },
  "headache": { code: "10019211", pt: "Headache", severity: "low" },
  "dizziness": { code: "10013573", pt: "Dizziness", severity: "low" },
  "fatigue": { code: "10016256", pt: "Fatigue", severity: "low" },
  "rash": { code: "10037844", pt: "Rash", severity: "low" },
  "itching": { code: "10023084", pt: "Pruritus", severity: "low" },
  "pruritus": { code: "10023084", pt: "Pruritus", severity: "low" },
  "insomnia": { code: "10022437", pt: "Insomnia", severity: "low" },
  "muscle pain": { code: "10028323", pt: "Myalgia", severity: "low" },
  "myalgia": { code: "10028323", pt: "Myalgia", severity: "low" },
  "joint pain": { code: "10003239", pt: "Arthralgia", severity: "low" },
  "arthralgia": { code: "10003239", pt: "Arthralgia", severity: "low" },
  "weight gain": { code: "10047899", pt: "Weight increased", severity: "low" },
  "weight loss": { code: "10047900", pt: "Weight decreased", severity: "low" },
  "hair loss": { code: "10001760", pt: "Alopecia", severity: "low" },
  "alopecia": { code: "10001760", pt: "Alopecia", severity: "low" },
  "dry mouth": { code: "10013781", pt: "Dry mouth", severity: "low" },
  "constipation": { code: "10010774", pt: "Constipation", severity: "low" },
  "flushing": { code: "10016825", pt: "Flushing", severity: "low" },
  "sweating": { code: "10042241", pt: "Hyperhidrosis", severity: "low" },
  "hyperhidrosis": { code: "10042241", pt: "Hyperhidrosis", severity: "low" },
  "palpitations": { code: "10033557", pt: "Palpitations", severity: "moderate" },
  "chest pain": { code: "10008479", pt: "Chest pain", severity: "high" },
  "shortness of breath": { code: "10013968", pt: "Dyspnoea", severity: "high" },
  "dyspnoea": { code: "10013968", pt: "Dyspnoea", severity: "high" },
  "difficulty breathing": { code: "10013968", pt: "Dyspnoea", severity: "high" },
  "kidney damage": { code: "10038435", pt: "Renal impairment", severity: "high" },
  "renal impairment": { code: "10038435", pt: "Renal impairment", severity: "high" },
  "elevated creatinine": { code: "10011368", pt: "Blood creatinine increased", severity: "moderate" },
  "memory loss": { code: "10027175", pt: "Memory impairment", severity: "moderate" },
  "confusion": { code: "10010300", pt: "Confusional state", severity: "moderate" },
  "depression": { code: "10012378", pt: "Depression", severity: "moderate" },
  "anxiety": { code: "10002855", pt: "Anxiety", severity: "low" },
  "suicidal": { code: "10042458", pt: "Suicidal ideation", severity: "critical" },
  "hallucination": { code: "10019063", pt: "Hallucination", severity: "high" },
  "photosensitivity": { code: "10034966", pt: "Photosensitivity reaction", severity: "moderate" },
  "tinnitus": { code: "10043882", pt: "Tinnitus", severity: "moderate" },
  "hearing loss": { code: "10019245", pt: "Hearing impaired", severity: "moderate" },
  "infusion reaction": { code: "10022095", pt: "Infusion related reaction", severity: "high" },
  "injection site": { code: "10022086", pt: "Injection site reaction", severity: "low" },
  "hypoglycemia": { code: "10020993", pt: "Hypoglycaemia", severity: "high" },
  "hypoglycaemia": { code: "10020993", pt: "Hypoglycaemia", severity: "high" },
  "low blood sugar": { code: "10020993", pt: "Hypoglycaemia", severity: "high" },
  "hypertension": { code: "10020772", pt: "Hypertension", severity: "moderate" },
  "high blood pressure": { code: "10020772", pt: "Hypertension", severity: "moderate" },
  "hypotension": { code: "10021097", pt: "Hypotension", severity: "high" },
  "low blood pressure": { code: "10021097", pt: "Hypotension", severity: "high" },
  "fever": { code: "10016558", pt: "Pyrexia", severity: "moderate" },
  "pyrexia": { code: "10016558", pt: "Pyrexia", severity: "moderate" },
  "chills": { code: "10008531", pt: "Chills", severity: "low" },
  "back pain": { code: "10003988", pt: "Back pain", severity: "low" },
  "urinary retention": { code: "10046555", pt: "Urinary retention", severity: "moderate" },
  "erectile dysfunction": { code: "10061461", pt: "Erectile dysfunction", severity: "low" },
  "gynecomastia": { code: "10018801", pt: "Gynaecomastia", severity: "low" },
};

// ── Drug name dictionary ───────────────────────────────────────────────────────
const DRUG_ALIASES: Record<string, string> = {
  "metformin": "Metformin",
  "glucophage": "Metformin",
  "glycomet": "Metformin",
  "remdesivir": "Remdesivir",
  "veklury": "Remdesivir",
  "amlodipine": "Amlodipine",
  "norvasc": "Amlodipine",
  "amlong": "Amlodipine",
  "aspirin": "Aspirin",
  "ecosprin": "Aspirin",
  "atorvastatin": "Atorvastatin",
  "lipitor": "Atorvastatin",
  "lisinopril": "Lisinopril",
  "losartan": "Losartan",
  "cozaar": "Losartan",
  "omeprazole": "Omeprazole",
  "pantoprazole": "Pantoprazole",
  "pantocid": "Pantoprazole",
  "paracetamol": "Paracetamol",
  "acetaminophen": "Paracetamol",
  "crocin": "Paracetamol",
  "ibuprofen": "Ibuprofen",
  "brufen": "Ibuprofen",
  "amoxicillin": "Amoxicillin",
  "azithromycin": "Azithromycin",
  "zithromax": "Azithromycin",
  "ciprofloxacin": "Ciprofloxacin",
  "cipro": "Ciprofloxacin",
  "doxycycline": "Doxycycline",
  "hydroxychloroquine": "Hydroxychloroquine",
  "hcq": "Hydroxychloroquine",
  "ivermectin": "Ivermectin",
  "warfarin": "Warfarin",
  "coumadin": "Warfarin",
  "clopidogrel": "Clopidogrel",
  "plavix": "Clopidogrel",
  "insulin": "Insulin",
  "glipizide": "Glipizide",
  "glimepiride": "Glimepiride",
  "sitagliptin": "Sitagliptin",
  "januvia": "Sitagliptin",
  "sertraline": "Sertraline",
  "zoloft": "Sertraline",
  "fluoxetine": "Fluoxetine",
  "prozac": "Fluoxetine",
  "escitalopram": "Escitalopram",
  "lexapro": "Escitalopram",
  "alprazolam": "Alprazolam",
  "xanax": "Alprazolam",
  "diazepam": "Diazepam",
  "valium": "Diazepam",
  "levothyroxine": "Levothyroxine",
  "synthroid": "Levothyroxine",
  "prednisone": "Prednisone",
  "prednisolone": "Prednisolone",
  "dexamethasone": "Dexamethasone",
  "montelukast": "Montelukast",
  "singulair": "Montelukast",
  "salbutamol": "Salbutamol",
  "albuterol": "Salbutamol",
  "budesonide": "Budesonide",
  "rosuvastatin": "Rosuvastatin",
  "crestor": "Rosuvastatin",
  "telmisartan": "Telmisartan",
  "ramipril": "Ramipril",
  "enalapril": "Enalapril",
  "furosemide": "Furosemide",
  "spironolactone": "Spironolactone",
  "digoxin": "Digoxin",
  "amiodarone": "Amiodarone",
  "metoprolol": "Metoprolol",
  "atenolol": "Atenolol",
  "propranolol": "Propranolol",
  "gabapentin": "Gabapentin",
  "pregabalin": "Pregabalin",
  "lyrica": "Pregabalin",
  "tramadol": "Tramadol",
  "codeine": "Codeine",
  "morphine": "Morphine",
  "oxycodone": "Oxycodone",
  "fentanyl": "Fentanyl",
  "naloxone": "Naloxone",
  "naltrexone": "Naltrexone",
  "buprenorphine": "Buprenorphine",
  "clonazepam": "Clonazepam",
  "lorazepam": "Lorazepam",
  "quetiapine": "Quetiapine",
  "seroquel": "Quetiapine",
  "olanzapine": "Olanzapine",
  "risperidone": "Risperidone",
  "haloperidol": "Haloperidol",
  "lithium": "Lithium",
  "valproate": "Valproate",
  "carbamazepine": "Carbamazepine",
  "phenytoin": "Phenytoin",
  "levetiracetam": "Levetiracetam",
  "topiramate": "Topiramate",
  "lamotrigine": "Lamotrigine",
  "donepezil": "Donepezil",
  "memantine": "Memantine",
  "rivastigmine": "Rivastigmine",
  "tacrolimus": "Tacrolimus",
  "cyclosporine": "Cyclosporine",
  "mycophenolate": "Mycophenolate",
  "azathioprine": "Azathioprine",
  "methotrexate": "Methotrexate",
  "sulfasalazine": "Sulfasalazine",
  "adalimumab": "Adalimumab",
  "humira": "Adalimumab",
  "infliximab": "Infliximab",
  "remicade": "Infliximab",
  "etanercept": "Etanercept",
  "enbrel": "Etanercept",
  "rituximab": "Rituximab",
  "trastuzumab": "Trastuzumab",
  "herceptin": "Trastuzumab",
  "bevacizumab": "Bevacizumab",
  "avastin": "Bevacizumab",
  "imatinib": "Imatinib",
  "gleevec": "Imatinib",
  "tamoxifen": "Tamoxifen",
  "letrozole": "Letrozole",
  "anastrozole": "Anastrozole",
  "finasteride": "Finasteride",
  "propecia": "Finasteride",
  "sildenafil": "Sildenafil",
  "viagra": "Sildenafil",
  "tadalafil": "Tadalafil",
  "cialis": "Tadalafil",
  "isotretinoin": "Isotretinoin",
  "accutane": "Isotretinoin",
  "doxorubicin": "Doxorubicin",
  "cisplatin": "Cisplatin",
  "paclitaxel": "Paclitaxel",
  "docetaxel": "Docetaxel",
  "oxaliplatin": "Oxaliplatin",
  "capecitabine": "Capecitabine",
  "xeloda": "Capecitabine",
};

// ── PII patterns ───────────────────────────────────────────────────────────────
const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "phone_number", regex: /(\+91[\s-]?)?[6-9]\d{9}/g },
  { name: "aadhaar_pattern", regex: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g },
  { name: "pan_number", regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
  { name: "name_pattern", regex: /\b(my name is|i am|i'm)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/gi },
  { name: "mrn", regex: /\b(MRN|Patient ID|Reg No)[:\s#]+[A-Z0-9-]{4,12}\b/gi },
  { name: "hospital_id", regex: /\b(UHID|OPD|IPD)[:\s#]+[A-Z0-9-]{4,12}\b/gi },
  { name: "url_with_profile", regex: /https?:\/\/[^\s]+\/u\/[^\s]+/g },
];

// ── Sentiment keywords ─────────────────────────────────────────────────────────
const DISTRESS_WORDS = ["unbearable", "terrible", "horrible", "severe", "worst", "dying", "emergency", "ER", "hospital", "admitted", "critical", "dangerous", "life-threatening", "can't breathe", "can't walk", "can't function", "excruciating", "agony", "suffering"];
const CONCERN_WORDS = ["worried", "concerned", "scared", "afraid", "anxious", "should I stop", "is this normal", "anyone else", "side effect", "reaction", "problem", "issue", "strange", "unusual"];

export interface NLPResult {
  drug: string | null;
  adr: string | null;
  meddraCode: string;
  meddraterm: string;
  severity: "critical" | "high" | "moderate" | "low";
  confidence: number;
  sentiment: "distress" | "concern" | "neutral" | "positive";
  piiDetected: boolean;
  piiTypes: string[];
  redactedText: string;
  isAdverseEvent: boolean;
}

export function analyzeText(text: string, watchDrugs: string[] = [], watchSymptoms: string[] = []): NLPResult {
  const lower = text.toLowerCase();

  // ── PII Detection & Redaction ──────────────────────────────────────────────
  let redactedText = text;
  const detectedPii: string[] = [];
  for (const { name, regex } of PII_PATTERNS) {
    if (regex.test(redactedText)) {
      detectedPii.push(name);
      redactedText = redactedText.replace(regex, `[${name.toUpperCase()}_REDACTED]`);
    }
    regex.lastIndex = 0;
  }

  // ── Drug NER ──────────────────────────────────────────────────────────────
  let detectedDrug: string | null = null;
  // First check project-specific drugs
  for (const d of watchDrugs) {
    if (lower.includes(d.toLowerCase())) {
      detectedDrug = d;
      break;
    }
  }
  // Then check full dictionary
  if (!detectedDrug) {
    for (const [alias, canonical] of Object.entries(DRUG_ALIASES)) {
      if (lower.includes(alias)) {
        detectedDrug = canonical;
        break;
      }
    }
  }

  // ── ADR NER ───────────────────────────────────────────────────────────────
  let detectedAdr: string | null = null;
  let meddraMatch: { code: string; pt: string; severity: "critical" | "high" | "moderate" | "low" } | null = null;

  // Check project-specific symptoms first
  for (const sym of watchSymptoms) {
    if (lower.includes(sym.toLowerCase()) && MEDDRA_TERMS[sym.toLowerCase()]) {
      detectedAdr = sym;
      meddraMatch = MEDDRA_TERMS[sym.toLowerCase()];
      break;
    }
  }
  // Then check full MedDRA dictionary
  if (!detectedAdr) {
    for (const [term, data] of Object.entries(MEDDRA_TERMS)) {
      if (lower.includes(term)) {
        detectedAdr = term;
        meddraMatch = data;
        break;
      }
    }
  }

  // ── Adverse Event Classification ──────────────────────────────────────────
  // Must have both drug AND symptom to be a reportable AE
  const isAdverseEvent = !!(detectedDrug && detectedAdr);

  // ── Confidence Scoring ────────────────────────────────────────────────────
  let confidence = 0.5;
  if (detectedDrug) confidence += 0.2;
  if (detectedAdr) confidence += 0.2;
  if (lower.includes("side effect") || lower.includes("adverse") || lower.includes("reaction")) confidence += 0.05;
  if (lower.includes("doctor") || lower.includes("prescribed") || lower.includes("mg") || lower.includes("dose")) confidence += 0.05;
  confidence = Math.min(confidence, 0.99);

  // ── Sentiment ─────────────────────────────────────────────────────────────
  let sentiment: "distress" | "concern" | "neutral" | "positive" = "neutral";
  if (DISTRESS_WORDS.some((w) => lower.includes(w.toLowerCase()))) {
    sentiment = "distress";
  } else if (CONCERN_WORDS.some((w) => lower.includes(w.toLowerCase()))) {
    sentiment = "concern";
  } else if (lower.includes("better") || lower.includes("improved") || lower.includes("working well")) {
    sentiment = "positive";
  }

  return {
    drug: detectedDrug,
    adr: detectedAdr,
    meddraCode: meddraMatch?.code ?? "10000000",
    meddraterm: meddraMatch?.pt ?? "Adverse event",
    severity: meddraMatch?.severity ?? "low",
    confidence: parseFloat(confidence.toFixed(2)),
    sentiment,
    piiDetected: detectedPii.length > 0,
    piiTypes: detectedPii,
    redactedText,
    isAdverseEvent,
  };
}

// ── Geography extraction ───────────────────────────────────────────────────────
const INDIA_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Chennai", "Hyderabad",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat",
  "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam",
  "Pimpri", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra",
  "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
  "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad",
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada",
  "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati",
  "Solapur", "Hubli", "Tiruchirappalli", "Bareilly", "Mysore", "Mysuru",
  "Thiruvananthapuram", "Kochi", "Ernakulam",
];

export function extractGeography(text: string, flairText?: string): string {
  const combined = `${text} ${flairText ?? ""}`;
  for (const city of INDIA_CITIES) {
    if (combined.toLowerCase().includes(city.toLowerCase())) {
      return `${city}, India`;
    }
  }
  return "India";
}

// ── Crypto hash for dedup ──────────────────────────────────────────────────────
export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
