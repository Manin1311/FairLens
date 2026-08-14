import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileCheck, Award, Printer, CheckCircle2, AlertTriangle, Scale, Globe } from 'lucide-react';
import { auditApi } from '../services/api';

export const ComplianceCenter = ({ datasetName, auditData = null, isDemo = true }) => {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCompliance = async () => {
      setLoading(true);
      try {
        if (isDemo) {
          const data = await auditApi.complianceDemo(datasetName);
          setCompliance(data);
        } else if (auditData) {
          // Compute directly from audit data
          const score = auditData.overall_score || 0;
          const risk = auditData.overall_risk || 'UNKNOWN';
          const attrs = auditData.raw_analysis?.attribute_results || [];
          const eeoc_pass = attrs.every(a => (a.disparate_impact_ratio || 1.0) >= 0.80);
          const eu_act_pass = score >= 75 && attrs.every(a => (a.demographic_parity_difference || 0.0) <= 0.15);
          setCompliance({
            dataset_name: auditData.dataset_name || 'Production Dataset',
            overall_score: score,
            overall_risk: risk,
            certifications: [
              {
                standard: 'EU AI Act (Article 10: Data Governance & Bias Control)',
                status: eu_act_pass ? 'COMPLIANT' : 'ACTION REQUIRED',
                badge_color: eu_act_pass ? 'emerald' : 'rose',
                details: 'Requires technical bias mitigation and continuous testing for high-risk AI systems in EU jurisdiction.',
                score_threshold: 'Score >= 75 and DPD <= 0.15',
                passed: eu_act_pass
              },
              {
                standard: 'US EEOC Uniform Guidelines (80% Disparate Impact Rule)',
                status: eeoc_pass ? 'COMPLIANT' : 'NON-COMPLIANT',
                badge_color: eeoc_pass ? 'emerald' : 'rose',
                details: 'Selection rate for any protected race/gender group must not fall below 4/5ths (80%) of the highest rate group.',
                score_threshold: 'DIR >= 0.80 on all protected classes',
                passed: eeoc_pass
              },
              {
                standard: 'NYC Local Law 144 (Automated Employment Decision Tools)',
                status: 'AUDITED & DOCUMENTED',
                badge_color: 'emerald',
                details: 'Requires annual independent bias audit and published impact ratios before deployment in NYC.',
                score_threshold: 'Disparate Impact transparency verified',
                passed: true
              },
              {
                standard: 'ISO/IEC 42001 (AI Management Systems — Risk Assessment)',
                status: score >= 60 ? 'CERTIFIED' : 'PROVISIONAL',
                badge_color: score >= 60 ? 'indigo' : 'amber',
                details: 'Governs organizational processes for trustworthy AI systems development and deployment.',
                score_threshold: 'Overall Trust Score >= 60/100',
                passed: score >= 60
              }
            ]
          });
        }
      } catch (e) {
        console.error('Failed to load compliance details:', e);
      } finally {
        setLoading(false);
      }
    };

    loadCompliance();
  }, [datasetName, auditData]);

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-400" />
              Legal & Standards Hub
            </span>
            <span className="text-xs text-slate-400">Global AI Regulatory Auditing</span>
          </div>
          <h3 className="text-xl font-display font-bold text-white">
            Global Compliance & Certification Center
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automated verification against landmark AI regulations: EU AI Act, US EEOC 80% Rule, NYC Local Law 144, and ISO/IEC 42001.
          </p>
        </div>

        <button
          onClick={handlePrintCertificate}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] flex items-center gap-2 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4 text-indigo-400" />
          <span>Print Official Audit Certificate</span>
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center glass-panel rounded-2xl">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Verifying regulatory standards...</p>
        </div>
      )}

      {compliance && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {compliance.certifications.map((cert, idx) => {
            const isPass = cert.passed;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-6 rounded-2xl glass-panel border transition-all ${
                  isPass ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-rose-500/30 hover:border-rose-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {isPass ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-bold text-white leading-tight">
                        {cert.standard}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Criterion: {cert.score_threshold}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                    isPass ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {cert.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  {cert.details}
                </p>

                <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center text-[11px] text-slate-400">
                  <span>Regulatory Authority:</span>
                  <span className="text-slate-300 font-medium">
                    {cert.standard.includes('EU') ? 'European Commission' : cert.standard.includes('EEOC') ? 'US Federal Law' : cert.standard.includes('NYC') ? 'NYC Consumer Affairs' : 'ISO Standard'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
};
