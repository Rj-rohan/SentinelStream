"use client";
import AppShell from "../components/AppShell";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Project { id: string; name: string; description: string; drugs: string[]; conditions: string[]; symptoms: string[]; sources: string[]; subreddits: string[]; latency: string; status: string; signalCount: number; criticalCount: number; createdAt: string; lastActivity: string; }

const LATENCY: Record<string, string> = { realtime: "⚡ Real-time", daily: "📅 Daily", weekly: "📆 Weekly" };

export default function ProjectsPage() {
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [ingesting,  setIngesting]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [form, setForm] = useState({ name: "", description: "", drugs: "", conditions: "", symptoms: "", subreddits: "", latency: "daily", sources: ["reddit","openfda"] });

  const load = useCallback(async () => {
    const r = await fetch("/api/projects");
    const d = await r.json();
    setProjects(d.projects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSrc(s: string) {
    setForm(f => ({ ...f, sources: f.sources.includes(s) ? f.sources.filter(x => x !== s) : [...f.sources, s] }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSubmitting(true);
    if (!form.drugs.trim()) { setError("At least one drug name is required"); setSubmitting(false); return; }
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description, drugs: form.drugs.split(",").map(d=>d.trim()).filter(Boolean), conditions: form.conditions.split(",").map(d=>d.trim()).filter(Boolean), symptoms: form.symptoms.split(",").map(d=>d.trim()).filter(Boolean), subreddits: form.subreddits.split(",").map(d=>d.trim()).filter(Boolean), sources: form.sources, latency: form.latency }),
    });
    setSubmitting(false);
    if (res.ok) { setShowForm(false); setForm({ name:"",description:"",drugs:"",conditions:"",symptoms:"",subreddits:"",latency:"daily",sources:["reddit","openfda"] }); load(); }
  }

  async function ingest(id: string) {
    setIngesting(id);
    await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id }) });
    await load(); setIngesting(null);
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="fade-up">
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.6px" }}>Projects</h1>
            <p style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>Configure monitoring workspaces — each project ingests real data from Reddit & OpenFDA FAERS</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary fade-up">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card fade-up" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>Create Monitoring Project</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {[
                  { label: "Project Name *", key: "name", ph: "e.g. Aspirin Safety Watch" },
                  { label: "Description", key: "description", ph: "Brief description of monitoring scope" },
                  { label: "Drug Names * (comma-separated)", key: "drugs", ph: "Aspirin, Ecosprin, Disprin" },
                  { label: "Conditions (comma-separated)", key: "conditions", ph: "Hypertension, Heart Disease" },
                  { label: "Symptoms to Watch (comma-separated)", key: "symptoms", ph: "bleeding, tinnitus, stomach pain" },
                  { label: "Custom Subreddits (optional)", key: "subreddits", ph: "AskDocs, india, ChronicPain" },
                ].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                    <input className="input" value={form[key as keyof typeof form] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} required={key === "name" || key === "drugs"} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Sources</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[{ id: "reddit", label: "Reddit (free)" }, { id: "openfda", label: "OpenFDA FAERS (free)" }, { id: "twitter", label: "Twitter/X (key required)" }].map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => toggleSrc(id)} className={`chip${form.sources.includes(id) ? " active" : ""}`}>
                      {form.sources.includes(id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#334155", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monitoring Latency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["realtime","daily","weekly"].map(l => (
                    <button key={l} type="button" onClick={() => setForm({ ...form, latency: l })} className={`chip${form.latency === l ? " active" : ""}`}>{LATENCY[l]}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? <><span className="spinner" /> Creating…</> : "Create & Start Ingestion"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 280 }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>No projects yet</h3>
              <p style={{ fontSize: 13, color: "#334155", maxWidth: 340, lineHeight: 1.7 }}>Create a monitoring project to start ingesting real adverse drug reaction signals.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
            {projects.map((proj, i) => (
              <div key={proj.id} className="card-interactive fade-up" style={{ padding: 20, display: "flex", flexDirection: "column", animationDelay: `${i * 0.05}s` }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", flex: 1, marginRight: 10, letterSpacing: "-0.2px", lineHeight: 1.3 }}>{proj.name}</h3>
                  <span className={`badge badge-${proj.status}`}>{proj.status}</span>
                </div>
                {proj.description && <p style={{ fontSize: 12, color: "#334155", marginBottom: 12, lineHeight: 1.6 }}>{proj.description}</p>}

                {/* Drug tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                  {proj.drugs.map(d => <span key={d} className="tag tag-blue">{d}</span>)}
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  <div style={{ textAlign: "center", padding: "10px 6px", background: "#060e1c", borderRadius: 10, border: "1px solid #0a1e38" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.5px" }}>{proj.signalCount}</div>
                    <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 2, fontWeight: 600 }}>SIGNALS</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 6px", background: proj.criticalCount > 0 ? "rgba(239,68,68,0.06)" : "#060e1c", borderRadius: 10, border: `1px solid ${proj.criticalCount > 0 ? "rgba(239,68,68,0.15)" : "#0a1e38"}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: proj.criticalCount > 0 ? "#fca5a5" : "#f1f5f9", letterSpacing: "-0.5px" }}>{proj.criticalCount}</div>
                    <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 2, fontWeight: 600 }}>CRITICAL</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 6px", background: "#060e1c", borderRadius: 10, border: "1px solid #0a1e38" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6" }}>{LATENCY[proj.latency]}</div>
                    <div style={{ fontSize: 10, color: "#1e3a5f", marginTop: 2, fontWeight: 600 }}>LATENCY</div>
                  </div>
                </div>

                {/* Sources */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {proj.sources.map(s => <span key={s} className="tag tag-purple">{s}</span>)}
                </div>

                <div style={{ fontSize: 11, color: "#1e3a5f", marginBottom: 14 }}>
                  Last activity: {new Date(proj.lastActivity).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <Link href={`/signals?projectId=${proj.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, textDecoration: "none", justifyContent: "center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Signals
                  </Link>
                  <button onClick={() => ingest(proj.id)} disabled={ingesting === proj.id} className="btn btn-success btn-sm" style={{ flex: 1 }}>
                    {ingesting === proj.id ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Ingesting</> : <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      Ingest Now
                    </>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
