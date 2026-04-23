"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { ShieldCheck, Zap, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { auditAPI } from "@/lib/api";

const DEMOS = [
  { key: "compas", label: "COMPAS Recidivism", tag: "Criminal Justice", desc: "Racial bias in criminal risk scoring used across US courts" },
  { key: "adult_income", label: "Adult Income", tag: "Employment", desc: "Gender bias in income prediction (UCI ML dataset)" },
  { key: "german_credit", label: "German Credit", tag: "Finance", desc: "Age & gender bias in loan approval decisions" },
];

const RISK_COLOR: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };

// ─── Inner component uses useSearchParams — must be inside Suspense ───────────
function DemoContent() {
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get("dataset") || "");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.get("dataset")) runDemo(params.get("dataset")!);
  }, []);

  const runDemo = async (key: string) => {
    setSelected(key); setResult(null); setError(""); setLoading(true);
    try {
      const res = await auditAPI.runDemo(key);
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Demo dataset not available. Please check backend has demo_datasets folder.");
    } finally { setLoading(false); }
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-medium mb-4">
          <Zap size={14} /> Live Demo — No Login Required
        </span>
        <h1 className="text-4xl font-bold text-white mb-3">See FairLens in Action</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Pick a real-world dataset with known biases. Watch FairLens detect discrimination in seconds.
        </p>
      </div>

      {/* Dataset selector */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {DEMOS.map((d) => (
          <motion.button key={d.key} onClick={() => runDemo(d.key)}
            className={`glass p-5 text-left transition-all duration-200 border ${
              selected === d.key ? "border-blue-500/50 bg-blue-500/5" : "border-white/5 hover:border-blue-500/30"}`}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <div className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">{d.tag}</div>
            <div className="font-semibold text-white mb-1">{d.label}</div>
            <div className="text-xs text-slate-500">{d.desc}</div>
            {selected === d.key && loading && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400">
                <Loader2 size={12} className="animate-spin" /> Running analysis...
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Risk summary */}
          <div className="glass p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-black stat-number`}
                style={{ color: RISK_COLOR[result.analysis.overall_risk_level] }}>
                {result.analysis.overall_fairness_score}
              </div>
              <div className="text-slate-500 text-sm">/ 100</div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold inline-block ${
                result.analysis.overall_risk_level === "HIGH" ? "risk-high" :
                result.analysis.overall_risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
              }`}>{result.analysis.overall_risk_level} RISK</div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{DEMOS.find(d => d.key === result.dataset)?.label}</h3>
              <p className="text-slate-400 text-sm mb-4">
                {result.analysis.total_rows?.toLocaleString()} rows · {result.analysis.columns_analyzed} attribute{result.analysis.columns_analyzed !== 1 ? "s" : ""} analysed
              </p>
              {result.gemini_explanation && (
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-4">
                  {result.gemini_explanation.split("\n\n")[0]}
                </p>
              )}
            </div>
          </div>

          {/* Per-attribute metrics */}
          {result.analysis.attribute_results?.map((attr: any, i: number) => {
            if (attr.error) return null;
            const groupData = attr.group_statistics
              ? Object.entries(attr.group_statistics).map(([g, s]: any) => ({ group: g, rate: s.positive_rate }))
              : [];
            return (
              <div key={i} className="glass p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white capitalize">{attr.sensitive_column}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    attr.risk_level === "HIGH" ? "risk-high" : attr.risk_level === "MEDIUM" ? "risk-medium" : "risk-low"
                  }`}>{attr.risk_level}</span>
                  <span className="text-slate-500 text-sm ml-auto">Fairness Score: {attr.fairness_score}/100</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Demographic Parity Diff.", val: attr.demographic_parity_difference, bad: Math.abs(attr.demographic_parity_difference) > 0.1 },
                    { label: "Equalized Odds Diff.", val: attr.equalized_odds_difference, bad: Math.abs(attr.equalized_odds_difference) > 0.1 },
                    { label: "Disparate Impact Ratio", val: attr.disparate_impact_ratio, bad: attr.disparate_impact_ratio < 0.8 },
                  ].map((m) => (
                    <div key={m.label} className="glass-light p-3 text-center">
                      <div className={`text-2xl font-bold stat-number ${m.bad ? "text-red-400" : "text-green-400"}`}>
                        {m.val?.toFixed(3)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                      <div className={`text-xs mt-1 ${m.bad ? "text-red-400" : "text-green-400"}`}>
                        {m.bad ? "✗ Biased" : "✓ Fair"}
                      </div>
                    </div>
                  ))}
                </div>
                {groupData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={groupData}>
                      <XAxis dataKey="group" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
                        formatter={(v: any) => [`${v}%`, "Positive Rate"]} />
                      <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                        {groupData.map((_, i) => <Cell key={i} fill={i === 0 ? "#3b82f6" : i === 1 ? "#a78bfa" : "#34d399"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })}

          {/* CTA */}
          <div className="glass p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Want to Audit Your Own AI?</h3>
            <p className="text-slate-400 mb-6">Sign up free and upload your own dataset for a full bias audit with PDF report.</p>
            <Link href="/register" className="btn-primary text-base px-8 py-3 glow-blue">
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Default export wraps content in Suspense (required for useSearchParams) ──
export default function DemoPage() {
  return (
    <div className="min-h-screen hero-bg">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22} />
            <span className="text-lg font-bold gradient-text-blue">FairLens</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>
      <Suspense fallback={
        <div className="pt-24 pb-12 px-6 max-w-5xl mx-auto text-center">
          <Loader2 className="animate-spin text-blue-400 mx-auto mt-20" size={32} />
        </div>
      }>
        <DemoContent />
      </Suspense>
    </div>
  );
}
