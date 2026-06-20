'use client';

import { Shield, Zap, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LogoMark } from '@/components/LogoMark';

const FEATURES = [
  { icon: Shield, text: '14 vulnerability categories' },
  { icon: Zap, text: 'Results in under 60 seconds' },
  { icon: Globe, text: 'Permanent Walrus storage' },
  { icon: Lock, text: 'On-chain audit registry' },
];

function AnimatedLogo() {
  const reduce = useReducedMotion();

  return (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      <div className="relative">
        {/* breathing glow */}
        <motion.span
          aria-hidden
          className="absolute -inset-1.5 rounded-2xl bg-jade-500/30 blur-md"
          animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* rotating conic rim */}
        <motion.span
          aria-hidden
          className="absolute -inset-px rounded-[13px] opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ background: 'conic-gradient(from 0deg, rgba(110,231,183,0), rgba(212,189,138,0.95), rgba(52,211,153,0.95), rgba(110,231,183,0))' }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          whileHover={reduce ? undefined : { scale: 1.1, rotate: -6 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-jade-400 via-jade-500 to-champagne-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 overflow-hidden"
        >
          {/* inner bevel highlight */}
          <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
          {/* recurring light sweep */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            animate={reduce ? undefined : { x: ['0%', '360%'] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
          />
          <LogoMark className="relative w-[22px] h-[22px] text-[#04140d] drop-shadow-sm" strokeWidth={2.4} />
        </motion.div>
      </div>

      {/* Wordmark */}
      <span className="relative font-semibold text-[15px] tracking-tight overflow-hidden">
        <span className="text-ivory">SuiAudit</span>
        <motion.span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(110deg, #6ee7b7 0%, #34d399 32%, #ffffff 50%, #34d399 68%, #d4bd8a 100%)', backgroundSize: '220% 100%' }}
          animate={reduce ? undefined : { backgroundPosition: ['140% 50%', '-40% 50%'] }}
          transition={{ duration: 5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
        >
          {' '}AI
        </motion.span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[900ms] ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      </span>
    </Link>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left panel — decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-[#0c0c0e] border-r border-zinc-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <div className="mb-16">
            <AnimatedLogo />
          </div>

          <h2 className="text-2xl font-bold text-white leading-tight mb-3">
            AI-powered security<br />
            for Move contracts
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
            Get comprehensive security audits in under 60 seconds. Powered by Claude Sonnet 4 with findings stored permanently on Walrus.
          </p>

          <div className="mt-10 space-y-3">
            {FEATURES.map((feat) => (
              <div key={feat.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <feat.icon className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span className="text-sm text-zinc-400">{feat.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-700 relative z-10">
          © {new Date().getFullYear()} SuiAudit AI
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="flex lg:hidden mb-10">
          <AnimatedLogo />
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
