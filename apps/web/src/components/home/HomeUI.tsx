'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useMotionValue, type Variants } from 'framer-motion';
import { LogoMark } from '@/components/LogoMark';

/* ─── Bespoke luxury cursor (desktop / fine-pointer only) ─────────── */
export function CustomCursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);
  const [overText, setOverText] = useState(false);
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const ringX = useSpring(dotX, { stiffness: 220, damping: 26, mass: 0.5 });
  const ringY = useSpring(dotY, { stiffness: 220, damping: 26, mass: 0.5 });

  useEffect(() => {
    if (reduce || typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    setEnabled(true);
    document.documentElement.classList.add('lux-cursor');

    const move = (e: MouseEvent) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      const t = e.target as HTMLElement | null;
      setOverText(!!t?.closest('input, textarea, [contenteditable="true"]'));
      setHot(!!t?.closest('a, button, [role="button"], [data-cursor="hot"]'));
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      document.documentElement.classList.remove('lux-cursor');
    };
  }, [reduce, dotX, dotY]);

  if (!enabled) return null;
  const hidden = overText;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] hidden md:block" aria-hidden>
      <motion.div style={{ x: ringX, y: ringY }} className="absolute top-0 left-0">
        <motion.div
          animate={{
            scale: hidden ? 0 : hot ? 1.7 : 1,
            opacity: hidden ? 0 : hot ? 1 : 0.7,
            borderColor: hot ? 'rgba(52,211,153,0.9)' : 'rgba(212,189,138,0.6)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="w-8 h-8 -ml-4 -mt-4 rounded-full border"
        />
      </motion.div>
      <motion.div style={{ x: dotX, y: dotY }} className="absolute top-0 left-0">
        <motion.div
          animate={{ scale: hidden ? 0 : hot ? 0.5 : 1, backgroundColor: hot ? '#34d399' : '#d4bd8a' }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full"
        />
      </motion.div>
    </div>
  );
}

/* Module-level flag, set ONLY when the intro fully completes. Survives
   client-side navigation (skips replay on SPA nav) but resets on hard reload.
   Crucially it is NOT set at the start of the effect, so React Strict Mode's
   mount→cleanup→mount double-invoke can't kill the intro mid-play. */
let introDone = false;

/* ─── Cinematic intro curtain ─────────────────────────────────────── */
export function IntroOverlay() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(!introDone);
  const [stage, setStage] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (introDone || reduce) {
      setShow(false);
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';

    // Professional cinematic timeline:
    //  0.0s  curtains closed, brand draws in
    //  ~1.6s brand fully formed
    //  1.6→2.9s  hold (brand on screen)
    //  2.9s  brand fades + zooms, curtains split open (1.1s reveal)
    //  4.0s  unmount, scroll released
    const t1 = setTimeout(() => setStage('out'), 2900);
    const t2 = setTimeout(() => {
      introDone = true;
      setShow(false);
      document.body.style.overflow = '';
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = '';
    };
  }, [reduce]);

  if (!show) return null;
  const R = 37;
  const C = 2 * Math.PI * R;
  const curtain = { duration: 1.1, ease: [0.83, 0, 0.17, 1] as const };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* curtain halves (slight overlap avoids a center seam) */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: stage === 'out' ? '-101%' : 0 }}
        transition={curtain}
        className="absolute top-0 inset-x-0 h-[calc(50%+1px)] bg-obsidian"
      >
        <div className="absolute bottom-0 inset-x-0 h-px rule-champagne" />
      </motion.div>
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: stage === 'out' ? '101%' : 0 }}
        transition={curtain}
        className="absolute bottom-0 inset-x-0 h-[calc(50%+1px)] bg-obsidian"
      >
        <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
      </motion.div>

      {/* brand */}
      <motion.div
        animate={{
          opacity: stage === 'out' ? 0 : 1,
          scale: stage === 'out' ? 1.07 : 1,
          y: stage === 'out' ? -16 : 0,
          filter: stage === 'out' ? 'blur(6px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 70%)' }} />

        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-jade-500 to-champagne-500 flex items-center justify-center mb-7 shadow-xl shadow-black/50"
        >
          <LogoMark className="w-9 h-9 text-[#04140d]" strokeWidth={2.2} />
          <svg className="absolute -inset-3 w-[88px] h-[88px]" viewBox="0 0 80 80">
            <motion.circle
              cx="40" cy="40" r={R} fill="none" stroke="rgba(212,189,138,0.55)" strokeWidth="1"
              strokeDasharray={C} initial={{ strokeDashoffset: C, rotate: -90 }}
              animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'center' }}
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl font-medium text-ivory tracking-tight"
        >
          SuiAudit <span className="lux-gradient">AI</span>
        </motion.div>

        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 120, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-px mt-5 bg-gradient-to-r from-transparent via-champagne-400/70 to-transparent"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-4 text-[10px] uppercase tracking-[0.32em] text-zinc-600"
        >
          Securing the Move ecosystem
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Scroll progress hairline ────────────────────────────────────── */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] bg-gradient-to-r from-champagne-400/0 via-champagne-400 to-jade-400"
    />
  );
}

/* ─── Ornamental section divider ──────────────────────────────────── */
export function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <Reveal className="flex items-center justify-center gap-4 py-3">
        <span className="h-px flex-1 max-w-[200px] bg-gradient-to-r from-transparent to-champagne-400/30" />
        <span className="text-champagne-400/50 text-[9px] tracking-widest rotate-45">◆</span>
        <span className="h-px flex-1 max-w-[200px] bg-gradient-to-l from-transparent to-champagne-400/30" />
      </Reveal>
    </div>
  );
}

/* ─── Scroll Reveal ───────────────────────────────────────────────── */
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: (d: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Reveal({
  children,
  delay = 0,
  className,
  onClick,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      custom={delay}
      variants={revealVariants}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Section Heading ─────────────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  const isCenter = align === 'center';
  return (
    <Reveal className={`${isCenter ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <div className="inline-flex items-center gap-2.5 mb-4">
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">
            {eyebrow}
          </span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-champagne-400/70" />
        </div>
      )}
      <h2 className="font-display font-medium text-ivory text-[2rem] md:text-[2.6rem] tracking-[-0.02em] leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-[15px] text-zinc-400 leading-relaxed ${isCenter ? 'max-w-xl mx-auto' : 'max-w-xl'}`}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ─── Spotlight Card ──────────────────────────────────────────────── */
/* Glass card with a cursor-following spotlight + gradient hover border. */
export function SpotlightCard({
  children,
  className = '',
  onClick,
  spotlight = 'rgba(52,211,153,0.12)',
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  spotlight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onClick={onClick}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] backdrop-blur-sm transition-all duration-300 hover:border-jade-400/25 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.7)] ${className}`}
    >
      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), ${spotlight}, transparent 70%)`,
        }}
      />
      {/* top hairline that lights up on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne-400/0 to-transparent transition-all duration-300 group-hover:via-champagne-400/40" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
