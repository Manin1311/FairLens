import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  BarChart3, 
  Zap, 
  Layers, 
  Sliders, 
  ShieldCheck, 
  Bot, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Database,
  ArrowUpRight
} from 'lucide-react';
import { auditApi } from '../services/api';
import { GlowingGauge } from '../components/GlowingGauge';
import { MitigationStudio } from '../components/MitigationStudio';
import { IntersectionalHeatmap } from '../components/IntersectionalHeatmap';
import { CounterfactualTester } from '../components/CounterfactualTester';
import { ComplianceCenter } from '../components/ComplianceCenter';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { AskGeminiChat } from '../components/AskGeminiChat';

export const DemoPage = () => {
  const [selectedDataset, setSelectedDataset] = useState('compas');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [demoData, setDemoData] = useState(null);
  const [error, setError] = useState('');

  const datasets = [
    {
      id: 'compas',
      name: 'COMPAS Recidivism',
      domain: 'Criminal Justice Risk Scoring',
      desc: 'Real court risk assessment dataset showing racial bias in recidivism predictions.',
      rows: '7,214 rows',
      target: 'two_year_recid'
    },
    {
      id: 'adult_income',
      name: 'Adult Income (Census)',
      domain: 'Financial / Income Tier AI',
      desc: 'US Census dataset used in credit scoring, revealing substantial gender disparities.',
      rows: '32,561 rows',
      target: 'income'
    },
    {
      id: 'german_credit',
      name: 'German Credit Risk',
      domain: 'Banking & Lending Approval',
      desc: 'German loan applicant dataset auditing age and sex discrimination in approvals.',
      rows: '1,000 rows',
      target: 'Risk'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Audit Overview', icon: BarChart3 },
    { id: 'mitigate', label: 'Mitigation Studio', icon: Zap, badge: '2.0' },
    { id: 'intersectional', label: 'Intersectional Matrix', icon: Layers, badge: '2.0' },
    { id: 'counterfactual', label: 'Counterfactual Tester', icon: Sliders, badge: '2.0' },
    { id: 'whatif', label: 'What-If Simulator', icon: Sparkles },
    { id: 'compliance', label: 'Legal Compliance', icon: Scale },
    { id: 'chat', label: 'Ask AI Copilot', icon: Bot },
  ];

  const fetchDemoAudit = async (datasetId) => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Instant Quick analysis
      const quickData = await auditApi.runDemoQuick(datasetId);
      setDemoData(quickData);
      setLoading(false);

      // Step 2: Fetch AI explanation in background
      auditApi.runDemoExplain(datasetId).then((aiData) => {
        setDemoData((prev) => prev ? {
          ...prev,
          gemini_explanation: aiData.gemini_explanation,
          fix_suggestions: aiData.fix_suggestions
        } : prev);
      }).catch(err => console.error("Explain error:", err));

    } catch (err) {
      setError('Failed to load demo audit data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoAudit(selectedDataset);
  }, [selectedDataset]);

  const analysis = demoData?.analysis;
  const score = analysis?.overall_fairness_score || 0;
  const riskLevel = analysis?.overall_risk_level || 'UNKNOWN';
  const attributes = analysis?.attribute_results || [];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Interactive Sandbox · No Login Required
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
            FairLens 2.0 Live Demo Playground
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Test automated bias detection, mitigation studio, and intersectional matrices on benchmark datasets.
          </p>
        </div>

        {/* Dataset Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
          {datasets.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDataset(d.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedDataset === d.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500'
                  : 'glass-panel text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Database className="w-3.5 h-3.5 opacity-75" />
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Bar */}
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

      {/* Tab Contents */}
      {loading ? (
        <div className="p-16 text-center glass-panel rounded-3xl">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-white">Running fairness metrics engine on {selectedDataset}...</p>
          <p className="text-xs text-slate-400 mt-1">Calculating DPD, EOD, DIR, and Cramér's V associations...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Scorecard & AI Verdict Top Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Score Gauge */}
                <div className="flex flex-col">
                  <GlowingGauge score={score} riskLevel={riskLevel} size={180} subtitle="Global Dataset Fairness Index" />
                </div>

                {/* Gemini Plain-English Verdict */}
                <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between border border-indigo-500/20 relative overflow-hidden">
                  <div className="ambient-glow-indigo top-[-100px] right-[-100px] opacity-30" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-display font-bold text-white">
                        Gemini 2.5 Flash Executive Verdict
                      </h3>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-200 text-xs leading-relaxed">
                      {demoData?.gemini_explanation?.tldr || "Analysis complete. Review specific attribute disparities in the table below."}
                    </div>

                    {demoData?.gemini_explanation?.who_is_affected && (
                      <p className="text-xs text-slate-300 mt-3">
                        <span className="font-semibold text-indigo-300">Impacted Demographics:</span> {demoData.gemini_explanation.who_is_affected}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">Total records: {analysis?.total_rows?.toLocaleString()}</span>
                    <button
                      onClick={() => setActiveTab('mitigate')}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    >
                      <span>Fix this bias in Mitigation Studio</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Fairness Metric Breakdown Table */}
              <div className="p-6 rounded-2xl glass-panel overflow-x-auto">
                <h3 className="text-base font-display font-bold text-white mb-4">
                  Sensitive Attribute Disparity Metrics
                </h3>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400">
                      <th className="pb-3 font-semibold">Protected Attribute</th>
                      <th className="pb-3 font-semibold">Risk Tier</th>
                      <th className="pb-3 font-semibold">Score</th>
                      <th className="pb-3 font-semibold">DPD (Threshold &lt; 0.10)</th>
                      <th className="pb-3 font-semibold">DIR (EEOC 80% Rule &gt; 0.80)</th>
                      <th className="pb-3 font-semibold">Disadvantaged Group</th>
                      <th className="pb-3 font-semibold">Advantaged Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {attributes.map((attr, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 font-bold text-white font-mono">{attr.sensitive_column}</td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            attr.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            attr.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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

              {/* Fix Suggestions from Gemini */}
              {demoData?.fix_suggestions && demoData.fix_suggestions.length > 0 && (
                <div className="p-6 rounded-2xl glass-panel space-y-4">
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Recommended Action Plan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {demoData.fix_suggestions.map((fix, idx) => (
                      <div key={idx} className="p-4 rounded-xl glass-panel border border-white/[0.06] flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-white">{fix.title}</span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                              fix.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {fix.priority} PRIORITY
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{fix.description}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/[0.04] text-[11px] text-emerald-400 font-medium">
                          Expected Impact: {fix.expected_impact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ─── TAB 2: MITIGATION STUDIO ───────────────────────────────────── */}
          {activeTab === 'mitigate' && (
            <motion.div key="mitigate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MitigationStudio
                datasetName={selectedDataset}
                sensitiveColumns={demoData?.sensitive_columns || []}
                defaultSensitive={demoData?.sensitive_columns?.[0]}
                isDemo={true}
              />
            </motion.div>
          )}

          {/* ─── TAB 3: INTERSECTIONAL MATRIX ───────────────────────────────── */}
          {activeTab === 'intersectional' && (
            <motion.div key="intersectional" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IntersectionalHeatmap
                datasetName={selectedDataset}
                sensitiveColumns={demoData?.sensitive_columns || []}
                isDemo={true}
              />
            </motion.div>
          )}

          {/* ─── TAB 4: COUNTERFACTUAL TESTER ───────────────────────────────── */}
          {activeTab === 'counterfactual' && (
            <motion.div key="counterfactual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CounterfactualTester
                datasetName={selectedDataset}
                sensitiveColumns={demoData?.sensitive_columns || []}
                isDemo={true}
              />
            </motion.div>
          )}

          {/* ─── TAB 5: WHAT-IF SIMULATOR ───────────────────────────────────── */}
          {activeTab === 'whatif' && (
            <motion.div key="whatif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WhatIfSimulator analysisResults={analysis} />
            </motion.div>
          )}

          {/* ─── TAB 6: COMPLIANCE CENTER ───────────────────────────────────── */}
          {activeTab === 'compliance' && (
            <motion.div key="compliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ComplianceCenter datasetName={selectedDataset} isDemo={true} />
            </motion.div>
          )}

          {/* ─── TAB 7: ASK AI COPILOT ──────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AskGeminiChat analysisResults={analysis} />
            </motion.div>
          )}

        </AnimatePresence>
      )}

    </div>
  );
};
