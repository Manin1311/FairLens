import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, AlertTriangle, ShieldCheck, Flame, Info } from 'lucide-react';
import { auditApi } from '../services/api';

export const IntersectionalHeatmap = ({ auditId = null, datasetName, sensitiveColumns = [], isDemo = true, customFile = null }) => {
  const [primaryCol, setPrimaryCol] = useState(sensitiveColumns[0] || 'sex');
  const [secondaryCol, setSecondaryCol] = useState(sensitiveColumns[1] || sensitiveColumns[0] || 'race');
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [error, setError] = useState('');

  const fetchIntersectional = async () => {
    if (!primaryCol || !secondaryCol || primaryCol === secondaryCol) {
      if (sensitiveColumns.length >= 2 && primaryCol === secondaryCol) {
        setSecondaryCol(sensitiveColumns.find(c => c !== primaryCol) || sensitiveColumns[1]);
      }
      return;
    }
    setLoading(true);
    setError('');
    try {
      let data;
      if (auditId) {
        data = await auditApi.intersectionalAudit(auditId, {
          primary_column: primaryCol,
          secondary_column: secondaryCol
        });
      } else if (customFile) {
        const formData = new FormData();
        formData.append('file', customFile);
        formData.append('primary_column', primaryCol);
        formData.append('secondary_column', secondaryCol);
        formData.append('target_column', 'target');
        data = await auditApi.intersectionalCustom(formData);
      } else {
        const dName = datasetName || 'compas';
        data = await auditApi.intersectionalDemo(dName, {
          primary_column: primaryCol,
          secondary_column: secondaryCol
        });
      }
      setMatrixData(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compute intersectional heatmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sensitiveColumns.length >= 2) {
      fetchIntersectional();
    }
  }, [primaryCol, secondaryCol, datasetName]);

  const getCellColor = (risk, posRate) => {
    if (risk === 'INSUFFICIENT_DATA') return 'bg-slate-800/40 text-slate-400 border-white/[0.04]';
    if (risk === 'HIGH') return 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30';
    if (risk === 'MEDIUM') return 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30';
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Selector */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                Intersectional Fairness
              </span>
              <span className="text-xs text-slate-400">Multi-Demographic Cross Analysis</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white">
              2D Intersectional Disparity Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Single-attribute audits miss compound discrimination (e.g. Black Women vs White Men). FairLens computes cross-subgroup outcomes in real time.
            </p>
          </div>

          {/* Selectors */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Primary Axis (Rows)</label>
              <select
                value={primaryCol}
                onChange={(e) => setPrimaryCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-input text-xs"
              >
                {sensitiveColumns.map((c) => (
                  <option key={c} value={c} className="bg-[#0f1422] text-white">{c}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-400 mt-4 font-bold">×</span>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Secondary Axis (Cols)</label>
              <select
                value={secondaryCol}
                onChange={(e) => setSecondaryCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-input text-xs"
              >
                {sensitiveColumns.map((c) => (
                  <option key={c} value={c} className="bg-[#0f1422] text-white">{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center glass-panel rounded-2xl">
          <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Computing intersectional cross-demographic matrix...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {matrixData && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Findings Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl glass-panel border border-rose-500/20">
              <div className="text-[11px] font-semibold text-rose-400 uppercase flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Most Disadvantaged Subgroup
              </div>
              <div className="text-lg font-display font-bold text-white">
                {matrixData.most_disadvantaged_subgroup?.label || 'N/A'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Positive Acceptance Rate: <span className="text-rose-400 font-mono font-bold">{matrixData.most_disadvantaged_subgroup?.positive_rate}%</span> (n={matrixData.most_disadvantaged_subgroup?.count})
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-emerald-500/20">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Most Advantaged Subgroup
              </div>
              <div className="text-lg font-display font-bold text-white">
                {matrixData.most_advantaged_subgroup?.label || 'N/A'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Positive Acceptance Rate: <span className="text-emerald-400 font-mono font-bold">{matrixData.most_advantaged_subgroup?.positive_rate}%</span> (n={matrixData.most_advantaged_subgroup?.count})
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-purple-500/20">
              <div className="text-[11px] font-semibold text-purple-400 uppercase flex items-center gap-1.5 mb-1">
                <Flame className="w-3.5 h-3.5" />
                Compound Disparate Impact
              </div>
              <div className="text-lg font-display font-bold text-white">
                {matrixData.compound_disparate_impact} DIR
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Overall Population Baseline: <span className="text-purple-300 font-mono font-bold">{matrixData.overall_positive_rate}%</span>
              </div>
            </div>

          </div>

          {/* 2D Heatmap Matrix Table */}
          <div className="p-6 rounded-2xl glass-panel overflow-x-auto">
            <h4 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-2">
              <span>{primaryCol}</span>
              <span className="text-slate-400 font-normal">vs</span>
              <span>{secondaryCol}</span>
              <span className="text-xs font-normal text-slate-400 font-mono">(Positive Selection Rate %)</span>
            </h4>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                    {primaryCol} \ {secondaryCol}
                  </th>
                  {matrixData.secondary_groups.map((s) => (
                    <th key={s} className="p-3 text-xs font-bold text-slate-300 border-b border-white/[0.08] text-center bg-white/[0.02]">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.primary_groups.map((p, pIdx) => (
                  <tr key={p}>
                    <td className="p-3 text-xs font-bold text-slate-200 border-b border-white/[0.06] bg-white/[0.01]">
                      {p}
                    </td>
                    {matrixData.matrix[pIdx]?.map((cell, sIdx) => {
                      const colorClass = getCellColor(cell.risk_level, cell.positive_rate);
                      return (
                        <td key={sIdx} className="p-2 border-b border-white/[0.06] text-center">
                          <div className={`p-2.5 rounded-xl border transition-all ${colorClass}`}>
                            {cell.positive_rate !== null ? (
                              <div>
                                <span className="font-mono font-bold text-sm">{cell.positive_rate}%</span>
                                <div className="text-[10px] opacity-75">n={cell.count}</div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">n &lt; 5</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/[0.06] text-xs text-slate-400">
              <span className="font-bold">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500" />
                <span>Fair (Within 10% of mean)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500" />
                <span>Moderate Disparity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500" />
                <span>Severe Disparity (&gt;30% below mean)</span>
              </div>
            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
};
