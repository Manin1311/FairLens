"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Loader2, BarChart3, Zap,
  XCircle, Scale, Users, Globe, TrendingUp, Info, ArrowRight
} from "lucide-react";
import { auditAPI } from "@/lib/api";

const RISK_COLOR: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };
const scoreColor = (s: number) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
const riskCls = (r: string) => r === "HIGH" ? "risk-high" : r === "MEDIUM" ? "risk-medium" : "risk-low";

/* ── Compliance Row ─────────────────────────────────────────────── */
function ComplianceRow({ attrs }: { attrs: any[] }) {
  const valid = attrs.filter((a: any) => !a.error);
  if (!valid.length) return null;
  const avgDPD = valid.reduce((s: number, a: any) => s + Math.abs(a.demographic_parity_difference ?? 0), 0) / valid.length;
  const avgDIR = valid.reduce((s: number, a: any) => s + (a.disparate_impact_ratio ?? 1), 0) / valid.length;
  const checks = [
    { name: "EU AI Act", pass: avgDPD < 0.1 && avgDIR > 0.8, detail: `DPD=${avgDPD.toFixed(3)}, DIR=${avgDIR.toFixed(3)}` },
    { name: "EEOC 4/5 Rule", pass: avgDIR >= 0.80, detail: `DIR=${avgDIR.toFixed(3)} (need ≥0.80)` },
    { name: "ISO 42001", pass: true, detail: "Audit documented" },
  ];
  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scale size={18} className="text-blue-400" />
        <h3 className="font-semibold text-white">Regulatory Compliance</h3>
        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${checks.filter(c=>c.pass).length===3?"risk-low":checks.filter(c=>c.pass).length>=2?"risk-medium":"risk-high"}`}>
          {checks.filter(c=>c.pass).length}/3 Passed
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {checks.map(c => (
          <div key={c.name} className="rounded-xl p-3" style={{ background: c.pass?"rgba(34,197,94,0.06)":"rgba(239,68,68,0.06)", border:`1px solid ${c.pass?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">{c.name}</span>
              {c.pass ? <CheckCircle2 size={14} className="text-green-400"/> : <XCircle size={14} className="text-red-400"/>}
            </div>
            <p className="text-xs" style={{ color: c.pass?"#86efac":"#fca5a5" }}>{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bias Drivers ───────────────────────────────────────────────── */
function BiasDrivers({ drivers }: { drivers: any[] }) {
  if (!drivers?.length) return null;
  const max = Math.max(...drivers.map((d:any) => d.contribution_pct || 0), 1);
  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-orange-400"/>
        <h3 className="font-semibold text-white">Why Bias Happens — Attribute Influence</h3>
      </div>
      <div className="space-y-4">
        {drivers.map((d: any, i: number) => {
          const pct = d.contribution_pct ?? 0;
          const color = RISK_COLOR[d.risk_level] ?? "#94a3b8";
          return (
            <div key={d.column}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{i+1}. {d.column}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${riskCls(d.risk_level)}`}>{d.risk_level}</span>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color }}>{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <motion.div className="h-2.5 rounded-full" style={{ background: color }}
                  initial={{ width: 0 }} animate={{ width: `${(pct/max)*100}%` }}
                  transition={{ duration: 0.8, delay: i*0.1 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Public Page ───────────────────────────────────────────── */
export default function PublicAuditPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    auditAPI.getPublic(Number(id))
      .then(r => setAudit(r.data))
      .catch(() => setError("This audit is not public or doesn't exist."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen hero-bg flex items-center justify-center">
      <Loader2 className="text-blue-400 animate-spin" size={36} />
    </div>
  );

  if (error || !audit) return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-6">
      <div className="glass p-10 text-center max-w-md">
        <XCircle className="text-red-400 mx-auto mb-4" size={40} />
        <h2 className="text-xl font-bold text-white mb-2">Audit Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">{error || "This audit doesn't exist or is no longer public."}</p>
        <Link href="/" className="btn-primary">Go to FairLens Home <ArrowRight size={16}/></Link>
      </div>
    </div>
  );

  const analysis = audit.raw_analysis || {};
  const attrs = analysis.attribute_results || [];
  const fixes = audit.fix_suggestions || [];
  const drivers = analysis.bias_drivers || [];
  const gemini = audit.gemini_explanation || {};
  const riskColor = RISK_COLOR[analysis.overall_risk_level] || "#94a3b8";

  return (
    <div className="min-h-screen hero-bg">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22}/>
            <span className="text-lg font-bold gradient-text-blue">FairLens</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Shared Audit</span>
            <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-4 md:px-6 max-w-5xl mx-auto space-y-6">

        {/* Shared badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium">
            <Globe size={14}/> Publicly Shared Audit
          </span>
        </div>

        {/* Risk Banner */}
        <motion.div className="glass p-6 flex flex-col md:flex-row items-center gap-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle cx="56" cy="56" r="48" fill="none" stroke={riskColor} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - (analysis.overall_fairness_score || 0) / 100)}`}
                className="transition-all duration-1000" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: riskColor }}>{analysis.overall_fairness_score}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-2 ${riskCls(analysis.overall_risk_level)}`}>
              {analysis.overall_risk_level === "HIGH" && <AlertTriangle size={14} />}
              {analysis.overall_risk_level === "LOW" && <CheckCircle2 size={14} />}
              {analysis.overall_risk_level} BIAS RISK
            </span>
            <h1 className="text-2xl font-bold text-white mb-1">{audit.name}</h1>
            <p className="text-slate-400 text-sm">
              {audit.dataset_name} · {audit.total_rows?.toLocaleString()} rows · {new Date(audit.created_at).toLocaleDateString()}
            </p>
          </div>
        </motion.div>

        {/* Compliance */}
        <ComplianceRow attrs={attrs.filter((a: any) => !a.error)} />

        {/* Bias Drivers */}
        <BiasDrivers drivers={drivers} />

        {/* Per-attribute cards */}
        {attrs.map((attr: any, i: number) => {
          if (attr.error) return null;
          const groupData = attr.group_statistics
            ? Object.entries(attr.group_statistics).map(([g, s]: any) => ({ group: g, rate: s.positive_rate, count: s.count }))
            : [];
          return (
            <div key={i} className="glass p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-white capitalize">{attr.sensitive_column}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${riskCls(attr.risk_level)}`}>{attr.risk_level}</span>
                <span className="text-slate-500 text-sm ml-auto">Score: <strong style={{ color: scoreColor(attr.fairness_score) }}>{attr.fairness_score}/100</strong></span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label:"DPD", val: attr.demographic_parity_difference, bad: Math.abs(attr.demographic_parity_difference??0)>0.1 },
                  { label:"EOD", val: attr.equalized_odds_difference, bad: Math.abs(attr.equalized_odds_difference??0)>0.1 },
                  { label:"DIR", val: attr.disparate_impact_ratio, bad: (attr.disparate_impact_ratio??1)<0.8 },
                  { label:"Bias %", val: attr.bias_contribution_pct, bad: (attr.bias_contribution_pct??0)>20, suffix:"%" },
                ].map(m => (
                  <div key={m.label} className="glass-light p-3 text-center">
                    <div className={`text-xl font-bold stat-number ${m.bad?"text-red-400":"text-green-400"}`}>
                      {m.val != null ? (m.suffix ? `${m.val.toFixed(1)}%` : m.val.toFixed(3)) : "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
              {groupData.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={groupData}>
                    <XAxis dataKey="group" tick={{ fill:"#94a3b8", fontSize:12 }}/>
                    <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} domain={[0,100]}/>
                    <Tooltip 
                      contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8 }}
                      itemStyle={{ color: "#e2e8f0" }}
                      labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                      formatter={(v:any) => [`${v}%`,"Positive Rate"]}/>
                    <Bar dataKey="rate" radius={[6,6,0,0]}>
                      {groupData.map((_:any,j:number) => <Cell key={j} fill={j===0?"#3b82f6":j===1?"#a78bfa":"#34d399"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}

        {/* Gemini Explanation */}
        {gemini?.tldr && (
          <div className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400"/>
              <h3 className="font-semibold text-white">Gemini AI Analysis</h3>
            </div>
            <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
              style={{ background:"rgba(250,204,21,0.08)", border:"1px solid rgba(250,204,21,0.2)" }}>
              <span className="text-2xl flex-shrink-0">{gemini.risk_emoji || "⚡"}</span>
              <div>
                <div className="text-xs font-bold text-yellow-400 mb-1 uppercase tracking-wider">Verdict</div>
                <p className="text-sm font-semibold text-white leading-relaxed">{gemini.tldr}</p>
              </div>
            </div>
            {gemini.key_findings?.length > 0 && (
              <ul className="space-y-2 mb-4">
                {gemini.key_findings.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {(gemini.who_is_affected || gemini.real_world_consequence) && (
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                {gemini.who_is_affected && (
                  <div className="rounded-xl p-3" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <div className="text-xs font-bold text-red-400 mb-1">Who Is Affected</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{gemini.who_is_affected}</p>
                  </div>
                )}
                {gemini.real_world_consequence && (
                  <div className="rounded-xl p-3" style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)" }}>
                    <div className="text-xs font-bold text-yellow-400 mb-1">Real-World Consequence</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{gemini.real_world_consequence}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fix Suggestions */}
        {fixes.length > 0 && (
          <div className="glass p-6">
            <h3 className="font-semibold text-white mb-4">Recommended Fixes</h3>
            <div className="space-y-3">
              {fixes.map((fix: any, i: number) => (
                <div key={i} className="metric-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-white">{fix.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${riskCls(fix.priority)}`}>{fix.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{fix.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="glass p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Want to Audit Your Own AI?</h3>
          <p className="text-slate-400 mb-6">Sign up free and upload your own dataset for a full bias audit.</p>
          <Link href="/register" className="btn-primary text-base px-8 py-3 glow-blue">
            Create Free Account <ArrowRight size={18}/>
          </Link>
        </div>
      </div>
    </div>
  );
}
