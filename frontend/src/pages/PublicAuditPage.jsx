import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Download, AlertCircle, ArrowLeft, Globe, Sparkles } from 'lucide-react';
import { auditApi } from '../services/api';
import { GlowingGauge } from '../components/GlowingGauge';

export const PublicAuditPage = () => {
  const { id } = useParams();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublic = async () => {
      setLoading(true);
      try {
        const data = await auditApi.getPublicAudit(id);
        setAudit(data);
      } catch (err) {
        setError('This audit is private or does not exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublic();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Public Audit Not Available</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link to="/" className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          Go to FairLens Home
        </Link>
      </div>
    );
  }

  const analysis = audit.raw_analysis || {};
  const attributes = analysis.attribute_results || [];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold mb-2">
            <Globe className="w-3 h-3" />
            <span>Public Transparency View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white">{audit.name}</h1>
          <p className="text-xs text-slate-400 mt-1">Dataset: {audit.dataset_name} · {audit.total_rows?.toLocaleString()} records</p>
        </div>

        <a
          href={auditApi.downloadReport(audit.id)}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5 shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF Audit</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlowingGauge score={audit.overall_score} riskLevel={audit.overall_risk} size={180} />
        
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between border border-indigo-500/20">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Gemini 2.5 Flash Verdict</h3>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {audit.gemini_explanation?.tldr || 'Audit completed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="p-6 rounded-2xl glass-panel overflow-x-auto">
        <h3 className="text-sm font-bold text-white mb-4">Attribute Disparity Metrics</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] text-slate-400">
              <th className="pb-3">Protected Attribute</th>
              <th className="pb-3">Risk Level</th>
              <th className="pb-3">Score</th>
              <th className="pb-3">DPD (&lt; 0.10)</th>
              <th className="pb-3">DIR (&gt; 0.80)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {attributes.map((a, i) => (
              <tr key={i}>
                <td className="py-3 font-mono text-white font-bold">{a.sensitive_column}</td>
                <td className="py-3 font-mono">{a.risk_level}</td>
                <td className="py-3 font-mono font-bold text-white">{a.fairness_score}/100</td>
                <td className="py-3 font-mono text-slate-300">{a.demographic_parity_difference}</td>
                <td className="py-3 font-mono text-slate-300">{a.disparate_impact_ratio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
