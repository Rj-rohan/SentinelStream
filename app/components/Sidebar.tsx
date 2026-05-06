"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  {
    href: "/dashboard", label: "Dashboard",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    href: "/projects", label: "Projects",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    href: "/signals", label: "Signal Feed", badge: "signals",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: "/analytics", label: "Analytics",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: "/alerts", label: "Alerts", badge: "alerts",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    href: "/sources", label: "Source Onboarding",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  },
  {
    href: "/pii-audit", label: "PII Audit",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
];

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ signals: 0, alerts: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [s, a] = await Promise.all([fetch("/api/signals"), fetch("/api/alerts")]);
        const [sd, ad] = await Promise.all([s.json(), a.json()]);
        setCounts({
          signals: (sd.signals ?? []).filter((x: { status: string }) => x.status === "new").length,
          alerts: (ad.alerts ?? []).filter((x: { status: string }) => x.status === "open").length,
        });
      } catch {}
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #0a1e38" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 4px 16px rgba(79,70,229,0.4)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.4px", lineHeight: 1.2 }}>SentinelStream</div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 1, letterSpacing: "0.02em" }}>Pharmacovigilance AI</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm show-md" style={{ display: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Live pill */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #0a1e38" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: "rgba(16,185,129,0.06)", borderRadius: 9, border: "1px solid rgba(16,185,129,0.12)" }}>
          <span className="live-dot" />
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600, letterSpacing: "0.01em" }}>Live Monitoring Active</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 12px 6px" }}>Menu</div>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const count = item.badge ? counts[item.badge as keyof typeof counts] : 0;
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`nav-item${active ? " active" : ""}`}>
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {count > 0 && (
                <span style={{
                  background: item.badge === "alerts" ? "#ef4444" : "#3b82f6",
                  color: "#fff", borderRadius: 20, padding: "1px 7px",
                  fontSize: 10, fontWeight: 800, minWidth: 20, textAlign: "center",
                  boxShadow: item.badge === "alerts" ? "0 0 8px rgba(239,68,68,0.4)" : "0 0 8px rgba(59,130,246,0.4)",
                }}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #0a1e38" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(15,39,68,0.4)" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #059669, #0284c7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#fff",
            boxShadow: "0 0 0 2px rgba(5,150,105,0.3)",
          }}>SA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Safety Officer</div>
            <div style={{ fontSize: 10, color: "#334155" }}>CDSCO Zone 1</div>
          </div>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
