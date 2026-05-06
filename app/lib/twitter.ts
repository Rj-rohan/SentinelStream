// Twitter/X API v2 ingestion engine.
// Requires TWITTER_BEARER_TOKEN in .env.local

import { analyzeText, extractGeography, hashText } from "./nlp";
import { db_projects, db_signals, db_pii, db_sources, checkAndGenerateAlert } from "./db";
import type { Signal } from "./db";

interface Tweet {
  id: string; text: string; created_at: string; author_id: string;
  public_metrics?: { like_count: number; retweet_count: number };
}

async function searchTweets(query: string, maxResults = 20): Promise<Tweet[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return [];
  try {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: String(Math.min(maxResults, 100)),
      "tweet.fields": "created_at,author_id,public_metrics",
      sort_order: "recency",
    });
    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch { return []; }
}

export async function ingestTwitterForProject(projectId: string): Promise<number> {
  const project = db_projects.get(projectId);
  if (!project || !process.env.TWITTER_BEARER_TOKEN) return 0;

  let ingested = 0;

  for (const drug of project.drugs.slice(0, 3)) {
    const query = `(${drug} OR "${drug}") (side effect OR adverse OR reaction OR "stopped taking" OR "bad reaction" OR "allergic" OR "overdose")`;
    const tweets = await searchTweets(query, 15);

    for (const tweet of tweets) {
      const nlp = analyzeText(tweet.text, project.drugs, project.symptoms);
      if (!nlp.isAdverseEvent) continue;

      const sig: Signal = {
        id: `twitter_${tweet.id}`,
        projectId,
        source: "twitter",
        sourceUrl: `https://twitter.com/i/web/status/${tweet.id}`,
        originalText: tweet.text,
        redactedText: nlp.redactedText,
        author: "[REDACTED]",
        timestamp: tweet.created_at ?? new Date().toISOString(),
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
        geography: extractGeography(tweet.text),
      };

      if (db_signals.exists(sig.sourceUrl)) continue;
      db_signals.insert(sig);
      db_projects.incrementSignal(projectId, sig.severity === "critical");
      checkAndGenerateAlert(sig);

      if (nlp.piiDetected) {
        db_pii.insert({
          id: `pii_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
          source: "twitter",
          piiTypes: nlp.piiTypes,
          action: "redacted",
          hash: hashText(tweet.text),
          projectId,
        });
      }
      ingested++;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (ingested > 0) db_sources.syncUpdate("src_twitter", ingested);
  return ingested;
}
