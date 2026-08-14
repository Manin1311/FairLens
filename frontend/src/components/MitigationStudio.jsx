import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  Layers,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';
import { auditApi } from '../services/api';

export const MitigationStudio = ({ auditId = null, datasetName, sensitiveColumns = [], defaultSensitive = '', isDemo = true, customFile = null, auditData = null }) => {
  const [selectedCol, setSelectedCol] = useState(defaultSensitive || sensitiveColumns[0] || '');
  const [strength, setStrength] = useState(0.8);
  const [fairnessGoal, setFairnessGoal] = useState('equalized_odds');
  const [loading, setLoading] = useState(false);
  const [mitigationResult, setMitigationResult] = useState(null);
  const [error, setError] = useState('');

  const handleRunMitigation = async () => {
    if (!selectedCol) {
      setError('Please select a sensitive column to mitigate.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let data;
      if (auditId) {
        data = await auditApi.mitigateAudit(auditId, {
          sensitive_column: selectedCol,
          fairness_goal: fairnessGoal,
          strength: parseFloat(strength)
        });
      } else if (isDemo && datasetName) {
        data = await auditApi.mitigateDemo(datasetName, {
          sensitive_column: selectedCol,
          fairness_goal: fairnessGoal,
          strength: parseFloat(strength)
        });
      } else if (customFile) {
        const formData = new FormData();
        formData.append('file', customFile);
        formData.append('sensitive_column', selectedCol);
        formData.append('target_column', 'target');
        formData.append('fairness_goal', fairnessGoal);
        formData.append('strength', strength);
        data = await auditApi.mitigateCustom(formData);
      } else {
        data = await auditApi.mitigateDemo('compas', {
          sensitive_column: selectedCol,
          fairness_goal: fairnessGoal,
          strength: parseFloat(strength)
        });
      }
      setMitigationResult(data);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run mitigation engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!mitigationResult?.csv_string) return;
    const blob = new Blob([mitigationResult.csv_string], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `debiased_${datasetName || 'dataset'}_fairlens2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header Card */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden border border-indigo-500/20">
        <div className="ambient-glow-indigo top-[-100px] right-[-100px] opacity-40" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-400" />
                FairLens 2.0 Superpower
              </span>
              <span className="text-xs text-slate-400">Autonomous De-Biasing Engine</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white">
              AI Bias Mitigation Studio
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Don't just observe bias — mathematically eliminate it. FairLens applies group-wise threshold calibration and fair sample reweighting to produce a certified de-biased dataset.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRunMitigation}
              disabled={loading}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'De-biasing Data...' : 'Run Mitigation Engine'}</span>
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/[0.08]">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sensitive Column to Balance
            </label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg glass-input text-xs"
            >
              {sensitiveColumns.map((c) => (
                <option key={c} value={c} className="bg-[#0f1422] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Fairness Calibration Target
            </label>
            <select
              value={fairnessGoal}
              onChange={(e) => setFairnessGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg glass-input text-xs"
            >
              <option value="equalized_odds" className="bg-[#0f1422] text-white">
                Equalized Odds (Equal Error Rates)
              </option>
              <option value="demographic_parity" className="bg-[#0f1422] text-white">
                Demographic Parity (Equal Positive Selection)
              </option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Mitigation Intensity: <span className="text-indigo-400 font-mono font-bold">{Math.round(strength * 100)}%</span>
              </label>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Mitigation Results Presentation */}
      {mitigationResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Before vs After Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Fairness Score Comparison */}
            <div className="p-5 rounded-2xl glass-panel relative overflow-hidden">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Fairness Score Transformation
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-display font-bold text-slate-400 line-through mr-2">
                    {mitigationResult.original_metrics.fairness_score}
                  </span>
                  <ArrowRight className="w-4 h-4 inline text-indigo-400 mr-2" />
                  <span className="text-3xl font-display font-black text-emerald-400">
                    {mitigationResult.mitigated_metrics.fairness_score}
                  </span>
                  <span className="text-xs text-slate-400 font-mono ml-1">/ 100</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  +{mitigationResult.improvement.fairness_gain_pct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {mitigationResult.improvement.eeoc_compliant_now ? '✅ Meets EEOC 4/5ths Rule threshold' : '⚠️ Fairness improved significantly'}
              </p>
            </div>

            {/* Disparate Impact Ratio */}
            <div className="p-5 rounded-2xl glass-panel">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Disparate Impact Ratio (DIR)
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-display font-bold text-slate-400 line-through mr-2">
                    {mitigationResult.original_metrics.disparate_impact_ratio}
                  </span>
                  <ArrowRight className="w-4 h-4 inline text-indigo-400 mr-2" />
                  <span className="text-3xl font-display font-black text-emerald-400">
                    {mitigationResult.mitigated_metrics.disparate_impact_ratio}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                  mitigationResult.mitigated_metrics.disparate_impact_ratio >= 0.8 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  {mitigationResult.mitigated_metrics.disparate_impact_ratio >= 0.8 ? 'PASS (≥0.80)' : 'IMPROVED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                US EEOC threshold is 0.80 (80% selection rate ratio).
              </p>
            </div>

            {/* Accuracy Tradeoff */}
            <div className="p-5 rounded-2xl glass-panel">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Model Accuracy Impact
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-display font-bold text-slate-300 mr-2">
                    {mitigationResult.original_metrics.model_accuracy}%
                  </span>
                  <ArrowRight className="w-4 h-4 inline text-indigo-400 mr-2" />
                  <span className="text-3xl font-display font-black text-indigo-300">
                    {mitigationResult.mitigated_metrics.model_accuracy}%
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {mitigationResult.improvement.accuracy_delta_pct >= 0 ? `+${mitigationResult.improvement.accuracy_delta_pct}%` : `${mitigationResult.improvement.accuracy_delta_pct}%`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Negligible accuracy trade-off for massive fairness enhancement.
              </p>
            </div>

          </div>

          {/* Pareto Tradeoff Curve & Download Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pareto Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Accuracy vs Fairness Pareto Frontier
                  </h4>
                  <p className="text-xs text-slate-400">
                    Trade-off analysis across various mitigation calibration strengths.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mitigationResult.pareto_tradeoff}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="mitigation_level" 
                      stroke="#64748b" 
                      unit="%"
                      label={{ value: 'Mitigation Level (%)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis stroke="#64748b" domain={[40, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0e1220', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="fairness_score" name="Fairness Score" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="model_accuracy" name="Accuracy (%)" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Download De-biased Dataset Card */}
            <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-base font-display font-bold text-white">
                  De-Biased Dataset Export
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Download the balanced dataset with newly calibrated decision labels (<code className="text-emerald-300 font-mono text-[10px]">debiased_{mitigationResult.target_column}</code>) and training weights (<code className="text-emerald-300 font-mono text-[10px]">fairness_sample_weight</code>).
                </p>
                <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Rows:</span>
                    <span className="font-mono font-bold text-white">{mitigationResult.total_records_processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fairness Gain:</span>
                    <span className="font-mono font-bold text-emerald-400">+{mitigationResult.improvement.fairness_gain_pct}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadCsv}
                className="w-full mt-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download De-biased CSV</span>
              </button>
            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
};
