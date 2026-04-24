"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import {
  ShieldCheck, Zap, Loader2, AlertTriangle, ArrowRight,
  TrendingUp, CheckCircle2, XCircle, Scale, Users, Globe,
  Wand2, Info, FileText
} from "lucide-react";
import { auditAPI } from "@/lib/api";

const DEMOS = [
  { key: "compas",        label: "COMPAS Recidivism", tag: "Criminal Justice", desc: "Racial bias in criminal risk scoring used across US courts" },
  { key: "adult_income",  label: "Adult Income",      tag: "Employment",       desc: "Gender bias in income prediction (UCI ML dataset)" },
  { key: "german_credit", label: "German Credit",     tag: "Finance",          desc: "Age & gender bias in loan approval decisions" },
];

const RISK_COLOR: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e", ERROR: "#94a3b8" };

/* ── helpers ──────────────────────────────────────────────────────────────── */
const riskCls = (r: string) => r === "HIGH" ? "risk-high" : r === "MEDIUM" ? "risk-medium" : "risk-low";
const scoreColor = (s: number) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";

/* ── Compliance mini-panel ─────────────────────────────────────────────────── */
function ComplianceRow({ attrs }: { attrs: any[] }) {
  const valid = attrs.filter((a: any) => !a.error);
  if (!valid.length) return null;
  const avgDPD = valid.reduce((s: number, a: any) => s + Math.abs(a.demographic_parity_difference ?? 0), 0) / valid.length;
  const avgDIR = valid.reduce((s: number, a: any) => s + (a.disparate_impact_ratio ?? 1), 0) / valid.length;
  const checks = [
    { name: "EU AI Act",     pass: avgDPD < 0.1 && avgDIR > 0.8, detail: `DPD=${avgDPD.toFixed(3)}, DIR=${avgDIR.toFixed(3)}` },
    { name: "EEOC 4/5 Rule", pass: avgDIR >= 0.80,                detail: `DIR=${avgDIR.toFixed(3)} (need ≥0.80)` },
    { name: "ISO 42001",     pass: true,                           detail: "Audit documented" },
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

/* ── Bias Drivers panel ────────────────────────────────────────────────────── */
function BiasDrivers({ drivers }: { drivers: any[] }) {
  if (!drivers?.length) return null;
  const max = Math.max(...drivers.map((d:any) => d.contribution_pct || 0), 1);
  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={18} className="text-orange-400"/>
        <h3 className="font-semibold text-white">Why Bias Happens — Attribute Influence</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">Ranked</span>
      </div>
      <p className="text-sm text-slate-400 mb-4">Cramér&apos;s V — how strongly each attribute statistically drives unequal outcomes.</p>
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
      <div className="mt-4 p-3 rounded-xl text-xs text-slate-400"
        style={{ background:"rgba(251,146,60,0.06)", border:"1px solid rgba(251,146,60,0.15)" }}>
        <strong className="text-orange-400">Interpretation: </strong>
        The highest % attribute is your primary bias driver. Fix it first for maximum impact.
      </div>
    </div>
  );
}

/* ── What-If Simulator ─────────────────────────────────────────────────────── */
function WhatIf({ attrs, overall }: { attrs: any[]; overall: number }) {
  const [removed, setRemoved] = useState<string|null>(null);
  const valid = attrs.filter((a:any) => typeof a.fairness_score === "number");
  if (valid.length < 2) return null;
  const remaining = removed ? valid.filter((a:any) => a.sensitive_column !== removed) : valid;
  const sim = remaining.length ? Math.round(remaining.reduce((s:number,a:any)=>s+a.fairness_score,0)/remaining.length) : 100;
  const delta = sim - overall;
  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 size={18} className="text-purple-400"/>
        <h3 className="font-semibold text-white">What-If Simulator</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">Interactive</span>
      </div>
      <p className="text-sm text-slate-400 mb-4">Click an attribute to simulate removing it. See how fairness score changes.</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {valid.map((a:any) => {
          const isR = removed === a.sensitive_column;
          return (
            <button key={a.sensitive_column} onClick={() => setRemoved(isR?null:a.sensitive_column)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{ background: isR?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.04)", borderColor: isR?"rgba(167,139,250,0.5)":"rgba(255,255,255,0.1)", color: isR?"#c4b5fd":"#94a3b8", textDecoration: isR?"line-through":"none" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: RISK_COLOR[a.risk_level]||"#94a3b8" }} />
              {a.sensitive_column} <span className="text-xs opacity-60">({a.fairness_score})</span>
            </button>
          );
        })}
        {removed && <button onClick={()=>setRemoved(null)} className="px-3 py-2 rounded-xl text-xs text-slate-500 border border-white/10">↺ Reset</button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Current Score</div>
          <div className="text-4xl font-black stat-number" style={{ color: scoreColor(overall) }}>{overall}</div>
        </div>
        <div className="rounded-xl p-4 text-center transition-all duration-500"
          style={{ background: removed?(delta>0?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)"):"rgba(255,255,255,0.03)", border:`1px solid ${removed?(delta>0?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"):"rgba(255,255,255,0.08)"}` }}>
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{removed?`Without "${removed}"`:"Select to Simulate"}</div>
          <motion.div key={sim} className="text-4xl font-black stat-number"
            style={{ color: removed?scoreColor(sim):"#475569" }}
            initial={{ scale:0.75, opacity:0 }} animate={{ scale:1, opacity:1 }}
            transition={{ type:"spring", stiffness:320, damping:20 }}>
            {removed ? sim : "—"}
          </motion.div>
          {removed && <div className="text-xs font-semibold mt-1" style={{ color: scoreColor(sim) }}>{delta>0?`+${delta} improvement`:`${delta} pts`}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Main demo content ─────────────────────────────────────────────────────── */
function DemoContent() {
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get("dataset") || "");
  const [result, setResult]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { if (params.get("dataset")) runDemo(params.get("dataset")!); }, []);

  const runDemo = async (key: string) => {
    setSelected(key); setResult(null); setError(""); setLoading(true);
    try { const res = await auditAPI.runDemo(key); setResult(res.data); }
    catch (e: any) { setError(e.response?.data?.detail || "Demo dataset not available."); }
    finally { setLoading(false); }
  };

  const analysis = result?.analysis ?? {};
  const attrs    = analysis.attribute_results ?? [];
  const fixes    = result?.fix_suggestions ?? [];
  const drivers  = analysis.bias_drivers ?? [];

  return (
    <div className="pt-24 pb-12 px-4 md:px-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-medium mb-4">
          <Zap size={14}/> Live Demo — No Login Required
        </span>
        <h1 className="text-4xl font-bold text-white mb-3">See FairLens in Action</h1>
        <p className="text-slate-400 max-w-xl mx-auto">Pick a real-world dataset with known biases. Watch FairLens detect discrimination in seconds.</p>
      </div>

      {/* Dataset selector */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {DEMOS.map(d => (
          <motion.button key={d.key} onClick={() => runDemo(d.key)} whileHover={{ y:-2 }} whileTap={{ scale:0.98 }}
            className={`glass p-5 text-left transition-all border ${selected===d.key?"border-blue-500/50 bg-blue-500/5":"border-white/5 hover:border-blue-500/30"}`}>
            <div className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">{d.tag}</div>
            <div className="font-semibold text-white mb-1">{d.label}</div>
            <div className="text-xs text-slate-500">{d.desc}</div>
            {selected===d.key && loading && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400">
                <Loader2 size={12} className="animate-spin"/> Running analysis...
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle size={16}/> {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-6">

          {/* Risk summary */}
          <div className="glass p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-5xl font-black stat-number" style={{ color: RISK_COLOR[analysis.overall_risk_level] }}>
                {analysis.overall_fairness_score}
              </div>
              <div className="text-slate-500 text-sm">/ 100</div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold inline-block ${riskCls(analysis.overall_risk_level)}`}>
                {analysis.overall_risk_level} RISK
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{DEMOS.find(d=>d.key===result.dataset)?.label}</h3>
              <p className="text-slate-400 text-sm mb-3">
                {analysis.total_rows?.toLocaleString()} rows · {analysis.columns_analyzed} attribute{analysis.columns_analyzed!==1?"s":""} analysed
              </p>
              {result.gemini_explanation && (
                <p className="text-slate-300 text-sm leading-relaxed">{result.gemini_explanation.split("\n\n")[0]}</p>
              )}
            </div>
          </div>

          {/* Compliance */}
          <ComplianceRow attrs={attrs} />

          {/* Bias Drivers */}
          <BiasDrivers drivers={drivers} />

          {/* What-If Simulator */}
          <WhatIf attrs={attrs} overall={analysis.overall_fairness_score ?? 0} />

          {/* Per-attribute metric cards */}
          {attrs.map((attr: any, i: number) => {
            if (attr.error) return (
              <div key={i} className="glass p-5 rounded-xl" style={{ border:"1px solid rgba(239,68,68,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={14} className="text-red-400"/>
                  <span className="text-sm font-semibold text-red-400">Analysis failed for &quot;{attr.sensitive_column}&quot;</span>
                </div>
                <p className="text-xs text-slate-500">{attr.error}</p>
              </div>
            );
            const groupData = attr.group_statistics
              ? Object.entries(attr.group_statistics).map(([g, s]: any) => ({ group: g, rate: s.positive_rate, count: s.count }))
              : [];
            return (
              <div key={i} className="glass p-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white capitalize">{attr.sensitive_column}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${riskCls(attr.risk_level)}`}>{attr.risk_level}</span>
                  <span className="text-slate-500 text-sm ml-auto">Fairness Score: <strong style={{ color: scoreColor(attr.fairness_score) }}>{attr.fairness_score}/100</strong></span>
                </div>

                {/* Most disadvantaged group */}
                {attr.most_disadvantaged_group && attr.most_advantaged_group && attr.most_disadvantaged_group !== attr.most_advantaged_group && (
                  <div className="rounded-xl p-3 mb-4 flex items-start gap-3"
                    style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0"/>
                    <p className="text-xs text-slate-300">
                      <span className="text-red-400 font-semibold">Most Disadvantaged: </span>
                      &quot;{attr.most_disadvantaged_group}&quot; gets{" "}
                      {attr.group_statistics?.[attr.most_disadvantaged_group]?.positive_rate}% positive rate vs{" "}
                      &quot;{attr.most_advantaged_group}&quot; ({attr.group_statistics?.[attr.most_advantaged_group]?.positive_rate}%)
                      {" "}— a {(attr.group_statistics?.[attr.most_advantaged_group]?.positive_rate - attr.group_statistics?.[attr.most_disadvantaged_group]?.positive_rate).toFixed(1)}% gap
                    </p>
                  </div>
                )}

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label:"Demographic Parity Diff.", val: attr.demographic_parity_difference, bad: Math.abs(attr.demographic_parity_difference??0)>0.1 },
                    { label:"Equalized Odds Diff.",     val: attr.equalized_odds_difference,       bad: Math.abs(attr.equalized_odds_difference??0)>0.1 },
                    { label:"Disparate Impact Ratio",   val: attr.disparate_impact_ratio,          bad: (attr.disparate_impact_ratio??1)<0.8 },
                    { label:"Bias Contribution",        val: attr.bias_contribution_pct,           bad: (attr.bias_contribution_pct??0)>20, suffix:"%" },
                  ].map(m => (
                    <div key={m.label} className="glass-light p-3 text-center">
                      <div className={`text-xl font-bold stat-number ${m.bad?"text-red-400":"text-green-400"}`}>
                        {m.val != null ? (m.suffix ? `${m.val.toFixed(1)}%` : m.val.toFixed(3)) : "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                      <div className={`text-xs mt-1 ${m.bad?"text-red-400":"text-green-400"}`}>
                        {m.val != null ? (m.bad?"✗ Biased":"✓ Fair") : "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Group chart */}
                {groupData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={groupData}>
                      <XAxis dataKey="group" tick={{ fill:"#94a3b8", fontSize:12 }}/>
                      <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} domain={[0,100]}/>
                      <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, color:"#e2e8f0" }}
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

          {/* Fix Suggestions */}
          {fixes.length > 0 && (
            <div className="glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-green-400"/>
                <h3 className="font-semibold text-white">Recommended Fixes</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">{fixes.length} actions</span>
              </div>
              <div className="space-y-4">
                {fixes.map((fix: any, i: number) => (
                  <div key={i} className="metric-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-white">{fix.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${riskCls(fix.priority)}`}>{fix.priority}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">{fix.description}</p>
                    <p className="text-xs text-slate-500"><span className="text-slate-400">Impact:</span> {fix.expected_impact}</p>
                    <p className="text-xs text-slate-500 mt-0.5"><span className="text-slate-400">Effort:</span> {fix.effort}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Gemini explanation */}
          {result.gemini_explanation && (
            <div className="glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-yellow-400"/>
                <h3 className="font-semibold text-white">Gemini AI Full Analysis</h3>
              </div>
              <div className="space-y-4">
                {result.gemini_explanation.split("\n\n").map((para: string, i: number) =>
                  para.trim() && <p key={i} className="text-sm text-slate-300 leading-relaxed">{para.trim()}</p>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="glass p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Want to Audit Your Own AI?</h3>
            <p className="text-slate-400 mb-6">Sign up free and upload your own dataset for a full bias audit with PDF report.</p>
            <Link href="/register" className="btn-primary text-base px-8 py-3 glow-blue">
              Create Free Account <ArrowRight size={18}/>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-screen hero-bg">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22}/>
            <span className="text-lg font-bold gradient-text-blue">FairLens</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>
      <Suspense fallback={<div className="pt-24 text-center"><Loader2 className="animate-spin text-blue-400 mx-auto mt-20" size={32}/></div>}>
        <DemoContent />
      </Suspense>
    </div>
  );
}
