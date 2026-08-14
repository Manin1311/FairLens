import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Zap, 
  Layers, 
  Sliders, 
  Scale, 
  Bot, 
  Download, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { auditApi } from '../services/api';
import { GlowingGauge } from '../components/GlowingGauge';
import { MitigationStudio } from '../components/MitigationStudio';
import { IntersectionalHeatmap } from '../components/IntersectionalHeatmap';
import { CounterfactualTester } from '../components/CounterfactualTester';
import { ComplianceCenter } from '../components/ComplianceCenter';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { AskGeminiChat } from '../components/AskGeminiChat';

export const AuditDetailPage = () => {
  const { id } = useParams();
  const [audit, setAudit] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [reExplaining, setReExplaining] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'mitigate', label: 'Mitigation Studio', icon: Zap, badge: '2.0' },
    { id: 'intersectional', label: 'Intersectional Matrix', icon: Layers, badge: '2.0' },
    { id: 'counterfactual', label: 'Counterfactual Tester', icon: Sliders, badge: '2.0' },
    { id: 'whatif', label: 'What-If Simulator', icon: Sparkles },
    { id: 'compliance', label: 'Legal Compliance', icon: Scale },
    { id: 'chat', label: 'Ask AI Copilot', icon: Bot },
  ];

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const data = await auditApi.getAudit(id);
      setAudit(data);
      setSelectedLanguage(data.language || 'English');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch audit details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [id]);

  const handleReExplain = async (lang) => {
    setSelectedLanguage(lang);
    setReExplaining(true);
    try {
      const res = await auditApi.reExplain(id, lang);
      setAudit((prev) => ({
        ...prev,
        gemini_explanation: res.gemini_explanation,
        language: lang
      }));
    } catch (err) {
      alert('Failed to regenerate explanation in ' + lang);
    } finally {
      setReExplaining(false);
    }
  };

  const handleShare = async () => {
    try {
      const res = await auditApi.toggleShare(id);
      setAudit(prev => ({ ...prev, is_public: res.is_public }));
      if (res.is_public) {
        navigator.clipboard.writeText(`${window.location.origin}/audit/public/${id}`);
        alert('Public share link copied to clipboard!');
      } else {
        alert('Audit made private.');
      }
    } catch (e) {
      alert('Failed to update sharing.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white">Loading FairLens 2.0 Audit Details...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Audit Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'The requested audit could not be loaded.'}</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const analysis = audit.raw_analysis || {};
  const score = audit.overall_score || 0;
  const riskLevel = audit.overall_risk || 'UNKNOWN';
  const attributes = analysis.attribute_results || [];
  const parseSensitiveList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Fall through to comma split
        }
      }
      return trimmed.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
    return [];
  };

  const sensitiveList = parseSensitiveList(audit.sensitive_columns);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Back and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/dashboard" className="text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
              {audit.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
              riskLevel === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {riskLevel} RISK
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dataset: <strong className="text-slate-300">{audit.dataset_name}</strong> · {audit.total_rows?.toLocaleString()} rows · Created {new Date(audit.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-xs">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => handleReExplain(e.target.value)}
              disabled={reExplaining}
              className="bg-transparent text-white font-medium focus:outline-none text-xs"
            >
              {['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Portuguese', 'Japanese', 'Chinese'].map((l) => (
                <option key={l} value={l} className="bg-[#0f1422] text-white">{l}</option>
              ))}
            </select>
          </div>

          <a
            href={auditApi.downloadReport(audit.id)}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Report</span>
          </a>

          <button
            onClick={handleShare}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              audit.is_public
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'glass-panel text-slate-300 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{audit.is_public ? 'Public Link Active' : 'Share Publicly'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-500/50'
                  : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black border transition-all ${
                  active
                    ? 'bg-white text-indigo-700 border-white dark:bg-indigo-400 dark:text-indigo-950 dark:border-indigo-300'
                    : 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-500/40'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlowingGauge score={score} riskLevel={riskLevel} size={180} subtitle="Global Dataset Fairness Index" />

              <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between border border-indigo-500/20 relative overflow-hidden">
                
                {reExplaining && (
                  <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#0c0f1d]/80 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-indigo-600/90 text-white text-xs font-semibold shadow-lg">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gemini is generating {selectedLanguage} explanation...</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                        Gemini 2.5 Flash Verdict ({selectedLanguage})
                      </h3>
                    </div>
                    {audit.gemini_explanation?.risk_emoji && (
                      <span className="text-xl">{audit.gemini_explanation.risk_emoji}</span>
                    )}
                  </div>

                  {/* TLDR Summary */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-slate-800 dark:text-slate-200 text-xs font-medium leading-relaxed">
                    {audit.gemini_explanation?.tldr || "Analysis complete. Review specific attribute disparities in the table below."}
                  </div>

                  {/* Key Findings List */}
                  {audit.gemini_explanation?.key_findings?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                        Key Quantitative Findings
                      </span>
                      <ul className="space-y-1.5">
                        {audit.gemini_explanation.key_findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <span className="text-indigo-500 font-bold mt-0.5">•</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Groups & Impact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {audit.gemini_explanation?.who_is_affected && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs space-y-1">
                        <strong className="text-rose-700 dark:text-rose-300 block font-semibold">Disadvantaged Groups</strong>
                        <p className="text-rose-900 dark:text-rose-200/90">{audit.gemini_explanation.who_is_affected}</p>
                      </div>
                    )}

                    {audit.gemini_explanation?.real_world_consequence && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs space-y-1">
                        <strong className="text-amber-700 dark:text-amber-300 block font-semibold">Real-World Consequence</strong>
                        <p className="text-amber-900 dark:text-amber-200/90">{audit.gemini_explanation.real_world_consequence}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Required */}
                  {audit.gemini_explanation?.urgency && (
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs flex items-start gap-2">
                      <strong className="text-indigo-700 dark:text-indigo-300 flex-shrink-0 font-semibold">Action Required:</strong>
                      <span className="text-indigo-950 dark:text-indigo-200">{audit.gemini_explanation.urgency}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Target Decision: <strong className="text-slate-800 dark:text-slate-200 font-mono">{audit.target_column}</strong></span>
                  <button onClick={() => setActiveTab('mitigate')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer">
                    Open in Mitigation Studio →
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="p-6 rounded-2xl glass-panel overflow-x-auto">
              <h3 className="text-base font-display font-bold text-white mb-4">
                Attribute Disparity Metrics
              </h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="pb-3 font-semibold">Protected Attribute</th>
                    <th className="pb-3 font-semibold">Risk Tier</th>
                    <th className="pb-3 font-semibold">Score</th>
                    <th className="pb-3 font-semibold">DPD (&lt; 0.10)</th>
                    <th className="pb-3 font-semibold">DIR (&gt; 0.80)</th>
                    <th className="pb-3 font-semibold">Disadvantaged Group</th>
                    <th className="pb-3 font-semibold">Advantaged Group</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {attributes.map((attr, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 font-bold text-white font-mono">{attr.sensitive_column}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          attr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-300' :
                          attr.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {attr.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-white">{attr.fairness_score}/100</td>
                      <td className="py-3.5 font-mono text-slate-300">{attr.demographic_parity_difference}</td>
                      <td className="py-3.5 font-mono">
                        <span className={attr.disparate_impact_ratio < 0.8 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {attr.disparate_impact_ratio} {attr.disparate_impact_ratio < 0.8 ? '❌' : '✅'}
                        </span>
                      </td>
                      <td className="py-3.5 text-rose-300">{attr.most_disadvantaged_group}</td>
                      <td className="py-3.5 text-emerald-300">{attr.most_advantaged_group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </motion.div>
        )}

        {/* MITIGATION STUDIO */}
        {activeTab === 'mitigate' && (
          <motion.div key="mitigate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MitigationStudio
              auditId={audit.id}
              datasetName={audit.dataset_name}
              sensitiveColumns={sensitiveList}
              defaultSensitive={sensitiveList[0]}
              auditData={audit}
              isDemo={false}
            />
          </motion.div>
        )}

        {/* INTERSECTIONAL */}
        {activeTab === 'intersectional' && (
          <motion.div key="intersectional" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntersectionalHeatmap
              auditId={audit.id}
              datasetName={audit.dataset_name}
              sensitiveColumns={sensitiveList}
              isDemo={false}
            />
          </motion.div>
        )}

        {/* COUNTERFACTUAL */}
        {activeTab === 'counterfactual' && (
          <motion.div key="counterfactual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CounterfactualTester
              auditId={audit.id}
              datasetName={audit.dataset_name}
              sensitiveColumns={sensitiveList}
              isDemo={false}
            />
          </motion.div>
        )}

        {/* WHAT-IF */}
        {activeTab === 'whatif' && (
          <motion.div key="whatif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WhatIfSimulator analysisResults={analysis} />
          </motion.div>
        )}

        {/* COMPLIANCE */}
        {activeTab === 'compliance' && (
          <motion.div key="compliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ComplianceCenter datasetName={audit.dataset_name} auditData={audit} isDemo={false} />
          </motion.div>
        )}

        {/* ASK AI */}
        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AskGeminiChat auditId={audit.id} analysisResults={analysis} />
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
