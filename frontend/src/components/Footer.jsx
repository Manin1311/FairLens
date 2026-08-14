import React from 'react';
import { ShieldCheck, Code2, ExternalLink, Cpu, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080d] py-12 px-4 sm:px-6 lg:px-8 mt-20 relative overflow-hidden">
      <div className="ambient-glow-indigo bottom-[-200px] left-[20%] opacity-30" />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
        
        {/* Logo & Tagline */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              FairLens <span className="text-indigo-400 text-xs font-mono">2.0</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm text-center md:text-left">
            Autonomous AI Governance, Bias Mitigation, and Regulatory Compliance Platform powered by Google Gemini 2.5 Flash.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
          <Link to="/demo" className="hover:text-indigo-400 transition-colors">Live Demo</Link>
          <Link to="/llm-audit" className="hover:text-indigo-400 transition-colors">LLM Bias Auditor</Link>
          <a href="https://github.com/Manin1311/Exceptional_Duo" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-indigo-300 font-mono text-[10px]">
            EU AI Act & EEOC Ready
          </span>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-400 text-center md:text-right">
          <p>© {new Date().getFullYear()} FairLens AI. All rights reserved.</p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center md:justify-end gap-1 mt-0.5">
            Making AI Fair for Everyone
          </p>
        </div>

      </div>
    </footer>
  );
};
