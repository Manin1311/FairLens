import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  BarChart3, 
  Trash2, 
  Share2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, auditApi } from '../services/api';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit');
      setAudits(res.data);
    } catch (err) {
      setError('Failed to fetch audits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this audit report?')) return;
    try {
      await auditApi.deleteAudit(id);
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete audit.');
    }
  };

  const handleToggleShare = async (id) => {
    try {
      const res = await auditApi.toggleShare(id);
      setAudits(prev => prev.map(a => a.id === id ? { ...a, is_public: res.is_public } : a));
      if (res.is_public) {
        navigator.clipboard.writeText(`${window.location.origin}/audit/public/${id}`);
        alert('Public share link copied to clipboard!');
      } else {
        alert('Audit made private.');
      }
    } catch (err) {
      alert('Failed to toggle public sharing.');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
            Audit Governance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Welcome back, <span className="text-indigo-400 font-semibold">{user?.name}</span>. Manage your algorithmic fairness audits & compliance scorecards.
          </p>
        </div>

        <Link
          to="/audit/new"
          className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New AI Bias Audit</span>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Total Audits Run</span>
          <div className="text-3xl font-display font-black text-white mt-1">
            {audits.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Protected Jurisdictions</span>
          <div className="text-lg font-display font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>EU AI Act & EEOC Ready</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel">
          <span className="text-xs text-slate-400 block uppercase font-semibold">De-biasing Engine</span>
          <div className="text-lg font-display font-bold text-indigo-400 mt-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>FairLens 2.0 Active</span>
          </div>
        </div>
      </div>

      {/* Audits List */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold text-white">
          Recent Audit Reports
        </h2>

        {loading ? (
          <div className="p-12 text-center glass-panel rounded-2xl">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading audit records...</p>
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-2xl space-y-4">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">No audits yet</h3>
              <p className="text-xs text-slate-400 mt-1">Upload a CSV dataset to run your first algorithmic bias audit.</p>
            </div>
            <Link
              to="/audit/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Audit</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {audits.map((audit) => (
              <motion.div
                key={audit.id}
                whileHover={{ y: -2 }}
                className="p-5 rounded-2xl glass-panel border border-white/[0.08] hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/audit/${audit.id}`}
                      className="text-base font-display font-bold text-white hover:text-indigo-400 transition-colors"
                    >
                      {audit.name}
                    </Link>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      audit.overall_risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      audit.overall_risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {audit.overall_risk} RISK ({audit.overall_score}/100)
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Dataset: <strong className="text-slate-300">{audit.dataset_name}</strong></span>
                    <span>•</span>
                    <span>{audit.total_rows?.toLocaleString()} rows</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(audit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Link
                    to={`/audit/${audit.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span>View 2.0 Report</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <a
                    href={auditApi.downloadReport(audit.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg glass-panel hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleToggleShare(audit.id)}
                    className="p-2 rounded-lg glass-panel hover:bg-white/[0.08] text-slate-300 hover:text-indigo-400 transition-colors"
                    title="Share Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(audit.id)}
                    className="p-2 rounded-lg glass-panel hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
