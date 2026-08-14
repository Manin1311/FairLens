import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Sparkles, 
  Send, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Scale, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { auditApi } from '../services/api';

export const LlmAuditPage = () => {
  const [promptText, setPromptText] = useState(
    "Write a job recommendation for an aggressive leader who can manage high-stress board meetings and direct male engineering teams."
  );
  const [systemRole, setSystemRole] = useState("Technical Hiring Assistant");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const presetExamples = [
    {
      title: "Hiring Gender Stereotype",
      text: "Candidate A is emotional and collaborative, suitable for HR support. Candidate B is assertive and analytical, suitable for Executive Leadership."
    },
    {
      title: "Credit Risk Socioeconomic Bias",
      text: "Applicants from postal code 90210 have naturally high financial integrity, whereas applicants from downtown urban zones require higher loan interest rates."
    },
    {
      title: "Medical Pain Assessment",
      text: "Patients from certain demographic backgrounds have higher pain tolerance thresholds and may not require immediate opioid pain management."
    }
  ];

  const handleRunAudit = async (e) => {
    e?.preventDefault();
    if (!promptText.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await auditApi.auditLlmText({
        text: promptText,
        system_role: systemRole
      });
      setAuditResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to audit prompt text.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRewrite = () => {
    if (auditResult?.debiased_rewrite) {
      navigator.clipboard.writeText(auditResult.debiased_rewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 font-mono text-xs font-bold shadow-xs">
          <Bot className="w-3.5 h-3.5" />
          <span>FairLens 2.0 Generative AI Safety</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-white">
          LLM Prompt & Response Bias Auditor
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Audit Generative AI prompts, system instructions, and model outputs for gender stereotypes, sentiment disparities, and EU AI Act safety violations.
        </p>
      </div>

      {/* Preset Prompts */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-slate-400 mr-2 whitespace-nowrap">Try Presets:</span>
        {presetExamples.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setPromptText(p.text)}
            className="px-3 py-1.5 rounded-lg glass-panel text-xs text-slate-300 hover:text-white hover:border-purple-500/40 whitespace-nowrap transition-all"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Main Input Form */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-purple-500/20 max-w-4xl mx-auto space-y-4">
        
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
            Prompt / Generated Text to Audit
          </label>
          <textarea
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Paste system instructions, candidate review notes, or LLM chat prompts..."
            className="w-full p-4 rounded-xl glass-input text-xs sm:text-sm leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">AI System Persona / Context</label>
            <input
              type="text"
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
              className="px-3 py-1.5 rounded-lg glass-input text-xs w-full sm:w-64"
            />
          </div>

          <button
            onClick={handleRunAudit}
            disabled={loading || !promptText.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{loading ? "Auditing with Gemini 2.5 Flash..." : "Audit Prompt Safety"}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results View */}
      {auditResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Top Score Readout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl glass-panel border border-purple-500/20">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Unbiased Safety Score</span>
              <div className="text-3xl font-display font-black text-white mt-1">
                {auditResult.overall_bias_score} <span className="text-xs font-mono text-slate-400">/ 100</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Bias Risk Tier</span>
              <div className={`text-xl font-display font-bold mt-1 ${
                auditResult.risk_level === 'HIGH' ? 'text-rose-400' : auditResult.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {auditResult.risk_level} RISK
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel">
              <span className="text-xs font-semibold text-slate-400 block uppercase">EU AI Act Assessment</span>
              <div className="text-xl font-display font-bold text-slate-200 mt-1">
                {auditResult.eu_ai_act_risk}
              </div>
            </div>

          </div>

          {/* Detected Biases */}
          {auditResult.detected_biases && auditResult.detected_biases.length > 0 && (
            <div className="p-6 rounded-2xl glass-panel space-y-3">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Detected Bias Patterns & Stereotypes
              </h3>
              <div className="space-y-2.5">
                {auditResult.detected_biases.map((b, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-rose-300 font-mono">Category: {b.category}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        {b.severity} SEVERITY
                      </span>
                    </div>
                    <p className="text-slate-200"><span className="text-slate-400">Snippet:</span> <code className="text-amber-300 font-mono">"{b.snippet}"</code></p>
                    <p className="text-slate-400">{b.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gemini De-Biased Rewrite */}
          {auditResult.debiased_rewrite && (
            <div className="p-6 rounded-2xl glass-panel border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.04] to-transparent space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Gemini Autonomous Unbiased Rewrite
                </h3>
                <button
                  onClick={handleCopyRewrite}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Unbiased Text"}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] text-xs sm:text-sm text-emerald-200 leading-relaxed font-mono">
                {auditResult.debiased_rewrite}
              </div>
            </div>
          )}

        </motion.div>
      )}

    </div>
  );
};
