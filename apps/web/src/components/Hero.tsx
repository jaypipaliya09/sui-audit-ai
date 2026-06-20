'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from 'framer-motion';
import {
  Zap, ArrowRight, ShieldCheck, Lock, Globe, Clock,
  Activity, GitBranch, CheckCircle2, AlertTriangle,
} from 'lucide-react';

/* ─── Data ────────────────────────────────────────────────────────── */
const STATS = [
  { label: 'Audits Run', value: 2400, prefix: '', suffix: '+', grouped: true },
  { label: 'Vulnerabilities Found', value: 8900, prefix: '', suffix: '+', grouped: true },
  { label: 'Avg. Audit Time', value: 60, prefix: '< ', suffix: 's', grouped: false },
  { label: 'Stored on Walrus', value: 100, prefix: '', suffix: '%', grouped: false },
];

const TRUST = [
  { icon: ShieldCheck, text: 'Move-native analysis' },
  { icon: Lock, text: 'Code never stored' },
  { icon: Globe, text: 'Permanent on Walrus' },
  { icon: Clock, text: 'Results in < 60s' },
];

// Sparse, deterministic motes (avoids SSR/CSR hydration drift)
const PARTICLES = [
  { x: 14, y: 32, s: 1.5, d: 9, delay: 0, c: 'rgba(212,189,138,0.5)' },
  { x: 30, y: 66, s: 1, d: 11, delay: 1.4, c: 'rgba(52,211,153,0.4)' },
  { x: 58, y: 24, s: 1.5, d: 10, delay: 0.7, c: 'rgba(212,189,138,0.4)' },
  { x: 78, y: 58, s: 1, d: 12, delay: 2, c: 'rgba(52,211,153,0.35)' },
  { x: 88, y: 30, s: 1.5, d: 9.5, delay: 1, c: 'rgba(212,189,138,0.45)' },
];

/* ─── Animation Variants ──────────────────────────────────────────── */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

const wordReveal: Variants = {
  hidden: { opacity: 0, y: '0.5em', rotateX: 36 },
  show: {
    opacity: 1,
    y: '0em',
    rotateX: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─── Animated word-by-word line ──────────────────────────────────── */
function RevealLine({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={`inline-block ${className}`} style={{ perspective: 800 }}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em]">
          <motion.span variants={wordReveal} className="inline-block">
            {word}
            {i < words.length - 1 && ' '}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ─── Animated Counter (with completion glow flash) ───────────────── */
function Counter({
  value, prefix, suffix, grouped, delay,
}: {
  value: number; prefix: string; suffix: string; grouped: boolean; delay: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = `${prefix}${grouped ? value.toLocaleString() : value}${suffix}`;
      if (reduce) setDone(true);
      return;
    }
    const controls = animate(0, value, {
      duration: 2,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        const n = Math.round(v);
        el.textContent = `${prefix}${grouped ? n.toLocaleString() : n}${suffix}`;
      },
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
  }, [inView, value, prefix, suffix, grouped, delay, reduce]);

  return (
    <motion.span
      ref={ref}
      className="tabular-nums"
      initial={false}
      animate={
        done && !reduce
          ? { textShadow: ['0 0 0px rgba(52,211,153,0)', '0 0 16px rgba(52,211,153,0.55)', '0 0 0px rgba(52,211,153,0)'] }
          : undefined
      }
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {`${prefix}0${suffix}`}
    </motion.span>
  );
}

/* ─── Live Audit Preview card ─────────────────────────────────────── */
const FINDINGS = [
  { sev: 'Critical', color: '#f4a8a8', dot: '#e0676a', title: 'Unrestricted access on withdraw()', loc: 'L42' },
  { sev: 'High', color: '#e8b78c', dot: '#d99350', title: 'Integer overflow in reward math', loc: 'L88' },
  { sev: 'Medium', color: '#e6d6a8', dot: '#d4bd8a', title: 'Missing event on ownership change', loc: 'L121' },
  { sev: 'Low', color: '#9ee9c7', dot: '#34d399', title: 'Redundant borrow inflates gas', loc: 'L156' },
];

const SEVERITY_BAR = [
  { color: '#e0676a', w: '14%' },
  { color: '#d99350', w: '22%' },
  { color: '#d4bd8a', w: '30%' },
  { color: '#34d399', w: '34%' },
];

function RiskGauge({ score }: { score: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const R = 34;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = String(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.6,
      delay: 0.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = String(Math.round(v)); },
    });
    return () => controls.stop();
  }, [inView, score, reduce]);

  return (
    <div className="relative w-[92px] h-[92px] shrink-0">
      <svg ref={ref} viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="55%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#d4bd8a" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle
          cx="40" cy="40" r={R} fill="none" stroke="url(#gaugeGrad)" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={inView ? { strokeDashoffset: C * (1 - score / 100) } : { strokeDashoffset: C }}
          transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-ivory tabular-nums leading-none">
          <span ref={numRef}>0</span>
        </span>
        <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 mt-1">Score</span>
      </div>
    </div>
  );
}

function AuditPreview() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rX = useSpring(tiltX, { stiffness: 140, damping: 18 });
  const rY = useSpring(tiltY, { stiffness: 140, damping: 18 });

  function move(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 6);
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 7);
  }
  function leave() { tiltX.set(0); tiltY.set(0); }

  return (
    <div ref={ref} style={{ perspective: 1400 }} className="relative max-w-xl mx-auto">
      <motion.div
        onMouseMove={move}
        onMouseLeave={leave}
        style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-2xl p-px"
      >
        {/* refined single-tone border */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          style={{ background: 'linear-gradient(140deg, rgba(212,189,138,0.28), rgba(52,211,153,0.12) 45%, rgba(255,255,255,0.03) 80%)' }}
        />
        <div className="relative rounded-2xl bg-[#0c0d10]/95 overflow-hidden shadow-2xl shadow-black/60">
          {/* window chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.015]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e0676a]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4bd8a]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]/60" />
            <span className="ml-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> vault.move
            </span>
          </div>

          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.6), transparent)', top: 44 }}
              animate={{ top: [44, 320, 44], opacity: [0, 1, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            />
          )}

          <div className="p-5">
            <div className="flex items-center gap-4 mb-5">
              <RiskGauge score={92} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-jade-400 font-medium mb-1">
                  <Activity className="w-3.5 h-3.5" /> Analysis complete
                </div>
                <div className="text-sm font-semibold text-ivory mb-1">Secure with minor findings</div>
                <div className="text-[11px] text-zinc-500">14/14 categories analyzed · 4 findings</div>
                <div className="mt-2.5 flex h-1.5 w-44 max-w-full rounded-full overflow-hidden bg-white/5">
                  {SEVERITY_BAR.map((s, i) => (
                    <motion.span
                      key={i}
                      style={{ backgroundColor: s.color }}
                      initial={{ width: 0 }}
                      animate={inView ? { width: s.w } : { width: 0 }}
                      transition={{ duration: 0.9, delay: 0.6 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {FINDINGS.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                  animate={inView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.16, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.025)' }}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.012] px-3 py-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.dot, boxShadow: `0 0 7px ${f.dot}` }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: f.color, backgroundColor: `${f.dot}1a` }}
                  >
                    {f.sev}
                  </span>
                  <span className="text-xs text-zinc-300 truncate flex-1">{f.title}</span>
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">{f.loc}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="flex items-center justify-between mt-4 pt-3.5 border-t border-white/[0.05]"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-jade-400" /> Stored on Walrus
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                <AlertTriangle className="w-3.5 h-3.5 text-champagne-400" /> 1 critical to review
              </span>
            </motion.div>
          </div>
        </div>

        {/* soft under-shadow (no neon glow) */}
        <div
          aria-hidden
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-12 rounded-full blur-2xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.25), transparent 70%)' }}
        />
      </motion.div>

      {/* floating verified chip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 1.6, type: 'spring', stiffness: 300, damping: 18 }}
        className="absolute -right-3 -top-3 sm:-right-5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0c0d10]/95 border border-jade-400/25 shadow-lg shadow-black/50"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-jade-400" />
        <span className="text-[10px] font-semibold text-jade-300">Verified</span>
      </motion.div>
    </div>
  );
}

/* ─── Magnetic CTA ────────────────────────────────────────────────── */
function MagneticButton({
  children, onClick, className, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 250, damping: 18 });
  const y = useSpring(my, { stiffness: 250, damping: 18 });

  function move(e: React.MouseEvent<HTMLButtonElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left - r.width / 2) * 0.3);
    my.set((e.clientY - r.top - r.height / 2) * 0.45);
  }
  function leave() { mx.set(0); my.set(0); }

  return (
    <motion.button
      onClick={onClick}
      onMouseMove={move}
      onMouseLeave={leave}
      whileTap={{ scale: 0.96 }}
      style={{ x, y, ...style }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────── */
export function Hero({ onStartAudit }: { onStartAudit: () => void }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-6%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // pointer-driven ambient glow
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const glowX = useSpring(useTransform(px, [0, 1], [-36, 36]), { stiffness: 50, damping: 20 });
  const glowY = useSpring(useTransform(py, [0, 1], [-22, 22]), { stiffness: 50, damping: 20 });

  // stats panel tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rX = useSpring(tiltX, { stiffness: 150, damping: 18 });
  const rY = useSpring(tiltY, { stiffness: 150, damping: 18 });

  function handlePointer(e: React.MouseEvent<HTMLElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function tiltMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 8);
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 9);
  }
  function tiltLeave() { tiltX.set(0); tiltY.set(0); }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handlePointer}
      className="relative overflow-hidden pt-32 pb-24 bg-obsidian"
    >
      {/* ── Ambient background (restrained) ─────────────────────────── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        {/* fine grid, masked, champagne-tinted */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,189,138,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(212,189,138,0.035) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 56% at 50% 26%, #000 35%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 56% at 50% 26%, #000 35%, transparent 100%)',
          }}
        />

        {/* single soft jade glow, follows pointer subtly */}
        <motion.div
          style={{ x: glowX, y: glowY }}
          className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[760px] h-[440px]"
        >
          <motion.div
            className="w-full h-full rounded-full blur-[150px]"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.18), rgba(16,185,129,0.05) 50%, transparent 72%)' }}
            animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* faint champagne warmth, lower right */}
        <div
          className="absolute top-[220px] right-[8%] w-[320px] h-[320px] rounded-full blur-[150px] opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(212,189,138,0.08), transparent 70%)' }}
        />
      </motion.div>

      {/* sparse motes */}
      <div className="absolute inset-0 pointer-events-none">
        {!reduce &&
          PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: p.c }}
              animate={{ y: [0, -20, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
            />
          ))}
        {/* grain */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* champagne top hairline */}
        <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center"
      >
        {/* Badge — restrained, editorial */}
        <motion.div variants={rise} className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-[12px] text-zinc-400 mb-9">
            <span className="inline-flex items-center gap-1.5 text-jade-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Audited by AI
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-zinc-500">Claude Sonnet 4 · Walrus Network</span>
          </div>
        </motion.div>

        {/* Headline — editorial serif */}
        <div className="relative mb-7">
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[220px] rounded-full blur-[100px] pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 72%)' }}
              animate={{ opacity: [0.6, 0.95, 0.6] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <motion.h1
            variants={rise}
            className="relative font-display font-medium text-ivory text-[2.9rem] md:text-6xl lg:text-[4.6rem] leading-[1.02] tracking-[-0.02em]"
          >
            <RevealLine text="AI Security Audits" />
            <br />
            <span className="inline-flex items-baseline gap-3">
              <motion.span variants={wordReveal} className="italic font-normal text-zinc-400">for</motion.span>
              <span className="inline-block overflow-hidden align-bottom pb-[0.08em]">
                <motion.span
                  variants={wordReveal}
                  className="relative inline-block not-italic bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(110deg, #6ee7b7 0%, #34d399 30%, #ffffff 50%, #34d399 60%, #d4bd8a 100%)',
                    backgroundSize: '260% 100%',
                  }}
                  animate={reduce ? undefined : { backgroundPosition: ['120% 50%', '-40% 50%'] }}
                  transition={{ backgroundPosition: { duration: 7, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' } }}
                >
                  Sui Move
                </motion.span>
              </span>
            </span>
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          variants={rise}
          className="text-[15px] md:text-[17px] text-zinc-400 max-w-xl mx-auto mb-9 leading-relaxed"
        >
          Paste your Move contract and receive a comprehensive security audit in
          under sixty seconds — every finding sealed permanently on Walrus.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={rise}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-9"
        >
          <MagneticButton
            onClick={onStartAudit}
            style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }}
            className="group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-[#04140d] overflow-hidden shadow-lg shadow-emerald-950/40"
          >
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
            <Zap className="relative w-4 h-4" />
            <span className="relative">Start Free Audit</span>
            <ArrowRight className="relative w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </MagneticButton>

          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-zinc-200 bg-white/[0.03] border border-white/10 hover:border-champagne-400/30 hover:bg-white/[0.05] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-champagne-400" />
              How It Works
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust row */}
        <motion.div
          variants={rise}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-12 text-[11px] text-zinc-500"
        >
          {TRUST.map((t) => (
            <span key={t.text} className="inline-flex items-center gap-1.5">
              <t.icon className="w-3.5 h-3.5 text-jade-400/80" />
              {t.text}
            </span>
          ))}
        </motion.div>

        {/* Live audit preview */}
        <motion.div variants={rise} className="mb-16">
          <AuditPreview />
        </motion.div>

        {/* Stats — tilt glass panel, champagne hairlines */}
        <motion.div variants={rise} style={{ perspective: 1000 }} className="max-w-2xl mx-auto">
          <motion.div
            onMouseMove={tiltMove}
            onMouseLeave={tiltLeave}
            style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px rule-champagne" />

            {/* HUD corner brackets (champagne) */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-champagne-400/30 rounded-tl-sm" />
            <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-champagne-400/30 rounded-tr-sm" />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-champagne-400/30 rounded-bl-sm" />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-champagne-400/30 rounded-br-sm" />

            <div className="relative grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ backgroundColor: 'rgba(52,211,153,0.05)' }}
                  className="relative px-5 py-5 text-center group"
                >
                  {i % 4 !== 0 && (
                    <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px bg-white/[0.06]" />
                  )}
                  {i % 2 !== 0 && (
                    <span className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px bg-white/[0.06]" />
                  )}
                  <div className="font-display text-[1.7rem] md:text-[1.85rem] font-medium tracking-tight text-ivory">
                    <Counter
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      grouped={stat.grouped}
                      delay={0.6 + i * 0.12}
                    />
                  </div>
                  <div className="text-[10.5px] uppercase tracking-[0.15em] text-zinc-500 mt-1.5 group-hover:text-zinc-400 transition-colors">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-obsidian to-transparent pointer-events-none" />
    </section>
  );
}
