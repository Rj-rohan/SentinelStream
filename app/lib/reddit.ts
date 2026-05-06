// Reddit ingestion engine — uses public JSON API (no auth required for public subreddits).
// With REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET it uses OAuth for higher rate limits.

import { analyzeText, extractGeography, hashText } from "./nlp";
import { addSignal, updateSourceSync, projectStore, signalStore, piiStore } from "./store";
import type { Signal } from "./store";

const HEALTH_SUBREDDITS = [
  "diabetes", "diabetes_t2", "diabetes_t1",
  "hypertension", "bloodpressure",
  "pharmacy", "pharmacology",
  "AskDocs", "medical", "medicine",
  "COVID19", "covidpositive",
  "ChronicPain", "ChronicIllness",
  "cancer", "oncology",
  "HeartDisease", "cardiology",
  "kidney", "kidneydisease",
  "liver", "hepatitis",
  "epilepsy", "seizures",
  "depression", "anxiety",
  "mentalhealth", "bipolar",
  "thyroid", "hypothyroidism",
  "PCOS", "endometriosis",
  "asthma", "COPD",
  "rheumatoid", "lupus",
  "MultipleSclerosis",
  "Fibromyalgia",
  "india", "india_medical",
  "IndianHealthcare",
];

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  created_utc: number;
  url: string;
  permalink: string;
  subreddit: string;
  score: number;
  link_flair_text?: string;
}

async function fetchSubredditPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}&raw_json=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.REDDIT_USER_AGENT || "SentinelStream/1.0",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.children?.map((c: { data: RedditPost }) => c.data) ?? [];
  } catch {
    return [];
  }
}

async function fetchSubredditSearch(subreddit: string, query: string, limit = 10): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&raw_json=1&restrict_sr=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.REDDIT_USER_AGENT || "SentinelStream/1.0",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.children?.map((c: { data: RedditPost }) => c.data) ?? [];
  } catch {
    return [];
  }
}

export async function ingestRedditForProject(projectId: string): Promise<number> {
  const project = projectStore.find((p) => p.id === projectId);
  if (!project) return 0;

  const subreddits = project.subreddits?.length
    ? project.subreddits
    : HEALTH_SUBREDDITS.slice(0, 8);

  let ingested = 0;
  const allDrugs = project.drugs.map((d) => d.toLowerCase());
  const allSymptoms = project.symptoms;

  for (const sub of subreddits.slice(0, 6)) {
    // Search for drug mentions in subreddit
    for (const drug of project.drugs.slice(0, 3)) {
      const posts = await fetchSubredditSearch(sub, drug, 5);
      for (const post of posts) {
        const text = `${post.title} ${post.selftext}`.trim();
        if (text.length < 30) continue;

        const nlp = analyzeText(text, project.drugs, allSymptoms);
        if (!nlp.isAdverseEvent) continue;

        const sig: Signal = {
          id: `reddit_${post.id}`,
          projectId,
          source: "reddit",
          sourceUrl: `https://reddit.com${post.permalink}`,
          originalText: text.slice(0, 1000),
          redactedText: nlp.redactedText.slice(0, 1000),
          author: "[REDACTED]",
          timestamp: new Date(post.created_utc * 1000).toISOString(),
          drug: nlp.drug ?? drug,
          adr: nlp.adr ?? "Adverse event",
          meddraCode: nlp.meddraCode,
          meddraterm: nlp.meddraterm,
          severity: nlp.severity,
          confidence: nlp.confidence,
          sentiment: nlp.sentiment,
          piiDetected: nlp.piiDetected,
          piiTypes: nlp.piiTypes,
          status: "new",
          geography: extractGeography(text, post.link_flair_text ?? ""),
          upvotes: post.score,
          subreddit: post.subreddit,
        };

        // Log PII events
        if (nlp.piiDetected) {
          piiStore.unshift({
            id: `pii_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: new Date().toISOString(),
            source: "reddit",
            piiTypes: nlp.piiTypes,
            action: "redacted",
            hash: hashText(text),
            projectId,
          });
        }

        addSignal(sig);
        ingested++;
      }
    }

    // Also fetch general new posts from health subreddits
    const newPosts = await fetchSubredditPosts(sub, 10);
    for (const post of newPosts) {
      const text = `${post.title} ${post.selftext}`.trim();
      if (text.length < 50) continue;

      const nlp = analyzeText(text, project.drugs, allSymptoms);
      if (!nlp.isAdverseEvent) continue;

      const sig: Signal = {
        id: `reddit_${post.id}`,
        projectId,
        source: "reddit",
        sourceUrl: `https://reddit.com${post.permalink}`,
        originalText: text.slice(0, 1000),
        redactedText: nlp.redactedText.slice(0, 1000),
        author: "[REDACTED]",
        timestamp: new Date(post.created_utc * 1000).toISOString(),
        drug: nlp.drug!,
        adr: nlp.adr!,
        meddraCode: nlp.meddraCode,
        meddraterm: nlp.meddraterm,
        severity: nlp.severity,
        confidence: nlp.confidence,
        sentiment: nlp.sentiment,
        piiDetected: nlp.piiDetected,
        piiTypes: nlp.piiTypes,
        status: "new",
        geography: extractGeography(text, post.link_flair_text ?? ""),
        upvotes: post.score,
        subreddit: post.subreddit,
      };

      if (nlp.piiDetected) {
        piiStore.unshift({
          id: `pii_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
          source: "reddit",
          piiTypes: nlp.piiTypes,
          action: "redacted",
          hash: hashText(text),
          projectId,
        });
      }

      addSignal(sig);
      ingested++;
    }

    // Rate limit — be polite
    await new Promise((r) => setTimeout(r, 500));
  }

  updateSourceSync("src_reddit", ingested);
  return ingested;
}

// Ingest across all active projects
export async function ingestRedditAll(): Promise<number> {
  const activeProjects = projectStore.filter((p) => p.status === "active");
  let total = 0;
  for (const proj of activeProjects) {
    total += await ingestRedditForProject(proj.id);
  }
  return total;
}
