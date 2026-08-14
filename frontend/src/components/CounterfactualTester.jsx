import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, UserX, RefreshCw, Sparkles, AlertOctagon, CheckCircle2, Sliders } from 'lucide-react';
import { auditApi } from '../services/api';

export const CounterfactualTester = ({ auditId = null, datasetName, sensitiveColumns = [], isDemo = true, customFile = null }) => {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [selectedCol, setSelectedCol] = useState(sensitiveColumns[0] || 'sex');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchSimulation = async (idx = sampleIndex, col = selectedCol) => {
    if (!col) return;
    setLoading(true);
    setError('');
    try {
      let data;
      if (auditId) {
        data = await auditApi.counterfactualAudit(auditId, {
          sample_index: parseInt(idx),
          sensitive_column: col
        });
      } else if (customFile) {
        const formData = new FormData();
        formData.append('file', customFile);
        formData.append('sample_index', idx);
        formData.append('sensitive_column', col);
        formData.append('target_column', 'target');
        data = await auditApi.counterfactualCustom(formData);
      } else {
        const dName = datasetName || 'compas';
        data = await auditApi.counterfactualDemo(dName, {
          sample_index: parseInt(idx),
          sensitive_column: col
        });
      }
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to simulate counterfactual individual fairness.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCol) {
      fetchSimulation(sampleIndex, selectedCol);
    }
  }, [selectedCol, datasetName]);

  const handleNextApplicant = () => {
    const nextIdx = sampleIndex + 1;
    setSampleIndex(nextIdx);
    fetchSimulation(nextIdx, selectedCol);
  };

  const handlePrevApplicant = () => {
    const prevIdx = Math.max(0, sampleIndex - 1);
    setSampleIndex(prevIdx);
    fetchSimulation(prevIdx, selectedCol);
  };

  return (
    <div className="space-y-6">
      
      {/* Card Header */}
      <div className="p-6 rounded-2xl glass-panel">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Individual Fairness
              </span>
              <span className="text-xs text-slate-400">Counterfactual Attribute-Flip Simulator</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white">
              What-If Counterfactual Profile Swapper
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Tests whether flipping a candidate's protected attribute (e.g. Female to Male, Black to White) flips the AI decision while keeping all qualifications 100% identical.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Attribute to Flip</label>
              <select
                value={selectedCol}
                onChange={(e) => {
                  setSelectedCol(e.target.value);
                  fetchSimulation(sampleIndex, e.target.value);
                }}
                className="px-3 py-1.5 rounded-lg glass-input text-xs"
              >
                {sensitiveColumns.map((c) => (
                  <option key={c} value={c} className="bg-[#0f1422] text-white">{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 mt-4">
              <button
                onClick={handlePrevApplicant}
                disabled={sampleIndex === 0 || loading}
                className="px-3 py-1.5 rounded-lg glass-panel text-xs text-slate-300 hover:text-white disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-mono text-slate-400 px-1">
                Applicant #{sampleIndex + 1}
              </span>
              <button
                onClick={handleNextApplicant}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg glass-panel text-xs text-slate-300 hover:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center glass-panel rounded-2xl">
          <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Simulating counterfactual candidate mutations...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {result && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Verdict Banner */}
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            result.individual_fairness_violation
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {result.individual_fairness_violation ? (
              <AlertOctagon className="w-5 h-5 flex-shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            )}
            <div className="text-xs font-semibold">
              {result.verdict}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Applicant Profile Card */}
            <div className="p-6 rounded-2xl glass-panel">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold font-mono text-xs">
                  #{result.sample_index + 1}
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-white">Original Record Features</h4>
                  <p className="text-[10px] text-slate-400">Fixed candidate qualifications</p>
                </div>
              </div>

              <div className="space-y-2 mt-4 max-h-72 overflow-y-auto pr-1">
                {Object.entries(result.original_profile).map(([k, v]) => (
                  <div key={k} className={`flex justify-between items-center text-xs p-2 rounded-lg ${
                    k === selectedCol ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-bold' : 'bg-white/[0.02] text-slate-300'
                  }`}>
                    <span className="text-slate-400 text-[11px]">{k}:</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.08] flex justify-between items-center">
                <span className="text-xs text-slate-400">Baseline Outcome:</span>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  result.original_prediction.includes('Approved') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {result.original_prediction} ({result.original_confidence}%)
                </span>
              </div>
            </div>

            {/* Counterfactual Variations */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Counterfactual Decision Outcomes by {selectedCol}
              </h4>
              
              <div className="space-y-2.5">
                {result.counterfactual_variations.map((v, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl glass-panel border transition-all ${
                      v.is_original 
                        ? 'border-indigo-500/40 bg-indigo-500/[0.05]' 
                        : v.decision_flipped 
                          ? 'border-rose-500/40 bg-rose-500/[0.05]' 
                          : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-display">
                            If {selectedCol} = <span className="text-amber-300 font-mono">"{v.group_value}"</span>
                          </span>
                          {v.is_original && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                              ORIGINAL
                            </span>
                          )}
                          {v.decision_flipped && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              FLIPPED DECISION
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Model Confidence: <span className="font-mono text-white font-bold">{v.confidence_score}%</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Probability Shift</span>
                          <span className={`text-xs font-mono font-bold ${
                            v.probability_shift_pct > 0 ? 'text-emerald-400' : v.probability_shift_pct < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {v.probability_shift_pct > 0 ? `+${v.probability_shift_pct}%` : `${v.probability_shift_pct}%`}
                          </span>
                        </div>

                        <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                          v.predicted_outcome.includes('Approved') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {v.predicted_outcome}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
};
