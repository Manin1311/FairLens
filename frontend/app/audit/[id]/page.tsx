"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend
} from "recharts";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, FileText,
  ChevronLeft, MessageSquare, Send, Loader2, BarChart3, Zap,
  XCircle, Scale, Users, Globe, Info, TrendingUp, Wand2
} from "lucide-react";
import { auditAPI, reportAPI } from "@/lib/api";

const RISK_COLOR: Record<string, string> = {
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e", ERROR: "#94a3b8"
};

/* ─── Compliance Panel ───────────────────────────────────────────────────── */
function CompliancePanel({ attrs }: { attrs: any[] }) {
  if (!attrs || attrs.length === 0) return null;

  // Aggregate across all attributes
  const avgDPD = attrs.reduce((s: number, a: any) => s + Math.abs(a.demographic_parity_difference ?? 0), 0) / attrs.length;
  const avgDIR = attrs.reduce((s: number, a: any) => s + (a.disparate_impact_ratio ?? 1), 0) / attrs.length;

  // Compliance rules
  const euAct = avgDPD < 0.1 && avgDIR > 0.8;
  const eeoc  = avgDIR >= 0.80;  // 4/5 (80%) rule
  const iso   = true;             // running the audit = assessed

  const badges = [
    {
      name: "EU AI Act",
      pass: euAct,
      desc: euAct
        ? "Meets high-risk AI fairness thresholds (DPD<0.1, DIR>0.8)"
        : `Non-compliant — DPD: ${avgDPD.toFixed(3)}, DIR: ${avgDIR.toFixed(3)}`,
      detail: "Art. 10 & Annex III — High-Risk AI Systems",
      icon: Scale,
      learnMore: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0206",
    },
    {
      name: "EEOC 4/5 Rule",
      pass: eeoc,
      desc: eeoc
        ? `Selection rate ratio ≥ 80% across groups (DIR: ${avgDIR.toFixed(3)})`
        : `Below 80% threshold — DIR: ${avgDIR.toFixed(3)} (need ≥ 0.80)`,
      detail: "US Equal Employment Opportunity Commission",
      icon: Users,
      learnMore: "https://www.eeoc.gov/laws/guidance/questions-and-answers-clarify-and-provide-common-interpretation-uniform-guidelines",
    },
    {
      name: "ISO 42001",
      pass: iso,
      desc: "AI bias risk assessed — audit documentation generated",
      detail: "AI Management System Standard — Bias Risk Assessment",
      icon: Globe,
      learnMore: "https://www.iso.org/standard/81230.html",
    },
  ];

  const passCount = badges.filter(b => b.pass).length;

  return (
    <motion.div className="mb-6 glass p-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-400" />
          <h2 className="font-semibold text-white">Regulatory Compliance</h2>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
          passCount === 3 ? "risk-low" : passCount >= 2 ? "risk-medium" : "risk-high"
        }`}>
          {passCount}/3 Passed
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {badges.map((b) => (
          <div key={b.name}
            className="rounded-xl p-4 transition-all"
            style={{
              background: b.pass ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${b.pass ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <b.icon size={15} style={{ color: b.pass ? "#4ade80" : "#f87171" }} />
                <span className="font-bold text-sm text-white">{b.name}</span>
              </div>
              {b.pass
                ? <CheckCircle2 size={18} className="text-green-400" />
                : <XCircle size={18} className="text-red-400" />
              }
            </div>
            <p className="text-xs leading-relaxed mb-2" style={{ color: b.pass ? "#86efac" : "#fca5a5" }}>
              {b.desc}
            </p>
            <p className="text-xs text-slate-600">{b.detail}</p>
          </div>
        ))}
      </div>
      {passCount < 3 && (
        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 px-1">
          <Info size={13} className="mt-0.5 flex-shrink-0 text-yellow-500" />
          <span>
            Non-compliant results indicate real legal risk. Review the fix suggestions below and re-audit after remediation.
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── What-If Simulator ──────────────────────────────────────────────────── */
function WhatIfSimulator({ attrs, overallScore }: { attrs: any[]; overallScore: number }) {
  const [removed, setRemoved] = useState<string | null>(null);
  if (!attrs || attrs.length < 1) return null;
  const validAttrs = attrs.filter((a: any) => typeof a.fairness_score === "number");
  if (validAttrs.length === 0) return null;

  const remaining = removed ? validAttrs.filter((a: any) => a.sensitive_column !== removed) : validAttrs;
  const simScore = remaining.length > 0
    ? Math.round(remaining.reduce((s: number, a: any) => s + a.fairness_score, 0) / remaining.length)
    : 100;
  const delta = simScore - overallScore;
  const improved = delta > 0;
  const removedAttr = validAttrs.find((a: any) => a.sensitive_column === removed);
  const scoreColor = (s: number) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const riskLabel  = (s: number) => s >= 75 ? "LOW RISK" : s >= 50 ? "MEDIUM RISK" : "HIGH RISK";

  return (
    <motion.div className="mb-6 glass p-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="flex items-center gap-2 mb-2">
        <Wand2 size={18} className="text-purple-400" />
        <h2 className="font-semibold text-white">What-If Bias Simulator</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-medium">Interactive</span>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Click an attribute to simulate removing it from the model. See how your fairness score would change instantly.
      </p>

      {/* Attribute Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {validAttrs.map((a: any) => {
          const isRemoved = removed === a.sensitive_column;
          const attrColor = a.risk_level === "HIGH" ? "#ef4444" : a.risk_level === "MEDIUM" ? "#f59e0b" : "#22c55e";
          return (
            <button key={a.sensitive_column}
              onClick={() => setRemoved(isRemoved ? null : a.sensitive_column)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200"
              style={{
                background:   isRemoved ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                borderColor:  isRemoved ? "rgba(167,139,250,0.5)"  : "rgba(255,255,255,0.1)",
                color:        isRemoved ? "#c4b5fd" : "#94a3b8",
                textDecoration: isRemoved ? "line-through" : "none",
              }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: attrColor }} />
              {a.sensitive_column}
              <span className="text-xs opacity-60">({a.fairness_score})</span>
            </button>
          );
        })}
        {removed && (
          <button onClick={() => setRemoved(null)}
            className="px-3 py-2 rounded-xl text-xs text-slate-500 border border-white/10 hover:border-white/20 transition-colors">
            ↺ Reset
          </button>
        )}
      </div>

      {/* Score Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Current Score</div>
          <div className="text-4xl font-black stat-number mb-1" style={{ color: scoreColor(overallScore) }}>{overallScore}</div>
          <div className="text-xs font-semibold" style={{ color: scoreColor(overallScore) }}>{riskLabel(overallScore)}</div>
        </div>
        <div className="rounded-xl p-4 text-center transition-all duration-500"
          style={{
            background: removed ? (improved ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)") : "rgba(255,255,255,0.03)",
            border: `1px solid ${removed ? (improved ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)") : "rgba(255,255,255,0.08)"}`,
          }}>
          <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
            {removed ? `Without "${removed}"` : "Select to Simulate"}
          </div>
          <motion.div key={simScore} className="text-4xl font-black stat-number mb-1"
            style={{ color: removed ? scoreColor(simScore) : "#475569" }}
            initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}>
            {removed ? simScore : "—"}
          </motion.div>
          {removed && <div className="text-xs font-semibold" style={{ color: scoreColor(simScore) }}>{riskLabel(simScore)}</div>}
        </div>
      </div>

      {/* Impact Message */}
      {removed && (
        <motion.div className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: improved ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${improved ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <TrendingUp size={16} className="mt-0.5 flex-shrink-0" style={{ color: improved ? "#4ade80" : "#f87171" }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: improved ? "#4ade80" : "#f87171" }}>
              {improved
                ? `+${delta} point improvement by removing "${removed}" from decisions`
                : `Removing "${removed}" has minimal impact (${delta > 0 ? "+" : ""}${delta} pts)`}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {removedAttr?.risk_level === "HIGH" && improved
                ? `"${removed}" is your highest-bias attribute (score: ${removedAttr.fairness_score}/100). Removing it or applying reweighting could bring your risk level from ${riskLabel(overallScore)} → ${riskLabel(simScore)}.`
                : improved
                ? `Excluding "${removed}" from model inputs would raise your overall fairness score from ${overallScore} → ${simScore}.`
                : `"${removed}" is not your main bias driver. Focus remediation efforts on your higher-risk attributes.`}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Bias Drivers Panel ─────────────────────────────────────────────────── */
function BiasDriversPanel({ drivers }: { drivers: any[] }) {
  if (!drivers || drivers.length === 0) return null;
  const max = Math.max(...drivers.map((d: any) => d.contribution_pct || 0), 1);
  return (
    <motion.div className="mb-6 glass p-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={18} className="text-orange-400" />
        <h2 className="font-semibold text-white">Why Bias Happens — Attribute Influence</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">Ranked</span>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Cramér&apos;s V measures how strongly each attribute statistically drives unequal outcomes.
        Higher % = stronger bias signal from that column.
      </p>
      <div className="space-y-4">
        {drivers.map((d: any, i: number) => {
          const pct = d.contribution_pct ?? 0;
          const color = d.risk_level === "HIGH" ? "#ef4444" : d.risk_level === "MEDIUM" ? "#f59e0b" : "#22c55e";
          return (
            <div key={d.column}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {i + 1}. {d.column}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    d.risk_level === "HIGH" ? "risk-high" : d.risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
                  }`}>{d.risk_level}</span>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color }}>{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <motion.div className="h-2.5 rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(pct / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl text-xs text-slate-400 leading-relaxed"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}>
        <strong className="text-orange-400">Interpretation: </strong>
        The attribute with the highest % is your primary bias driver. Prioritize remediation there first for maximum impact.
      </div>
    </motion.div>
  );
}

const MetricBar = ({ label, value, threshold, good }: any) => {
  if (value == null) return (
    <div className="flex items-center gap-4">
      <div className="w-40 text-sm text-slate-400 flex-shrink-0">{label}</div>
      <div className="flex-1 text-xs text-slate-600 italic">Not computed for this attribute</div>
    </div>
  );
  const abs = Math.abs(value);
  const isGood = good ? value > threshold : abs < threshold;
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 text-sm text-slate-400 flex-shrink-0">{label}</div>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${isGood ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, abs * 200)}%` }} />
      </div>
      <div className={`text-sm font-mono font-bold w-16 text-right ${isGood ? "text-green-400" : "text-red-400"}`}>
        {value.toFixed(4)}
      </div>
      <div className={`text-xs px-2 py-0.5 rounded-full ${isGood ? "risk-low" : "risk-high"}`}>
        {isGood ? "✓ Pass" : "✗ Fail"}
      </div>
    </div>
  );
};

export default function AuditResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeAttr, setActiveAttr] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("fairlens_token")) { router.push("/login"); return; }
    auditAPI.get(Number(id)).then((r) => setAudit(r.data)).catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const sendChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const q = chatMsg; setChatMsg(""); setChatLoading(true);
    try {
      const res = await auditAPI.chat(Number(id), q);
      setChatHistory((h) => [...h, { q, a: res.data.answer }]);
    } catch { setChatHistory((h) => [...h, { q, a: "Sorry, I couldn't process that. Please try again." }]); }
    finally { setChatLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try { await reportAPI.downloadPDF(Number(id)); } finally { setPdfLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen hero-bg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="text-blue-400 animate-spin mx-auto mb-4" size={36} />
        <p className="text-slate-400">Loading audit results...</p>
      </div>
    </div>
  );

  if (!audit) return null;

  const analysis = audit.raw_analysis || {};
  const attrs = analysis.attribute_results || [];
  const fixes = audit.fix_suggestions || [];
  const activeAttrData = attrs[activeAttr];

  // Chart data for active attribute groups
  const groupChartData = activeAttrData?.group_statistics
    ? Object.entries(activeAttrData.group_statistics).map(([group, stats]: any) => ({
        group, positiveRate: stats.positive_rate, accuracy: stats.accuracy, count: stats.count,
      }))
    : [];

  // Radar chart data for overall metrics
  const radarData = attrs.map((a: any) => ({
    attribute: a.sensitive_column,
    score: a.fairness_score || 0,
  }));

  const riskColor = RISK_COLOR[analysis.overall_risk_level] || "#94a3b8";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top bar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-sm">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white text-sm font-medium truncate max-w-xs">{audit.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="btn-ghost text-sm flex items-center gap-2">
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Download PDF
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-6 max-w-7xl mx-auto">
        {/* Risk Banner */}
        <motion.div className="mb-8 glass p-6 flex flex-col md:flex-row items-center gap-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle cx="56" cy="56" r="48" fill="none" stroke={riskColor} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - analysis.overall_fairness_score / 100)}`}
                className="transition-all duration-1000" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: riskColor }}>
                {analysis.overall_fairness_score}
              </span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                analysis.overall_risk_level === "HIGH" ? "risk-high" :
                analysis.overall_risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
              }`}>
                {analysis.overall_risk_level === "HIGH" && <AlertTriangle size={14} />}
                {analysis.overall_risk_level === "LOW" && <CheckCircle2 size={14} />}
                {analysis.overall_risk_level} BIAS RISK
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{audit.name}</h1>
            <p className="text-slate-400 text-sm">
              {audit.dataset_name} · {analysis.total_rows?.toLocaleString()} rows ·{" "}
              {attrs.length} attribute{attrs.length !== 1 ? "s" : ""} analysed ·{" "}
              {new Date(audit.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "DPD", val: attrs[0]?.demographic_parity_difference?.toFixed(3) ?? "—", bad: attrs[0]?.demographic_parity_difference > 0.1 },
              { label: "EOD", val: attrs[0]?.equalized_odds_difference?.toFixed(3) ?? "—", bad: attrs[0]?.equalized_odds_difference > 0.1 },
              { label: "DIR", val: attrs[0]?.disparate_impact_ratio?.toFixed(3) ?? "—", bad: attrs[0]?.disparate_impact_ratio < 0.8 },
            ].map((m) => (
              <div key={m.label} className="glass-light p-3">
                <div className={`text-xl font-bold stat-number ${m.bad ? "text-red-400" : "text-green-400"}`}>{m.val}</div>
                <div className="text-xs text-slate-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Compliance Badges */}
        <CompliancePanel attrs={attrs.filter((a: any) => !a.error)} />

        {/* Bias Drivers — WHY bias happens */}
        <BiasDriversPanel drivers={analysis.bias_drivers ?? []} />

        {/* What-If Simulator */}
        <WhatIfSimulator attrs={attrs} overallScore={analysis.overall_fairness_score ?? 0} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attribute selector */}
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-400" /> Bias by Attribute
              </h2>
              <div className="flex gap-2 mb-5 flex-wrap">
                {attrs.map((a: any, i: number) => (
                  <button key={a.sensitive_column} onClick={() => setActiveAttr(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${i === activeAttr
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"}`}>
                    {a.sensitive_column}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                      a.error ? "bg-slate-700 text-slate-400" :
                      a.risk_level === "HIGH" ? "risk-high" : a.risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
                    }`}>{a.error ? "ERR" : a.risk_level}</span>
                  </button>
                ))}
              </div>

              {activeAttrData && (
                <>
                  {/* Error state for this attribute */}
                  {activeAttrData.error ? (
                    <div className="rounded-xl p-4 mb-4"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle size={15} className="text-red-400" />
                        <span className="text-sm font-semibold text-red-400">Analysis Failed for &quot;{activeAttrData.sensitive_column}&quot;</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{activeAttrData.error}</p>
                      <p className="text-xs text-slate-600 mt-2">
                        Tip: Ensure this column is categorical (e.g. gender, race) with at least 2 groups and 5+ rows per group.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Most disadvantaged group callout */}
                      {activeAttrData.most_disadvantaged_group && (
                        <div className="rounded-xl p-3 mb-4 flex items-start gap-3"
                          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-red-400">Most Disadvantaged: </span>
                            <span className="text-xs text-slate-300">&quot;{activeAttrData.most_disadvantaged_group}&quot; group receives
                              {activeAttrData.group_statistics?.[activeAttrData.most_disadvantaged_group]
                                ? ` ${activeAttrData.group_statistics[activeAttrData.most_disadvantaged_group].positive_rate}% positive rate`
                                : " the lowest positive rate"}
                            </span>
                            {activeAttrData.most_advantaged_group && activeAttrData.most_advantaged_group !== activeAttrData.most_disadvantaged_group && (
                              <span className="text-xs text-slate-500"> vs &quot;{activeAttrData.most_advantaged_group}&quot;
                                {activeAttrData.group_statistics?.[activeAttrData.most_advantaged_group]
                                  ? ` (${activeAttrData.group_statistics[activeAttrData.most_advantaged_group].positive_rate}%)`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metrics bars */}
                      <div className="space-y-3 mb-6">
                        <MetricBar label="Demographic Parity Diff." value={activeAttrData.demographic_parity_difference} threshold={0.1} good={false} />
                        <MetricBar label="Equalized Odds Diff." value={activeAttrData.equalized_odds_difference} threshold={0.1} good={false} />
                        <MetricBar label="Disparate Impact Ratio" value={activeAttrData.disparate_impact_ratio} threshold={0.8} good={true} />
                        {activeAttrData.bias_contribution_pct != null && (
                          <div className="flex items-center gap-4">
                            <div className="w-40 text-sm text-slate-400 flex-shrink-0">Bias Contribution</div>
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div className="h-2 rounded-full bg-orange-500 transition-all duration-700"
                                style={{ width: `${Math.min(100, activeAttrData.bias_contribution_pct)}%` }} />
                            </div>
                            <div className="text-sm font-mono font-bold w-16 text-right text-orange-400">
                              {activeAttrData.bias_contribution_pct.toFixed(1)}%
                            </div>
                            <div className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">Cramér V</div>
                          </div>
                        )}
                      </div>

                      {/* Group bar chart */}
                      {groupChartData.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-400 mb-3">Positive Decision Rate by Group (%)</p>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={groupChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <XAxis dataKey="group" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                              <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
                                formatter={(v: any) => [`${v}%`]}
                              />
                              <Bar dataKey="positiveRate" name="Positive Rate %" radius={[6, 6, 0, 0]}>
                                {groupChartData.map((_: any, i: number) => (
                                  <Cell key={i} fill={i === 0 ? "#3b82f6" : i === 1 ? "#a78bfa" : "#34d399"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Radar overview */}
            {radarData.length > 1 && (
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Fairness Score Overview</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="attribute" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Radar name="Fairness Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gemini Explanation */}
            {audit.gemini_explanation && (
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400" /> Gemini AI Analysis
                </h2>
                <div className="prose prose-sm max-w-none">
                  {audit.gemini_explanation.split("\n\n").map((para: string, i: number) =>
                    para.trim() && (
                      <p key={i} className="text-slate-300 leading-relaxed mb-4 last:mb-0">{para.trim()}</p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Fixes + Chat */}
          <div className="space-y-6">
            {/* Fix Suggestions */}
            {fixes.length > 0 && (
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Recommended Fixes</h2>
                <div className="space-y-4">
                  {fixes.map((fix: any, i: number) => (
                    <motion.div key={i} className="metric-card"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-white leading-tight">{fix.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          fix.priority === "HIGH" ? "risk-high" : fix.priority === "MEDIUM" ? "risk-medium" : "risk-low"
                        }`}>{fix.priority}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">{fix.description}</p>
                      <p className="text-xs text-slate-500">
                        <span className="text-slate-400">Impact:</span> {fix.expected_impact}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="text-slate-400">Effort:</span> {fix.effort}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Chat */}
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-400" /> Ask Gemini
              </h2>
              <div className="min-h-32 max-h-64 overflow-y-auto space-y-3 mb-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-6">
                    <MessageSquare className="text-slate-700 mx-auto mb-2" size={28} />
                    <p className="text-slate-600 text-sm">Ask anything about your audit results</p>
                    <div className="mt-3 space-y-1">
                      {["Why is the DPD high?", "Who is being disadvantaged?", "What's the legal risk?"].map(q => (
                        <button key={q} onClick={() => setChatMsg(q)}
                          className="block w-full text-left text-xs text-slate-500 hover:text-blue-400 py-1 transition-colors">
                          → {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((h, i) => (
                  <div key={i} className="space-y-2">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-300">{h.q}</div>
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 leading-relaxed">{h.a}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 size={14} className="animate-spin" /> Gemini is thinking...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask about your results..." className="input-field text-sm" id="chat-input" />
                <button onClick={sendChat} disabled={chatLoading || !chatMsg.trim()}
                  className="btn-primary px-3 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
