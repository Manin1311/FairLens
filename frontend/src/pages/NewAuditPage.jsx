import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  X,
  Sliders
} from 'lucide-react';
import { auditApi } from '../services/api';

export const NewAuditPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [auditName, setAuditName] = useState('');
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [selectedSensitive, setSelectedSensitive] = useState([]);
  const [targetColumn, setTargetColumn] = useState('');
  const [predictionColumn, setPredictionColumn] = useState('');
  const [language, setLanguage] = useState('English');
  const [loadingDetection, setLoadingDetection] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [error, setError] = useState('');

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setAuditName(uploadedFile.name.replace(/\.[^/.]+$/, "") + " Bias Audit");
    setError('');
    setLoadingDetection(true);

    try {
      const colData = await auditApi.detectColumns(uploadedFile);
      setDetectedColumns(colData.columns || []);
      setSelectedSensitive(colData.detected_sensitive || []);
      setTargetColumn(colData.detected_target || colData.columns?.[colData.columns.length - 1] || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse columns from uploaded file.');
    } finally {
      setLoadingDetection(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const toggleSensitiveCol = (col) => {
    setSelectedSensitive((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleStartAudit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a dataset file.');
      return;
    }
    if (selectedSensitive.length === 0) {
      setError('Please select at least one sensitive demographic attribute.');
      return;
    }
    if (!targetColumn) {
      setError('Please select a target/outcome column.');
      return;
    }

    setRunningAudit(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', auditName);
      formData.append('sensitive_columns', JSON.stringify(selectedSensitive));
      formData.append('target_column', targetColumn);
      if (predictionColumn) {
        formData.append('prediction_column', predictionColumn);
      }
      formData.append('language', language);

      const audit = await auditApi.runAudit(formData);
      navigate(`/audit/${audit.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initialize audit.');
      setRunningAudit(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
          Create New AI Bias Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload any tabular dataset (CSV / Excel). FairLens auto-detects protected demographics and tests 4 fairness dimensions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!file ? (
        <div
          {...getRootProps()}
          className={`p-12 sm:p-16 rounded-3xl glass-panel border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-4 ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-white/[0.15] hover:border-indigo-500/50 hover:bg-white/[0.02]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-white">
              {isDragActive ? 'Drop your CSV here...' : 'Click to browse or drag & drop CSV/Excel'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports .csv, .xlsx, .xls up to 10MB
            </p>
          </div>
        </div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleStartAudit}
          className="space-y-6"
        >
          {/* File Selected Badge */}
          <div className="p-4 rounded-2xl glass-panel border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-white">{file.name}</span>
                <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB · {detectedColumns.length} columns detected</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDetectedColumns([]);
                setSelectedSensitive([]);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Audit Config Card */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/[0.08] space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Audit Title</label>
              <input
                type="text"
                value={auditName}
                onChange={(e) => setAuditName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                required
              />
            </div>

            {/* Sensitive Columns Selector */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Protected Sensitive Attributes ({selectedSensitive.length} selected)
                </label>
                <span className="text-[10px] text-indigo-400 font-mono">Auto-detected keywords flagged</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {detectedColumns.map((col) => {
                  const isSelected = selectedSensitive.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleSensitiveCol(col)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-500'
                          : 'glass-panel text-slate-400 hover:text-slate-200 hover:border-white/[0.2]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  Decision / Target Column (Ground Truth)
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs"
                >
                  {detectedColumns.map((c) => (
                    <option key={c} value={c} className="bg-[#0f1422] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  AI Prediction Column (Optional)
                </label>
                <select
                  value={predictionColumn}
                  onChange={(e) => setPredictionColumn(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs"
                >
                  <option value="" className="bg-[#0f1422] text-slate-400">
                    -- Same as Target (Audit Ground Truth) --
                  </option>
                  {detectedColumns.map((c) => (
                    <option key={c} value={c} className="bg-[#0f1422] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                AI Explanation Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs"
              >
                {['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Portuguese', 'Japanese', 'Chinese'].map((l) => (
                  <option key={l} value={l} className="bg-[#0f1422] text-white">
                    {l}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={runningAudit}
              className="px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {runningAudit ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{runningAudit ? 'Auditing AI Dataset...' : 'Launch FairLens 2.0 Audit'}</span>
            </button>
          </div>
        </motion.form>
      )}

    </div>
  );
};
