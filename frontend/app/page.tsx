"use client";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import {
  ShieldCheck, BarChart3, Zap, FileText,
  ArrowRight, CheckCircle2, Brain, Scale,
  AlertTriangle, TrendingUp, Users, Globe,
  Lock, ChevronRight, Sun, Moon
} from "lucide-react";

/* ─── Animated Counter ───────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Bias Score Ring ─────────────────────────────────────────────── */
function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 40; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
          <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeLinecap="round"
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * (1 - score / 100) }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-500">/100</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 text-center max-w-[90px]">{label}</span>
    </div>
  );
}

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("fairlens_token"));
    const saved = localStorage.getItem("fairlens_theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("light", !newDark);
    localStorage.setItem("fairlens_theme", newDark ? "dark" : "light");
  };
  return (
    <div className="hero-bg min-h-screen overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={24} />
            <span className="text-xl font-bold gradient-text-blue">FairLens</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#problem" className="hover:text-white transition-colors">The Problem</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#compliance" className="hover:text-white transition-colors">Compliance</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme}
              className="p-2 rounded-xl transition-all border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
              title={isDark ? "Switch to Light" : "Switch to Dark"}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {loggedIn ? (
              <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">


          <motion.h1 className="text-6xl md:text-7xl font-extrabold leading-[1.08] mb-6"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            AI Is Making<br />
            <span className="gradient-text">Biased Decisions.</span><br />
            We Stop That.
          </motion.h1>

          <motion.p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            Hiring algorithms, loan approvals, medical diagnoses — AI is discriminating against real people right now.
            FairLens detects hidden bias in minutes and shows you exactly how to fix it.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Link href="/register" className="btn-primary text-base px-8 py-3.5 glow-blue">
              Start Free Audit <ArrowRight size={18} />
            </Link>
            <Link href="/demo" className="btn-ghost text-base px-8 py-3.5">
              <Zap size={16} className="text-yellow-400" /> Try Live Demo — No Login
            </Link>
          </motion.div>

          {/* Live Stats */}
          <motion.div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {[
              { val: 83, suffix: "%", label: "of HR AI tools show gender bias", color: "#ef4444" },
              { val: 60, suffix: "s", label: "to get a full bias audit report", color: "#3b82f6" },
              { val: 3, suffix: "", label: "industry-standard fairness metrics", color: "#22c55e" },
              { val: 100, suffix: "%", label: "free — no credit card needed", color: "#a78bfa" },
            ].map((s) => (
              <div key={s.label} className="glass p-4 text-center">
                <div className="text-3xl font-black stat-number mb-1" style={{ color: s.color }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 leading-tight">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Live Product Preview */}
          <motion.div className="mt-16 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
            <div className="text-xs text-slate-500 text-center mb-3 uppercase tracking-widest">↓ Live audit result preview</div>
            <div className="glass p-5 rounded-2xl" style={{ border: "1px solid rgba(59,130,246,0.25)" }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">COMPAS Recidivism Dataset · 1,000 rows</div>
                  <div className="font-bold text-white">Criminal Risk Scoring Audit</div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold risk-high">HIGH RISK</span>
              </div>
              {/* Score + metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Fairness Score", val: "56/100", color: "#f59e0b" },
                  { label: "DPD (Race)", val: "0.309", color: "#ef4444" },
                  { label: "DIR (Race)", val: "0.552", color: "#ef4444" },
                  { label: "EU AI Act", val: "FAIL", color: "#ef4444" },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                    <div className="font-black text-sm" style={{ color: m.color }}>{m.val}</div>
                  </div>
                ))}
              </div>
              {/* Gemini verdict card */}
              <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.2)" }}>
                <div className="text-xs font-bold text-yellow-400 mb-1">⚡ Gemini AI Verdict</div>
                <p className="text-xs text-slate-300">This criminal risk system shows <strong>severe racial bias</strong> — Black defendants are flagged as high risk at twice the rate of white defendants with identical records.</p>
              </div>
              {/* Key findings */}
              <div className="space-y-1.5">
                {["Race drives 67% of all bias (Cramér's V)","Black group: 31% positive rate vs White: 68%","Fails EEOC 4/5 Rule — DIR 0.552 < 0.80 threshold"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>{f}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Link href="/demo" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Run this analysis yourself →</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── The Problem (Before FairLens) ────────────────────────────── */}
      <section id="problem" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-4 uppercase tracking-wider">
              <AlertTriangle size={12} /> The Problem Is Real
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Real AI. Real Discrimination.
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              These aren't hypothetical. These are documented cases of AI systems actively discriminating against real people.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: "COMPAS Criminal Risk AI",
                context: "Used in US Courts",
                finding: "Black defendants rated HIGH risk at nearly twice the rate of white defendants with identical records.",
                metric: "2×", metricLabel: "Higher false-positive rate for Black defendants",
                color: "#ef4444", icon: Scale,
              },
              {
                title: "Amazon Hiring Algorithm",
                context: "Recruitment AI",
                finding: "Algorithm penalized resumes that included the word 'women's' and downgraded graduates of all-women's colleges.",
                metric: "−57%", metricLabel: "Score penalty for women's universities",
                color: "#f59e0b", icon: Users,
              },
              {
                title: "Healthcare Resource AI",
                context: "US Hospital Systems",
                finding: "System systematically underestimated how sick Black patients were, resulting in reduced access to care programs.",
                metric: "41%", metricLabel: "Fewer Black patients correctly identified as high-need",
                color: "#a78bfa", icon: Brain,
              },
            ].map((c, i) => (
              <motion.div key={c.title} className="glass p-6"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: `${c.color}15` }}>
                    <c.icon size={20} style={{ color: c.color }} />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-slate-500">{c.context}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{c.finding}</p>
                <div className="pt-4 border-t border-white/5">
                  <div className="text-3xl font-black stat-number mb-1" style={{ color: c.color }}>{c.metric}</div>
                  <div className="text-xs text-slate-500">{c.metricLabel}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Before / After FairLens */}
          <motion.div className="glass p-8"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3 className="text-center text-xl font-bold text-white mb-8">What FairLens Found on COMPAS</h3>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  When we ran the COMPAS dataset through FairLens, it detected severe racial bias in <strong className="text-white">under 30 seconds</strong> — 
                  the same bias that took ProPublica journalists months to uncover manually.
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Demographic Parity Difference", val: "0.317", bad: true, threshold: "threshold: < 0.1" },
                    { label: "Disparate Impact Ratio", val: "0.62", bad: true, threshold: "threshold: > 0.8" },
                    { label: "EEOC 4/5 Rule", val: "FAIL", bad: true, threshold: "62% of 80% threshold" },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div>
                        <div className="text-sm font-medium text-white">{m.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.threshold}</div>
                      </div>
                      <div className="text-red-400 font-bold text-lg stat-number">{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-8">
                <ScoreRing score={38} color="#ef4444" label="White defendants flagged HIGH risk" />
                <ScoreRing score={63} color="#ef4444" label="Black defendants flagged HIGH risk" />
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link href="/demo?dataset=compas" className="btn-primary">
                Run This Analysis Yourself <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">From Data to Insight in 4 Steps</h2>
            <p className="text-slate-400 text-lg">No ML expertise needed. No code. Just upload and go.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { num: "01", icon: FileText, title: "Upload Dataset", desc: "CSV or Excel. FairLens auto-detects sensitive columns like gender, race, and age.", color: "#3b82f6" },
              { num: "02", icon: BarChart3, title: "Bias Engine Runs", desc: "3 industry-standard fairness metrics computed in seconds using Microsoft's fairlearn library.", color: "#a78bfa" },
              { num: "03", icon: Brain, title: "Gemini Explains", desc: "Google Gemini AI translates every metric into plain English. No jargon — just actionable insights.", color: "#22c55e" },
              { num: "04", icon: TrendingUp, title: "Fix & Download", desc: "AI-generated remediation steps + a professional PDF report for your team.", color: "#f59e0b" },
            ].map((step, i) => (
              <motion.div key={step.num} className="glass p-6 relative"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3 }}>
                <div className="text-5xl font-black mb-4" style={{ color: `${step.color}25` }}>{step.num}</div>
                <div className="p-2.5 rounded-xl mb-4 w-fit" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                  <step.icon size={20} style={{ color: step.color }} />
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                {i < 3 && <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 text-slate-700 hidden md:block" size={20} />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg">The most complete AI bias auditing platform — completely free.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: BarChart3, title: "4 Fairness Metrics", desc: "DPD, EOD, DIR + Cramér's V bias attribution — gold standard metrics that tell you WHAT and WHY.", color: "#3b82f6", badge: "Industry Standard" },
              { icon: Brain, title: "Gemini AI Explanations", desc: "Every finding explained in plain English with TL;DR verdict, key findings list, and expandable detail.", color: "#a78bfa", badge: "Powered by Gemini" },
              { icon: Globe, title: "10 Language Support", desc: "Re-generate your entire audit explanation in Hindi, Spanish, French, Arabic, Portuguese, Bengali and more.", color: "#06b6d4", badge: "New" },
              { icon: FileText, title: "PDF Audit Reports", desc: "Professional downloadable reports ready for executives, compliance teams, and regulatory submission.", color: "#22c55e", badge: "" },
              { icon: Scale, title: "Legal Compliance", desc: "EU AI Act, EEOC 4/5 Rule, ISO 42001. Know your legal standing before regulators do.", color: "#ef4444", badge: "" },
              { icon: Zap, title: "Ask Gemini Anything", desc: "Interactive AI chat on your results. 'Who is disadvantaged?' 'What is my legal risk?' Instant answers.", color: "#f59e0b", badge: "" },
              { icon: TrendingUp, title: "What-If Simulator", desc: "Simulate removing any attribute and see your score improve in real-time. Plan your mitigation strategy.", color: "#a78bfa", badge: "" },
              { icon: Users, title: "Shareable Audit Links", desc: "Make any audit public with one click. Share your results with anyone — no account needed to view.", color: "#22c55e", badge: "New" },
              { icon: Lock, title: "No-Login Demo", desc: "Try real bias analysis on COMPAS, Adult Income, and German Credit datasets instantly — zero friction.", color: "#64748b", badge: "" },
            ].map((f, i) => (
              <motion.div key={f.title} className="glass p-6 group hover:border-opacity-50 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${f.color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  {f.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30` }}>
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance Section ────────────────────────────────────────── */}
      <section id="compliance" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div className="glass p-10 text-center"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium mb-6">
              <Lock size={14} /> Regulatory Compliance Ready
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Is Your AI Legally Compliant?</h2>
            <p className="text-slate-400 mb-10 max-w-2xl mx-auto">
              FairLens automatically checks your results against major AI fairness regulations. Know your compliance status before auditors do.
            </p>
            <div className="grid md:grid-cols-3 gap-5 text-left">
              {[
                { name: "EU AI Act", desc: "High-risk AI systems must demonstrate fairness. FairLens flags non-compliant systems.", check: "DPD < 0.1, DIR > 0.8", color: "#3b82f6" },
                { name: "EEOC 4/5 Rule", desc: "US hiring law: selection rate for any group must be ≥ 80% of the most-selected group.", check: "DIR ≥ 0.80 required", color: "#22c55e" },
                { name: "ISO 42001", desc: "International AI management standard requires bias risk assessment for AI systems.", check: "Full bias audit needed", color: "#a78bfa" },
              ].map((c, i) => (
                <motion.div key={c.name} className="p-5 rounded-2xl"
                  style={{ background: `${c.color}08`, border: `1px solid ${c.color}25` }}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} style={{ color: c.color }} />
                    <span className="font-bold text-white">{c.name}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">{c.desc}</p>
                  <div className="text-xs font-mono px-2 py-1.5 rounded-lg" style={{ background: `${c.color}12`, color: c.color }}>
                    {c.check}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Demo CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Try It Live — No Account Needed</h2>
            <p className="text-slate-400">Real datasets. Real bias. Real results in under 60 seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { key: "compas", label: "COMPAS Recidivism", tag: "Criminal Justice", desc: "Racial bias in US criminal risk scoring", risk: "HIGH", color: "#ef4444" },
              { key: "adult_income", label: "Adult Income Census", tag: "Employment", desc: "Gender bias in income prediction", risk: "MEDIUM", color: "#f59e0b" },
              { key: "german_credit", label: "German Credit", tag: "Finance", desc: "Age & gender bias in loan approvals", risk: "MEDIUM", color: "#f59e0b" },
            ].map((d, i) => (
              <motion.div key={d.key}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}>
                <Link href={`/demo?dataset=${d.key}`} className="block glass p-6 h-full hover:border-blue-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">{d.tag}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${d.color}15`, color: d.color, border: `1px solid ${d.color}30` }}>
                      {d.risk} RISK
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{d.label}</h3>
                  <p className="text-sm text-slate-400 mb-4">{d.desc}</p>
                  <div className="flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                    Run Analysis <ArrowRight size={14} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div className="max-w-3xl mx-auto glass p-14 text-center glow-blue"
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <ShieldCheck className="text-blue-400 mx-auto mb-5" size={52} />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Make Your AI Fair Today</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Every biased AI decision harms a real person. It takes under 60 seconds to find out if yours is one of them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-10 py-4 glow-blue">
              Start Free Audit <ArrowRight size={20} />
            </Link>
            <Link href="/demo" className="btn-ghost text-lg px-10 py-4">
              Try Demo First
            </Link>
          </div>
          <p className="text-slate-600 text-sm mt-6">Free forever · No credit card · Google Sign-In supported</p>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={18} />
            <span className="font-bold text-white">FairLens</span>
            <span className="text-slate-600 text-sm ml-2">Making AI Fair for Everyone</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link href="/demo" className="hover:text-white transition-colors">Live Demo</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
