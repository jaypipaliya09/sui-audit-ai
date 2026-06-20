'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, useReducedMotion } from 'framer-motion';
import {
  FileCode2, Brain, BarChart3, Database, Shield, Zap, Lock,
  AlertTriangle, ChevronDown, CheckCircle2,
  GitBranch, AlertCircle, Cpu, Clock, Share2, Sparkles, Eye, Layers,
} from 'lucide-react';
import { ScrollProgress } from '@/components/home/HomeUI';

// Sparse deterministic motes (fixed positions avoid SSR/CSR hydration drift)
const HIW_MOTES = [
  { x: 12, y: 28, s: 1.5, d: 9, delay: 0, c: 'rgba(212,189,138,0.5)' },
  { x: 28, y: 64, s: 1, d: 11, delay: 1.4, c: 'rgba(52,211,153,0.4)' },
  { x: 60, y: 22, s: 1.5, d: 10, delay: 0.7, c: 'rgba(212,189,138,0.4)' },
  { x: 80, y: 56, s: 1, d: 12, delay: 2, c: 'rgba(52,211,153,0.35)' },
  { x: 90, y: 30, s: 1.5, d: 9.5, delay: 1, c: 'rgba(212,189,138,0.45)' },
];

/* ─── Data ─────────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: '01', icon: FileCode2, title: 'Input Source Code',
    subtitle: 'Paste a module or scan a GitHub repo',
    description: 'Paste your Sui Move source code into the Monaco editor, or directly scan any public GitHub repository to audit an entire project.',
    details: ['Supports single valid Sui Move modules (up to 50KB)', 'Scans entire GitHub repositories for Move projects', 'Built-in demo contracts available', 'Automatically parses and resolves dependencies for repos'],
    color: 'emerald',
    code: `module vulnerable_defi::vault {\n  use sui::coin::{Self, Coin};\n  use sui::balance::{Self, Balance};\n  use sui::sui::SUI;\n\n  // ⚠️  BUG: No access control\n  public entry fun withdraw(\n    vault: &mut Vault,\n    amount: u64,\n    ctx: &mut TxContext,\n  ) {\n    let withdrawn = balance::split(\n      &mut vault.total_balance, amount\n    );\n  }\n}`,
  },
  {
    number: '02', icon: GitBranch, title: 'Repository Compilation (Optional)',
    subtitle: 'For GitHub Repo Audits',
    description: 'If auditing a GitHub repository, our custom worker clones the repo, resolves all dependencies, and compiles the Move project to ensure validity before analysis.',
    details: ['Secure, isolated build environments using Docker', 'Fetches dependencies from GitHub or local paths', 'Verifies compilation to catch syntax errors early', 'Prepares a structured package for AI analysis'],
    color: 'cyan',
    code: null,
  },
  {
    number: '03', icon: Brain, title: 'AI Analysis Begins',
    subtitle: 'Claude Sonnet 4 scans deeply',
    description: 'Your code is queued in BullMQ and analyzed by Claude Sonnet 4 across 14 vulnerability categories. Repo audits analyze all modules in context.',
    details: ['Real-time progress via Server-Sent Events', '14 vulnerability categories analyzed', 'Move-specific checks: object confusion, capability misuse', 'Cross-module analysis for repository audits'],
    color: 'violet',
    code: null,
  },
  {
    number: '04', icon: BarChart3, title: 'Structured Report',
    subtitle: 'Findings with severity & fixes',
    description: 'Claude returns a typed JSON report with every finding categorized by severity — title, impact, and recommendations.',
    details: ['Severity levels: Critical, High, Medium, Low, Info', 'Each finding includes impact and recommendation', 'Vulnerable code snippets highlighted', 'Executive summary + overall risk rating'],
    color: 'amber',
    code: null,
  },
  {
    number: '05', icon: Database, title: 'Stored on Walrus',
    subtitle: 'Permanent, shareable link',
    description: 'The full report is uploaded to Walrus decentralized storage. You get a permanent blob ID and URL.',
    details: ['Permanent, censorship-resistant storage', 'Blob ID saved for fast retrieval', 'Report URL never expires', 'View raw report on the Walrus aggregator'],
    color: 'emerald',
    code: null,
  },
];

const VULN_CATEGORIES = [
  { name: 'Access Control', icon: Lock, desc: 'Missing capability checks' },
  { name: 'Integer Overflow', icon: AlertTriangle, desc: 'Arithmetic without safe bounds' },
  { name: 'Reentrancy', icon: GitBranch, desc: 'State changes after external calls' },
  { name: 'Shared Object Race', icon: Cpu, desc: 'Concurrent access on shared objects' },
  { name: 'Capability Misuse', icon: Shield, desc: 'Transferable or droppable capabilities' },
  { name: 'Object Confusion', icon: AlertCircle, desc: 'Incorrect object type handling' },
  { name: 'Gas Abuse', icon: Zap, desc: 'Unbounded loops and expensive patterns' },
  { name: 'Missing Validation', icon: CheckCircle2, desc: 'Unchecked inputs and zero-value bypasses' },
];

const FAQS = [
  { q: 'Is my contract code stored anywhere?', a: 'Your source code is processed in-memory during analysis and is not stored permanently. Only the audit report is stored on Walrus.' },
  { q: 'How accurate is the AI analysis?', a: 'Claude Sonnet 4 is excellent at pattern-matching known vulnerability types in Move. For production contracts, we recommend using this alongside professional manual audits.' },
  { q: 'What is Walrus?', a: 'Walrus is a decentralized blob storage network on Sui. Reports stored there are censorship-resistant, permanent, and accessible to anyone with the blob ID.' },
  { q: 'How long does an audit take?', a: 'Most contracts complete in 30–90 seconds. You watch live progress via Server-Sent Events.' },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'rgba(52,211,153,0.15)', gradient: 'from-emerald-500 to-emerald-300' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'rgba(139,92,246,0.15)', gradient: 'from-violet-500 to-violet-300' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'rgba(245,158,11,0.15)', gradient: 'from-amber-500 to-amber-300' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.15)', gradient: 'from-cyan-500 to-cyan-300' },
};

/* ─── Animated Step Card ───────────────────────────────────────────── */
function StepCard({ step, idx }: { step: typeof STEPS[0]; idx: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const c = colorMap[step.color];
  const isEven = idx % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-12 items-center`}
    >
      {/* Left: Content */}
      <div className="flex-1 space-y-5">
        <motion.div
          initial={{ opacity: 0, x: isEven ? -30 : 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -5 }}
              className={`relative w-12 h-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center`}
              style={{ boxShadow: `0 0 30px ${c.glow}` }}
            >
              <step.icon className={`w-5 h-5 ${c.text}`} />
              <div className="absolute inset-0 rounded-2xl hiw-pulse-ring border border-current opacity-0" style={{ borderColor: c.glow }} />
            </motion.div>
            <div>
              <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${c.text} mb-1`}>
                Step {step.number}
              </div>
              <h2 className="font-display text-2xl md:text-[1.7rem] font-medium text-ivory tracking-[-0.01em] leading-tight">{step.title}</h2>
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
        </motion.div>

        <motion.ul
          className="space-y-2.5"
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } } }}
        >
          {step.details.map((detail) => (
            <motion.li
              key={detail}
              variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
              className="flex items-start gap-2.5 text-[13px] text-zinc-500"
            >
              <CheckCircle2 className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
              {detail}
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Right: Visual */}
      <motion.div
        className="flex-1 w-full"
        initial={{ opacity: 0, scale: 0.92, rotateY: isEven ? -15 : 15 }}
        animate={isInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1000 }}
      >
        {step.code ? (
          <div className="relative group hiw-card-3d">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-emerald-500/5 to-champagne-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl hiw-aurora" />
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-900/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#08080a]/90 backdrop-blur-xl shadow-2xl shadow-emerald-950/40 group-hover:shadow-[0_0_80px_-20px_rgba(52,211,153,0.3)] transition-all duration-500 transform-gpu group-hover:scale-[1.02]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="ml-2 text-[11px] text-zinc-500 font-mono tracking-widest uppercase">vault.move</span>
              </div>
              <div className="relative">
                <div className="hiw-scan-line bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
                <pre className="p-4 text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <StepVisual step={step} idx={idx} />
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Animated visuals for non-code steps ─────────────────────────── */
function StepVisual({ step, idx }: { step: typeof STEPS[0]; idx: number }) {
  const c = colorMap[step.color];
  return (
    <div className="relative rounded-2xl border border-white/[0.07] bg-[#0a0a0c]/80 backdrop-blur-xl p-8 overflow-hidden min-h-[260px] flex items-center justify-center group hiw-card-3d hover:shadow-[0_0_80px_-20px_var(--glow)] transition-all duration-700 hover:scale-[1.02]" style={{ '--glow': c.glow } as any}>
      {/* Dynamic background effects */}
      <div className="absolute inset-0 hiw-dot-grid opacity-[0.15]" />
      <div className="absolute -inset-10 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 hiw-aurora" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80" />
      
      {/* Orbiting rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700">
        <div className="w-48 h-48 rounded-full border border-white/[0.05] hiw-orbit shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]" />
        <div className="absolute w-64 h-64 rounded-full border border-dashed border-white/[0.04] hiw-orbit-reverse" />
        <div className="absolute w-80 h-80 rounded-full border border-white/[0.02] hiw-orbit" style={{ animationDuration: '40s' }} />
      </div>

      {/* Center content */}
      <motion.div
        whileHover={{ scale: 1.15, y: -5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="relative z-10 flex flex-col items-center gap-5 hiw-float"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl hiw-ripple bg-white/5 pointer-events-none" style={{ background: c.gradient }} />
          <div
            className={`relative w-20 h-20 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center hiw-glow-pulse backdrop-blur-md overflow-hidden hiw-shimmer`}
            style={{ boxShadow: `0 0 50px ${c.glow}` }}
          >
            <step.icon className={`w-8 h-8 ${c.text} drop-shadow-[0_0_15px_currentColor]`} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">{step.title}</div>
          <div className="text-xs text-zinc-500 mt-1">{step.subtitle}</div>
        </div>
        {/* Floating particles */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-gradient-to-br ${c.gradient} hiw-particle`}
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 25}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Timeline connector ──────────────────────────────────────────── */
function TimelineConnector({ idx }: { idx: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="hidden lg:flex justify-center py-6 relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-2xl">
        <div className="w-32 h-32 bg-gradient-to-b from-jade-500/20 to-transparent rounded-full hiw-pulse-ring" />
      </div>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={isInView ? { height: 80, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-[2px] bg-gradient-to-b from-jade-400/50 via-champagne-400/30 to-transparent relative rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ top: ['-20%', '120%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-1/3 bg-gradient-to-b from-transparent via-white to-transparent opacity-80"
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.8 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-jade-400/50 bg-[#08080a] flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)]"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-jade-300 hiw-glow-pulse" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Vulnerability Card ──────────────────────────────────────────── */
function VulnCard({ cat, i }: { cat: typeof VULN_CATEGORIES[0]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: 10 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative p-5 rounded-2xl border border-white/[0.05] bg-[#0a0a0c]/60 backdrop-blur-md group transition-all duration-500 hover:border-emerald-500/30 hover:shadow-[0_20px_40px_-15px_rgba(52,211,153,0.15)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#121215] to-[#0a0a0c] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:border-emerald-500/30 transition-colors shadow-lg">
        <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hiw-pulse-ring" />
        <cat.icon className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors drop-shadow-[0_0_8px_currentColor]" />
      </div>
      <div className="relative">
        <div className="text-sm font-bold text-zinc-200 mb-1.5 group-hover:text-white transition-colors tracking-tight">{cat.name}</div>
        <div className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">{cat.desc}</div>
      </div>
    </motion.div>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────────────── */
function FaqItem({ q, a, i }: { q: string; a: string; i: number }) {
  return (
    <motion.details
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.08 }}
      className="group rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden hover:border-jade-400/20 transition-colors"
    >
      <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-white/[0.015] transition-colors">
        <span className="text-sm font-medium text-zinc-300 pr-4">{q}</span>
        <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0 group-open:rotate-180 transition-transform duration-300" />
      </summary>
      <div className="px-5 pb-5">
        <p className="text-[13px] text-zinc-500 leading-relaxed">{a}</p>
      </div>
    </motion.details>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function HowItWorksPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-screen bg-obsidian pt-20 pb-16 overflow-hidden">
      <ScrollProgress />

      {/* page-level grain + vignette for a framed, material feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.022] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 220px 50px rgba(0,0,0,0.5)' }} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden py-24 text-center">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* champagne-tinted masked grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(212,189,138,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,189,138,0.04) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse 65% 55% at 50% 32%, #000 35%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 32%, #000 35%, transparent 100%)',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <div className="absolute inset-0 rounded-full border border-jade-500/[0.06] hiw-orbit" />
            <div className="absolute inset-8 rounded-full border border-dashed border-champagne-400/[0.05] hiw-orbit-reverse" />
            <div className="absolute inset-16 rounded-full border border-jade-500/[0.04] hiw-orbit" style={{ animationDuration: '30s' }} />
          </div>
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-jade-600/[0.07] rounded-full blur-[130px]"
            animate={reduce ? undefined : { opacity: [0.6, 1, 0.6], scale: [1, 1.06, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute bottom-0 left-1/3 w-[300px] h-[200px] bg-champagne-500/[0.04] rounded-full blur-[100px]" />
          {/* champagne top hairline */}
          <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
          {/* floating motes */}
          {!reduce && HIW_MOTES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: p.c }}
              animate={{ y: [0, -22, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
            />
          ))}
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-jade-500/20 bg-jade-500/[0.06] text-jade-400 text-xs font-medium mb-7 overflow-hidden"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
              style={{ animation: reduce ? undefined : 'hiw-shimmer-slide 3.5s ease-in-out infinite' }}
            />
            <Sparkles className="relative w-3 h-3" />
            <span className="relative">Technical walkthrough</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl md:text-[3.6rem] font-medium text-ivory tracking-[-0.02em] mb-5 leading-[1.05]"
          >
            How{' '}
            <motion.span
              className="not-italic bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(110deg, #6ee7b7 0%, #34d399 30%, #ffffff 50%, #34d399 60%, #d4bd8a 100%)',
                backgroundSize: '260% 100%',
              }}
              animate={reduce ? undefined : { backgroundPosition: ['120% 50%', '-40% 50%'] }}
              transition={{ backgroundPosition: { duration: 7, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' } }}
            >
              SuiAudit AI
            </motion.span>{' '}
            Works
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-[15px] text-zinc-400 leading-relaxed max-w-lg mx-auto"
          >
            From pasting your contract to a permanent report on Walrus — here&apos;s exactly what happens.
          </motion.p>

          {/* meta row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-zinc-500"
          >
            {[
              { icon: Layers, text: '5 steps end-to-end' },
              { icon: Clock, text: '~60s per audit' },
              { icon: Eye, text: 'Live progress streaming' },
            ].map((m) => (
              <span key={m.text} className="inline-flex items-center gap-1.5">
                <m.icon className="w-3.5 h-3.5 text-jade-400/80" /> {m.text}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 140, opacity: 1 }}
            transition={{ duration: 1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="h-px mx-auto mt-9 bg-gradient-to-r from-transparent via-champagne-400/50 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── STEPS ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-6">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.number}>
            <StepCard step={step} idx={idx} />
            {idx < STEPS.length - 1 && <TimelineConnector idx={idx} />}
          </React.Fragment>
        ))}
      </section>

      {/* ── VULNERABILITY CATEGORIES ─────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/20 to-transparent" />
        <div className="absolute inset-0 hiw-dot-grid opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2.5 mb-4">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">Security Coverage</span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-champagne-400/70" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-ivory tracking-tight mb-3">
              14 Vulnerability <span className="lux-gradient">Categories</span>
            </h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">
              Built specifically for the Sui Move execution model.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VULN_CATEGORIES.map((cat, i) => (
              <VulnCard key={cat.name} cat={cat} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-16 max-w-2xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">Good to Know</span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-champagne-400/70" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-medium text-ivory tracking-tight">
            Frequently Asked <span className="lux-gradient">Questions</span>
          </h2>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} i={idx} />
          ))}
        </div>
      </section>
    </main>
  );
}
