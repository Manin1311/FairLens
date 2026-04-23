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
  ChevronLeft, MessageSquare, Send, Loader2, BarChart3, Zap
} from "lucide-react";
import { auditAPI, reportAPI } from "@/lib/api";

const RISK_COLOR: Record<string, string> = {
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e"
};

const MetricBar = ({ label, value, threshold, good }: any) => {
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
                      a.risk_level === "HIGH" ? "risk-high" : a.risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
                    }`}>{a.risk_level}</span>
                  </button>
                ))}
              </div>

              {activeAttrData && (
                <>
                  {/* Metrics bars */}
                  <div className="space-y-3 mb-6">
                    <MetricBar label="Demographic Parity Diff." value={activeAttrData.demographic_parity_difference} threshold={0.1} good={false} />
                    <MetricBar label="Equalized Odds Diff." value={activeAttrData.equalized_odds_difference} threshold={0.1} good={false} />
                    <MetricBar label="Disparate Impact Ratio" value={activeAttrData.disparate_impact_ratio} threshold={0.8} good={true} />
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
                            {groupChartData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? "#3b82f6" : i === 1 ? "#a78bfa" : "#34d399"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
