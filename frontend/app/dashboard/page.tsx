"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Plus, LogOut, BarChart3, AlertTriangle,
  CheckCircle2, Clock, Trash2, FileText, Zap
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auditAPI, reportAPI } from "@/lib/api";

interface Audit {
  id: number; name: string; dataset_name: string;
  total_rows: number; overall_risk: string;
  overall_score: number; status: string; created_at: string;
}

const riskIcon = (risk: string) => {
  if (risk === "HIGH") return <AlertTriangle size={14} className="text-red-400" />;
  if (risk === "MEDIUM") return <Clock size={14} className="text-yellow-400" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const riskClass = (risk: string) =>
  risk === "HIGH" ? "risk-high" : risk === "MEDIUM" ? "risk-medium" : "risk-low";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

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
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 glass border-r border-white/5 flex flex-col z-40">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22} />
            <span className="text-lg font-bold gradient-text-blue">FairLens</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <BarChart3 size={18} /> Dashboard
          </div>
          <Link href="/audit/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
            <Plus size={18} /> New Audit
          </Link>
          <Link href="/demo"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
            <Zap size={18} /> Try Demo
          </Link>
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.organization || user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Track and manage all your AI bias audits</p>
            </div>
            <Link href="/audit/new" className="btn-primary">
              <Plus size={18} /> New Audit
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Audits", val: stats.total, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "High Risk", val: stats.high, color: "text-red-400", bg: "bg-red-500/10" },
              { label: "Medium Risk", val: stats.medium, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "Low Risk / Fair", val: stats.low, color: "text-green-400", bg: "bg-green-500/10" },
            ].map((s, i) => (
              <motion.div key={s.label} className="glass p-5"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}>
                <div className={`text-3xl font-bold stat-number ${s.color} mb-1`}>{s.val}</div>
                <div className="text-slate-500 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Audits List */}
          <div className="glass overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Audits</h2>
              <span className="text-xs text-slate-500">{audits.length} total</span>
            </div>
            {loading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
              </div>
            ) : audits.length === 0 ? (
              <div className="p-16 text-center">
                <BarChart3 className="text-slate-700 mx-auto mb-4" size={48} />
                <p className="text-slate-500 mb-4">No audits yet. Run your first bias analysis.</p>
                <Link href="/audit/new" className="btn-primary">
                  <Plus size={16} /> Start First Audit
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {audits.map((audit, i) => (
                  <motion.div key={audit.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-white text-sm truncate">{audit.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${riskClass(audit.overall_risk)}`}>
                          {riskIcon(audit.overall_risk)} {audit.overall_risk}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {audit.dataset_name} · {audit.total_rows.toLocaleString()} rows ·{" "}
                        {new Date(audit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold stat-number ${audit.overall_score < 50 ? "text-red-400" : audit.overall_score < 75 ? "text-yellow-400" : "text-green-400"}`}>
                        {audit.overall_score}
                      </div>
                      <div className="text-xs text-slate-600">/ 100</div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/audit/${audit.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <BarChart3 size={16} />
                      </Link>
                      <button onClick={() => reportAPI.downloadPDF(audit.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => deleteAudit(audit.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={16} />
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
