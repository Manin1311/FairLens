"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck, BarChart3, Zap, FileText,
  ArrowRight, CheckCircle2, Database, Brain
} from "lucide-react";

const features = [
  { icon: Database, title: "Upload Any Dataset", desc: "CSV or Excel — FairLens auto-detects sensitive columns like gender, age, caste, race." },
  { icon: BarChart3, title: "Instant Bias Metrics", desc: "Demographic Parity, Equalized Odds, Disparate Impact — computed in seconds with fairlearn." },
  { icon: Brain, title: "Gemini AI Explains It", desc: "No ML jargon. Google Gemini translates every finding into plain, powerful English." },
  { icon: FileText, title: "Download Audit Report", desc: "Professional PDF report with all findings and remediation steps — ready for management." },
];

const steps = [
  { num: "01", title: "Upload Dataset", desc: "Drop your CSV file or choose a demo dataset." },
  { num: "02", title: "Configure & Analyze", desc: "Confirm sensitive columns and run the bias engine." },
  { num: "03", title: "Get AI Insights", desc: "Gemini explains what the bias means and who is affected." },
  { num: "04", title: "Fix & Report", desc: "Download your audit report and apply AI-guided fixes." },
];

const demos = [
  { key: "compas", label: "COMPAS Recidivism", tag: "Criminal Justice", color: "risk-high", desc: "Racial bias in criminal risk scoring" },
  { key: "adult_income", label: "Adult Income", tag: "Employment", color: "risk-medium", desc: "Gender bias in income prediction" },
  { key: "german_credit", label: "German Credit", tag: "Finance", color: "risk-medium", desc: "Age bias in loan approvals" },
];

export default function HomePage() {
  return (
    <div className="hero-bg min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={24} />
            <span className="text-xl font-bold gradient-text-blue">FairLens</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Try Demo</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-400 pulse-dot" />
              Powered by Google Gemini AI
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl font-extrabold leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Is Your AI{" "}
            <span className="gradient-text">Fair?</span>
            <br />
            Find Out in Minutes.
          </motion.h1>

          <motion.p
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Computer programs now decide who gets a job, a bank loan, or medical care.
            FairLens inspects your AI systems for hidden discrimination — and shows you
            exactly how to fix it.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/register" className="btn-primary text-base px-8 py-3 glow-blue">
              Start Free Audit <ArrowRight size={18} />
            </Link>
            <Link href="/demo" className="btn-ghost text-base px-8 py-3">
              Try Demo — No Login Needed
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { val: "3", unit: "Metrics", label: "Industry-standard fairness metrics" },
              { val: "< 60s", unit: "", label: "To get full bias report" },
              { val: "100%", unit: "", label: "Gemini AI powered insights" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white stat-number">{s.val}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How FairLens Works</h2>
            <p className="text-slate-400 text-lg">From raw data to AI-powered audit report in 4 steps</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="glass p-6 text-center relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-5xl font-black text-blue-500/20 mb-3">{step.num}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
                {i < 3 && (
                  <ArrowRight
                    className="absolute -right-4 top-1/2 -translate-y-1/2 text-slate-600 hidden md:block"
                    size={20}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Audit AI Fairly</h2>
            <p className="text-slate-400 text-lg">No ML expertise required. FairLens makes bias detection accessible.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass p-8 flex gap-5 items-start hover:border-blue-500/30 transition-all duration-300"
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                  <f.icon className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Try It Live — No Login Required</h2>
          <p className="text-slate-400 text-lg mb-12">
            Run a real bias analysis on a famous public dataset. See exactly what FairLens finds.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {demos.map((d, i) => (
              <motion.div
                key={d.key}
                className="glass p-6 text-left hover:border-blue-500/30 transition-all duration-300 cursor-pointer group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${d.color} mb-3`}>
                  {d.tag}
                </span>
                <h3 className="font-semibold text-white mb-1">{d.label}</h3>
                <p className="text-sm text-slate-400 mb-4">{d.desc}</p>
                <Link
                  href={`/demo?dataset=${d.key}`}
                  className="text-blue-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Run Analysis <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto glass p-12 text-center glow-blue"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <ShieldCheck className="text-blue-400 mx-auto mb-4" size={48} />
          <h2 className="text-4xl font-bold mb-4">Make Your AI Fair Today</h2>
          <p className="text-slate-400 text-lg mb-8">
            Every biased AI system harms real people. Detect it before it does.
          </p>
          <Link href="/register" className="btn-primary text-lg px-10 py-4 glow-blue">
            Start Your Free Audit <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="text-blue-500/50" size={16} />
          <span className="text-slate-400 font-semibold">FairLens</span>
        </div>
        <p>Making AI Fair for Everyone · Built with Google Gemini · Google Solution Challenge 2026</p>
      </footer>
    </div>
  );
}
