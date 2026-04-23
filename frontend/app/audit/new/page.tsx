"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  ShieldCheck, Upload, CheckCircle2, ChevronRight,
  X, AlertCircle, Loader2, BarChart3
} from "lucide-react";
import { auditAPI } from "@/lib/api";

type Step = "upload" | "configure" | "analyzing";

export default function NewAuditPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [detectedSensitive, setDetectedSensitive] = useState<string[]>([]);
  const [detectedTarget, setDetectedTarget] = useState("");
  const [auditName, setAuditName] = useState("");
  const [selectedSensitive, setSelectedSensitive] = useState<string[]>([]);
  const [targetCol, setTargetCol] = useState("");
  const [predCol, setPredCol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setError("");
    setLoading(true);
    try {
      const res = await auditAPI.detectColumns(f);
      setColumns(res.data.columns);
      setDetectedSensitive(res.data.detected_sensitive);
      setDetectedTarget(res.data.detected_target);
      setSelectedSensitive(res.data.detected_sensitive);
      setTargetCol(res.data.detected_target);
      setAuditName(f.name.replace(/\.[^/.]+$/, "") + " Audit");
      setStep("configure");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to read file. Please use CSV or Excel.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".xls", ".xlsx"] },
    maxFiles: 1, multiple: false,
  });

  const toggleSensitive = (col: string) =>
    setSelectedSensitive((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const runAnalysis = async () => {
    if (!file || !auditName || selectedSensitive.length === 0 || !targetCol) {
      setError("Please fill in all required fields."); return;
    }
    setStep("analyzing");
    setLoading(true);
    const msgs = [
      "Loading dataset...", "Detecting sensitive attributes...",
      "Computing bias metrics...", "Calculating fairness scores...",
      "Calling Gemini AI for insights...", "Generating fix suggestions...",
      "Finalising audit report..."
    ];
    let i = 0;
    setProgressMsg(msgs[0]);
    const interval = setInterval(() => {
      i++;
      if (i < msgs.length) { setProgressMsg(msgs[i]); setProgress(Math.round((i / msgs.length) * 85)); }
    }, 2000);
    try {
      const res = await auditAPI.runAudit(file, auditName, selectedSensitive, targetCol, predCol || undefined);
      clearInterval(interval);
      setProgress(100);
      setProgressMsg("Done! Redirecting...");
      setTimeout(() => router.push(`/audit/${res.data.id}`), 800);
    } catch (e: any) {
      clearInterval(interval);
      setError(e.response?.data?.detail || "Analysis failed. Please try again.");
      setStep("configure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">
            <BarChart3 size={20} />
          </Link>
          <ChevronRight size={16} className="text-slate-600" />
          <h1 className="text-xl font-bold text-white">New Bias Audit</h1>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="glass p-8">
                <h2 className="text-xl font-semibold text-white mb-2">Upload Your Dataset</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Upload a CSV or Excel file containing AI decision outputs. FairLens will auto-detect sensitive columns.
                </p>

                {error && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
                    ${isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]"}
                    ${loading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input {...getInputProps()} id="file-upload" />
                  {loading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="text-blue-400 animate-spin" size={36} />
                      <p className="text-slate-400">Analysing columns...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className={`mx-auto mb-4 ${isDragActive ? "text-blue-400" : "text-slate-600"}`} size={40} />
                      <p className="text-white font-medium mb-1">
                        {isDragActive ? "Drop it!" : "Drag & drop your dataset here"}
                      </p>
                      <p className="text-slate-500 text-sm mb-4">or click to browse</p>
                      <span className="text-xs text-slate-600 px-3 py-1 rounded-full border border-white/10">
                        CSV · XLS · XLSX · Max 10MB
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-sm text-slate-500 mb-3">Or try a demo dataset:</p>
                  <div className="flex gap-3">
                    {["compas", "adult_income", "german_credit"].map((d) => (
                      <Link key={d} href={`/demo?dataset=${d}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-colors capitalize">
                        {d.replace("_", " ")}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Configure */}
          {step === "configure" && (
            <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="text-green-400" size={20} />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Configure Analysis</h2>
                    <p className="text-slate-500 text-sm">{file?.name} · {columns.length} columns detected</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Audit name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Audit Name *</label>
                    <input id="audit-name" type="text" value={auditName} onChange={(e) => setAuditName(e.target.value)}
                      placeholder="e.g. Q1 2026 Hiring Model Audit" className="input-field" />
                  </div>

                  {/* Sensitive columns */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Sensitive Attributes *
                      <span className="text-slate-500 font-normal ml-2">
                        ({selectedSensitive.length} selected)
                      </span>
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Columns representing protected characteristics (gender, race, age, caste…)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {columns.map((col) => {
                        const isSelected = selectedSensitive.includes(col);
                        const isDetected = detectedSensitive.includes(col);
                        return (
                          <button key={col} type="button" onClick={() => toggleSensitive(col)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                              ${isSelected
                                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"}`}>
                            {col}
                            {isDetected && <span className="ml-1 text-blue-400">✦</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">✦ = auto-detected</p>
                  </div>

                  {/* Target column */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Target / Decision Column *</label>
                    <p className="text-xs text-slate-500 mb-2">The column that represents the AI&apos;s final decision (hired/not hired, approved/denied…)</p>
                    <select id="target-column" value={targetCol} onChange={(e) => setTargetCol(e.target.value)}
                      className="input-field">
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Prediction column (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Prediction Column <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-2">If your file has a separate model prediction column, select it here.</p>
                    <select id="pred-column" value={predCol} onChange={(e) => setPredCol(e.target.value)}
                      className="input-field">
                      <option value="">— None (use target column) —</option>
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={() => { setStep("upload"); setFile(null); setColumns([]); }}
                    className="btn-ghost">
                    ← Back
                  </button>
                  <button id="run-analysis-btn" onClick={runAnalysis} className="btn-primary flex-1 justify-center py-3">
                    Run Bias Analysis <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Analyzing */}
          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="glass p-12 text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                      className="transition-all duration-700" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-blue-400 font-bold text-lg">
                    {progress}%
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Analysing Your Dataset</h2>
                <p className="text-slate-400 text-sm mb-6">{progressMsg}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Powered by Google Gemini AI
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
