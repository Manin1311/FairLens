import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  Bot, 
  Layers, 
  Zap, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  TrendingUp,
  Cpu,
  BarChart3,
  Lock,
  Globe,
  Sliders
} from 'lucide-react';
import { GlowingGauge } from '../components/GlowingGauge';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { user } = useAuth();
  const caseStudies = [
    {
      title: 'COMPAS Recidivism AI',
      domain: 'US Criminal Justice',
      finding: 'Black defendants flagged as "high risk" at 2.1× higher false positive rate than white defendants.',
      risk: 'HIGH RISK',
      badgeColor: 'rose'
    },
    {
      title: 'Global Tech Hiring Filter',
      domain: 'Recruitment AI',
      finding: 'CV parsing model penalized candidate resumes containing words like "women\'s" or women\'s colleges by 57%.',
      risk: 'HIGH RISK',
      badgeColor: 'rose'
    },
    {
      title: 'Healthcare Risk Scoring',
      domain: 'Patient Allocation',
      finding: 'Black patients assigned substantially lower health urgency scores due to unequal historical expenditure metrics.',
      risk: 'CRITICAL',
      badgeColor: 'rose'
    }
  ];

  const features2 = [
    {
      icon: Zap,
      title: 'Autonomous Bias Mitigation',
      badge: '2.0 SUPERPOWER',
      desc: 'One-click mathematical calibration. Optimize group decision thresholds and export de-biased CSV datasets.'
    },
    {
      icon: Layers,
      title: 'Intersectional 2D Matrix',
      badge: 'CROSS-ANALYSIS',
      desc: 'Audit compound disparities across intersecting demographics (e.g. Race × Gender × Age).'
    },
    {
      icon: Bot,
      title: 'LLM & Prompt Bias Auditor',
      badge: 'GEN AI READY',
      desc: 'Inspect Generative AI prompts and system instructions for stereotypes, sentiment skew, and toxicity.'
    },
    {
      icon: Scale,
      title: 'Regulatory Scorecards',
      badge: 'LEGAL SHIELD',
      desc: 'Automated compliance certification against the EU AI Act, US EEOC 80% Rule, NYC LL144, and ISO 42001.'
    },
    {
      icon: Sliders,
      title: 'Counterfactual Individual Tester',
      badge: 'INDIVIDUAL FAIRNESS',
      desc: 'Simulate candidate attribute mutation: test if flipping gender or race reverses the algorithm decision.'
    },
    {
      icon: Sparkles,
      title: 'Gemini 2.5 Flash Explanations',
      badge: 'MULTI-KEY ROTATION',
      desc: 'Plain-English verdicts, 5-step remediation roadmaps, and contextual interactive Q&A.'
    }
  ];

  return (
    <div className="relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="ambient-glow-indigo top-[-150px] left-[10%]" />
      <div className="ambient-glow-purple top-[400px] right-[5%]" />
      <div className="cyber-grid absolute inset-0 opacity-40 pointer-events-none" />

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          
          {/* Top Pill */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>FairLens 2.0 is Live — Autonomous AI Governance & Mitigation</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white leading-[1.1]"
          >
            Detect, Audit & <span className="gradient-text">Eliminate AI Bias</span> in Minutes.
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            Empower your team with state-of-the-art fairness metrics (DPD, EOD, DIR 80% Rule), 1-click dataset de-biasing, and Google Gemini 2.5 Flash plain-English executive reports.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              to="/demo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <span>Try Live Demo (No Login)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/llm-audit"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm text-slate-200 glass-panel hover:bg-white/[0.08] border border-white/[0.12] flex items-center justify-center gap-2 transition-all"
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Audit LLM Prompt Bias</span>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EU AI Act Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EEOC 4/5ths Rule Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero ML Expertise Needed</span>
            </div>
          </motion.div>

        </div>

        {/* Hero Interactive Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8 }}
          className="mt-16 p-6 sm:p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl relative overflow-hidden max-w-5xl mx-auto"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                AUDIT PREVIEW · COMPAS Recidivism Dataset
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
                Plain-English Verdict with Autonomous Fix Roadmap
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                "Severe demographic disparity detected: Protected racial sub-groups exhibit a Disparate Impact Ratio of 0.552 (failing EEOC 80% four-fifths rule), requiring mitigation before model deployment."
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Link
                  to="/demo"
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                >
                  <span>Explore full interactive dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <GlowingGauge score={56} riskLevel="MEDIUM" size={170} subtitle="COMPAS Baseline Fairness" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Real World Problem Section ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block mb-2">
            The Algorithmic Crisis
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
            AI Bias is Not Hypothetical. It Discriminates Today.
          </h2>
          <p className="text-sm text-slate-400 mt-3">
            Over 83% of automated HR and credit scoring tools exhibit measurable discrimination across protected demographics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {caseStudies.map((caseItem, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl glass-panel border border-rose-500/20 hover:border-rose-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {caseItem.risk}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{caseItem.domain}</span>
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">
                  {caseItem.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {caseItem.finding}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Documented real-world case</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-2">
            Engineered For Precision
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
            Everything Needed For Autonomous AI Governance
          </h2>
          <p className="text-sm text-slate-400 mt-3">
            From tabular datasets to Generative AI prompt safety, FairLens 2.0 provides an end-to-end fairness ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features2.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl glass-panel border border-white/[0.08] hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-base font-display font-bold text-white">
                      {f.title}
                    </h3>
                  </div>
                  <span className="inline-block text-[10px] font-mono font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/15 mb-3">
                    {f.badge}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── Call to Action ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl glass-panel border border-indigo-500/30 text-center relative overflow-hidden bg-gradient-to-b from-indigo-500/[0.08] to-transparent">
          <div className="ambient-glow-indigo top-[-100px] left-[30%]" />
          <h2 className="text-3xl sm:text-5xl font-display font-black text-white relative z-10">
            Audit & De-bias Your AI Today.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mt-4 relative z-10 leading-relaxed">
            No credit card, no complex ML pipelines required. Try the live interactive demo or upload your CSV in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 relative z-10">
            <Link
              to="/demo"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/25 transition-all"
            >
              Launch Live Demo
            </Link>
            <Link
              to={user ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-slate-200 glass-panel hover:bg-white/[0.08] border border-white/[0.12] transition-all"
            >
              {user ? "Go to Dashboard →" : "Create Account Free"}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
