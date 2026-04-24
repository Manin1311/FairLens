"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Plus, LogOut, BarChart3, AlertTriangle,
  CheckCircle2, Clock, Trash2, FileText, Zap, Sun, Moon,
  TrendingUp, Activity, Shield, Menu, X
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auditAPI, reportAPI } from "@/lib/api";

interface Audit {
  id: number; name: string; dataset_name: string;
  total_rows: number; overall_risk: string;
  overall_score: number; status: string; created_at: string;
}

const riskIcon = (risk: string) => {
  if (risk === "HIGH")   return <AlertTriangle size={13} className="text-red-400" />;
  if (risk === "MEDIUM") return <Clock size={13} className="text-yellow-400" />;
  return <CheckCircle2 size={13} className="text-green-400" />;
};
const riskClass = (risk: string) =>
  risk === "HIGH" ? "risk-high" : risk === "MEDIUM" ? "risk-medium" : "risk-low";
const scoreColor = (s: number) =>
  s < 50 ? "#f87171" : s < 75 ? "#fbbf24" : "#4ade80";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [audits, setAudits]     = useState<Audit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isDark, setIsDark]     = useState(true);
  const [sideOpen, setSideOpen] = useState(false);

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
    total:    audits.length,
    high:     audits.filter((a) => a.overall_risk === "HIGH").length,
    medium:   audits.filter((a) => a.overall_risk === "MEDIUM").length,
    low:      audits.filter((a) => a.overall_risk === "LOW").length,
    avgScore: audits.length
      ? Math.round(audits.reduce((s, a) => s + a.overall_score, 0) / audits.length) : 0,
  };

  const statCards = [
    { label: "Total Audits", val: stats.total,  color: "#3b82f6", icon: BarChart3,     bg: "rgba(59,130,246,0.12)" },
    { label: "High Risk",    val: stats.high,   color: "#ef4444", icon: AlertTriangle, bg: "rgba(239,68,68,0.12)" },
    { label: "Medium Risk",  val: stats.medium, color: "#f59e0b", icon: TrendingUp,    bg: "rgba(245,158,11,0.12)" },
    { label: "Low / Fair",   val: stats.low,    color: "#22c55e", icon: Shield,        bg: "rgba(34,197,94,0.12)" },
  ];

  /* ── Sidebar content (shared between desktop fixed + mobile drawer) ─────── */
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-2" onClick={() => setSideOpen(false)}>
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
        <Link href="/audit/new" onClick={() => setSideOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: "var(--text-secondary)" }}>
          <Plus size={17} /> New Audit
        </Link>
        <Link href="/demo" onClick={() => setSideOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: "var(--text-secondary)" }}>
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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10 hover:text-red-400"
          style={{ color: "var(--text-muted)" }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>

      {/* ── Desktop Sidebar (hidden on mobile) ─────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40"
        style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay + Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 z-40 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSideOpen(false)} />
            <motion.aside className="fixed left-0 top-0 bottom-0 w-72 flex flex-col z-50 md:hidden"
              style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}>
              <button className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"
                onClick={() => setSideOpen(false)}>
                <X size={18} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Mobile top bar */}
          <div className="flex items-center justify-between mb-6 md:mb-0">
            <button className="md:hidden p-2 rounded-lg" style={{ color: "var(--text-secondary)" }}
              onClick={() => setSideOpen(true)}>
              <Menu size={22} />
            </button>
            {/* Desktop header title (mobile title is part of row below) */}
            <div className="hidden md:block" /> {/* spacer */}
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
              </button>
              <Link href="/audit/new" className="btn-primary text-sm">
                <Plus size={15} /> <span className="hidden sm:inline">New Audit</span><span className="sm:hidden">New</span>
              </Link>
            </div>
          </div>

          {/* Page Header */}
          <div className="mb-6 md:mt-0 mt-2">
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Audit Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Track and manage your AI bias audits
              {stats.total > 0 && <span className="ml-2 text-blue-400 font-medium">· avg score {stats.avgScore}/100</span>}
            </p>
          </div>

          {/* Stat Cards — 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {statCards.map((s, i) => (
              <motion.div key={s.label} className="glass p-4 flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}>
                <div className="p-2 rounded-xl flex-shrink-0" style={{ background: s.bg }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl md:text-3xl font-black stat-number leading-none" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Audits List */}
          <div className="glass overflow-hidden">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: "var(--text-muted)" }} />
                <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Recent Audits</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                {audits.length} total
              </span>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
              </div>
            ) : audits.length === 0 ? (
              <div className="p-10 md:p-16 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(59,130,246,0.08)" }}>
                  <BarChart3 size={32} style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No audits yet</p>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Run your first bias analysis to get started.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/audit/new" className="btn-primary"><Plus size={16} /> Start First Audit</Link>
                  <Link href="/demo" className="btn-ghost"><Zap size={16} /> Try Demo</Link>
                </div>
              </div>
            ) : (
              <div>
                {/* Desktop table header — hidden on mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
                  <div className="col-span-5">Audit Name</div>
                  <div className="col-span-2">Dataset</div>
                  <div className="col-span-2 text-center">Risk</div>
                  <div className="col-span-1 text-center">Score</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {audits.map((audit, i) => (
                  <motion.div key={audit.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ borderBottom: "1px solid var(--border)" }}>

                    {/* ── Desktop row ────────────────────────────── */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center group transition-all hover:bg-white/[0.02]">
                      <div className="col-span-5 min-w-0">
                        <Link href={`/audit/${audit.id}`}>
                          <p className="font-medium text-sm truncate hover:text-blue-400 transition-colors"
                            style={{ color: "var(--text-primary)" }}>{audit.name}</p>
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
                        <div className="text-xl font-black stat-number" style={{ color: scoreColor(audit.overall_score) }}>
                          {audit.overall_score}
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/audit/${audit.id}`} className="p-2 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                          style={{ color: "var(--text-muted)" }} title="View results"><BarChart3 size={15} /></Link>
                        <button onClick={() => reportAPI.downloadPDF(audit.id)} title="Download PDF"
                          className="p-2 rounded-lg hover:bg-green-500/10 hover:text-green-400 transition-colors"
                          style={{ color: "var(--text-muted)" }}><FileText size={15} /></button>
                        <button onClick={() => deleteAudit(audit.id)} title="Delete"
                          className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          style={{ color: "var(--text-muted)" }}><Trash2 size={15} /></button>
                      </div>
                    </div>

                    {/* ── Mobile card ─────────────────────────────── */}
                    <div className="md:hidden px-4 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/audit/${audit.id}`}>
                            <p className="font-semibold text-sm leading-snug hover:text-blue-400 transition-colors"
                              style={{ color: "var(--text-primary)" }}>{audit.name}</p>
                          </Link>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {new Date(audit.created_at).toLocaleDateString()} · {audit.total_rows.toLocaleString()} rows
                          </p>
                        </div>
                        <div className="text-2xl font-black stat-number flex-shrink-0"
                          style={{ color: scoreColor(audit.overall_score) }}>
                          {audit.overall_score}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${riskClass(audit.overall_risk)}`}>
                            {riskIcon(audit.overall_risk)} {audit.overall_risk}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{audit.dataset_name}</span>
                        </div>
                        {/* Actions always visible on mobile */}
                        <div className="flex items-center gap-1">
                          <Link href={`/audit/${audit.id}`}
                            className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                            style={{ color: "var(--text-muted)" }}><BarChart3 size={15} /></Link>
                          <button onClick={() => reportAPI.downloadPDF(audit.id)}
                            className="p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                            style={{ color: "var(--text-muted)" }}><FileText size={15} /></button>
                          <button onClick={() => deleteAudit(audit.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            style={{ color: "var(--text-muted)" }}><Trash2 size={15} /></button>
                        </div>
                      </div>
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
