"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Plus, LogOut, BarChart3, AlertTriangle,
  CheckCircle2, Clock, Trash2, FileText, Zap, Sun, Moon,
  TrendingUp, Activity, Shield
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auditAPI, reportAPI } from "@/lib/api";

interface Audit {
  id: number; name: string; dataset_name: string;
  total_rows: number; overall_risk: string;
  overall_score: number; status: string; created_at: string;
}

const riskIcon = (risk: string) => {
  if (risk === "HIGH") return <AlertTriangle size={13} className="text-red-400" />;
  if (risk === "MEDIUM") return <Clock size={13} className="text-yellow-400" />;
  return <CheckCircle2 size={13} className="text-green-400" />;
};

const riskClass = (risk: string) =>
  risk === "HIGH" ? "risk-high" : risk === "MEDIUM" ? "risk-medium" : "risk-low";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);

  // Init theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fairlens_theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("light", !newDark);
    localStorage.setItem("fairlens_theme", newDark ? "dark" : "light");
  };

  useEffect(() => {
    if (!localStorage.getItem("fairlens_token")) { router.push("/login"); return; }
    auditAPI.list().then((r) => setAudits(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const deleteAudit = async (id: number) => {
    if (!confirm("Delete this audit?")) return;
    await auditAPI.delete(id);
    setAudits((a) => a.filter((x) => x.id !== id));
  };

  const stats = {
    total: audits.length,
    high: audits.filter((a) => a.overall_risk === "HIGH").length,
    medium: audits.filter((a) => a.overall_risk === "MEDIUM").length,
    low: audits.filter((a) => a.overall_risk === "LOW").length,
    avgScore: audits.length
      ? Math.round(audits.reduce((s, a) => s + a.overall_score, 0) / audits.length)
      : 0,
  };

  const statCards = [
    { label: "Total Audits", val: stats.total, color: "#3b82f6", icon: BarChart3, bg: "rgba(59,130,246,0.12)" },
    { label: "High Risk", val: stats.high, color: "#ef4444", icon: AlertTriangle, bg: "rgba(239,68,68,0.12)" },
    { label: "Medium Risk", val: stats.medium, color: "#f59e0b", icon: TrendingUp, bg: "rgba(245,158,11,0.12)" },
    { label: "Low / Fair", val: stats.low, color: "#22c55e", icon: Shield, bg: "rgba(34,197,94,0.12)" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col z-40"
        style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}>

        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22} />
            <span className="text-lg font-bold gradient-text-blue">FairLens</span>
          </Link>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>AI Bias Auditor</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-400 text-sm font-medium"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <BarChart3 size={17} /> Dashboard
          </div>
          <Link href="/audit/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Plus size={17} /> New Audit
          </Link>
          <Link href="/demo"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Zap size={17} /> Live Demo
          </Link>
        </nav>

        {/* User + Logout */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-blue-400 flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.organization || user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Audit Dashboard
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Track and manage your AI bias audits
                {stats.total > 0 && <span className="ml-2 text-blue-400 font-medium">· avg score {stats.avgScore}/100</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
              </button>
              <Link href="/audit/new" className="btn-primary">
                <Plus size={16} /> New Audit
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {statCards.map((s, i) => (
              <motion.div key={s.label}
                className="glass p-5 flex items-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: s.bg }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-3xl font-black stat-number" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Audits List */}
          <div className="glass overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: "var(--text-muted)" }} />
                <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Recent Audits</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                {audits.length} total
              </span>
            </div>

            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
              </div>
            ) : audits.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(59,130,246,0.08)" }}>
                  <BarChart3 size={36} style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No audits yet</p>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Run your first bias analysis to get started.</p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/audit/new" className="btn-primary">
                    <Plus size={16} /> Start First Audit
                  </Link>
                  <Link href="/demo" className="btn-ghost">
                    <Zap size={16} /> Try Demo
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
                  <div className="col-span-5">Audit Name</div>
                  <div className="col-span-2">Dataset</div>
                  <div className="col-span-2 text-center">Risk</div>
                  <div className="col-span-1 text-center">Score</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {audits.map((audit, i) => (
                  <motion.div key={audit.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center group transition-all duration-150"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="col-span-5 min-w-0">
                      <Link href={`/audit/${audit.id}`}>
                        <p className="font-medium text-sm truncate hover:text-blue-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                          {audit.name}
                        </p>
                      </Link>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(audit.created_at).toLocaleDateString()} · {audit.total_rows.toLocaleString()} rows
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{audit.dataset_name}</p>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${riskClass(audit.overall_risk)}`}>
                        {riskIcon(audit.overall_risk)} {audit.overall_risk}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="text-xl font-black stat-number"
                        style={{ color: audit.overall_score < 50 ? "#f87171" : audit.overall_score < 75 ? "#fbbf24" : "#4ade80" }}>
                        {audit.overall_score}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/audit/${audit.id}`}
                        className="p-2 rounded-lg transition-colors"
                        title="View results"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#60a5fa"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <BarChart3 size={15} />
                      </Link>
                      <button onClick={() => reportAPI.downloadPDF(audit.id)}
                        className="p-2 rounded-lg transition-colors"
                        title="Download PDF"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#4ade80"; (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <FileText size={15} />
                      </button>
                      <button onClick={() => deleteAudit(audit.id)}
                        className="p-2 rounded-lg transition-colors"
                        title="Delete audit"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
