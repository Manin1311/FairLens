import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export const GlowingGauge = ({ score = 0, riskLevel = 'LOW', size = 180, subtitle = 'Overall Fairness Score' }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorScheme = {
    ring: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    text: 'text-emerald-400',
    bg: 'from-emerald-500/10 to-transparent',
    icon: ShieldCheck,
    label: 'Low Bias Risk'
  };

  if (score < 50 || riskLevel === 'HIGH') {
    colorScheme = {
      ring: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.4)',
      text: 'text-rose-400',
      bg: 'from-rose-500/10 to-transparent',
      icon: AlertOctagon,
      label: 'High Bias Risk'
    };
  } else if (score < 75 || riskLevel === 'MEDIUM') {
    colorScheme = {
      ring: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      text: 'text-amber-400',
      bg: 'from-amber-500/10 to-transparent',
      icon: AlertTriangle,
      label: 'Moderate Risk'
    };
  }

  const Icon = colorScheme.icon;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl glass-panel overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-to-b opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${colorScheme.glow} 0%, transparent 70%)`
        }}
      />

      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Animated Gauge Ring */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke={colorScheme.ring}
            strokeWidth="12"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0 0 8px ${colorScheme.glow})`
            }}
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span 
            className="font-display font-black text-4xl text-white tracking-tight"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {score}
          </motion.span>
          <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1.5 z-10">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.05] border border-white/[0.08] ${colorScheme.text}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{riskLevel} RISK ({colorScheme.label})</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
  );
};
