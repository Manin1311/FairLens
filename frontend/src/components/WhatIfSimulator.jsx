import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, RefreshCw, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export const WhatIfSimulator = ({ analysisResults = null, onSimulate = null }) => {
  const [excludedCols, setExcludedCols] = useState([]);
  const attributes = analysisResults?.attribute_results || [];
  const baseScore = analysisResults?.overall_fairness_score || 0;

  const toggleAttribute = (colName) => {
    setExcludedCols((prev) => 
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Calculate simulated score
  const activeAttributes = attributes.filter((a) => !excludedCols.includes(a.sensitive_column) && !a.error);
  
  const simulatedScore = excludedCols.length === 0
    ? baseScore
    : activeAttributes.length > 0
      ? Math.round(activeAttributes.reduce((acc, curr) => acc + (curr.fairness_score || 0), 0) / activeAttributes.length)
      : 100;

  const scoreDiff = simulatedScore - baseScore;

  return (
    <div className="space-y-6">
      
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden border border-indigo-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-indigo-400" />
                Feature Ablation
              </span>
              <span className="text-xs text-slate-400">Interactive What-If Simulator</span>
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              Attribute Removal & Impact Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Click on any sensitive attribute below to toggle it ON or OFF. Watch how removing biased proxy features mathematically shifts your overall fairness score in real-time.
            </p>
          </div>

          {/* Reset button */}
          {excludedCols.length > 0 && (
            <button
              onClick={() => setExcludedCols([])}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Score comparison readout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
          
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">Baseline Score</span>
            <div className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
              {baseScore} <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block uppercase">Simulated Score</span>
            <div className="text-2xl font-display font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {simulatedScore} <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">Projected Shift</span>
            <div className={`text-2xl font-display font-bold mt-1 ${scoreDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : scoreDiff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {scoreDiff > 0 ? `+${scoreDiff} pts` : scoreDiff < 0 ? `${scoreDiff} pts` : 'Baseline (0 pts)'}
            </div>
          </div>

        </div>

        {/* Dynamic Insight Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            {excludedCols.length === 0 ? (
              <>All sensitive features are currently active in the audit. <strong>Click any card below</strong> to simulate the fairness gain if that feature or its proxies are removed from model training.</>
            ) : (
              <>Simulating removal of <strong>{excludedCols.join(', ')}</strong>. Fairness score changes from <strong>{baseScore}/100</strong> to <strong>{simulatedScore}/100</strong> ({scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} pts projected impact).</>
            )}
          </span>
        </div>

      </div>

      {/* Attribute Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-display font-bold text-slate-900 dark:text-white">
            Active Sensitive Features in Model ({attributes.length})
          </h4>
          <span className="text-xs text-slate-400">Click a card to toggle feature ablation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attributes.map((attr, idx) => {
            const isExcluded = excludedCols.includes(attr.sensitive_column);
            return (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleAttribute(attr.sensitive_column)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between shadow-xs ${
                  isExcluded
                    ? 'border-slate-200 dark:border-white/[0.04] bg-slate-100/50 dark:bg-white/[0.01] opacity-60'
                    : 'border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/[0.04] hover:border-indigo-500'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-display">
                      {attr.sensitive_column}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isExcluded 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' 
                        : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {isExcluded ? 'EXCLUDED / REMOVED' : 'ACTIVE IN AUDIT'}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                      attr.risk_level === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' :
                      attr.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    }`}>
                      {attr.risk_level} RISK
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Individual Score: <strong className="text-slate-800 dark:text-white font-mono">{attr.fairness_score}/100</strong> · DPD: <span className="font-mono text-slate-700 dark:text-slate-300">{attr.demographic_parity_difference}</span> · DIR: <span className="font-mono text-slate-700 dark:text-slate-300">{attr.disparate_impact_ratio}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    isExcluded 
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-400' 
                      : 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                  }`}>
                    {!isExcluded ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <span className="text-xs font-bold">✕</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
