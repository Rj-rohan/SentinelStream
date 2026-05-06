"use client";
import Sidebar from "./Sidebar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Dashboard", sub: "Real-time pharmacovigilance overview" },
  "/projects":  { title: "Projects",  sub: "Monitoring workspaces" },
  "/signals":   { title: "Signal Feed", sub: "NLP-extracted adverse event signals" },
  "/analytics": { title: "Analytics", sub: "PRR disproportionality & trends" },
  "/alerts":    { title: "Alerts",    sub: "Statistical signal alerts" },
  "/sources":   { title: "Source Onboarding", sub: "Agentic DOM analyzer" },
  "/pii-audit": { title: "PII Audit", sub: "DPDP Act compliance" },
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { title: "SentinelStream", sub: "" };

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#030712" }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 49,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        }} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="main-content" style={{
        flex: 1, marginLeft: "var(--sidebar-w)",
        display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0,
      }}>
        {/* Topbar */}
        <header className="topbar">
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="btn btn-ghost btn-icon btn-sm show-md" style={{ display: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Breadcrumb / title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>SentinelStream</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.2px" }}>{meta.title}</span>
            </div>
            {meta.sub && <div style={{ fontSize: 11, color: "#334155", marginTop: 1 }} className="hide-md">{meta.sub}</div>}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 20 }} className="hide-md">
              <span className="live-dot" />
              <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>Live</span>
            </div>
            <div style={{ padding: "5px 12px", background: "#060e1c", border: "1px solid #0a1e38", borderRadius: 20 }} className="hide-md">
              <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>
                {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 24px", overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
